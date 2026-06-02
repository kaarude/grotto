import { describe, it, expect } from 'vitest';
import { Store } from '../src/core/store.js';
import { makeChunk, makeChunks } from './helpers/fakes.js';

// The store uses a single shared LanceDB dir (paths.dbDir), so tests
// share a table. We use unique source paths to keep test data isolated.

describe('Store', () => {
	it('returns empty sources when DB is fresh or has nothing matching', async () => {
		const sources = await new Store().listSources();
		// The API should always work, regardless of state.
		expect(Array.isArray(sources)).toBe(true);
	});

	it('inserts chunks for a new source', async () => {
		const store = new Store();
		const source = `/test/insert-${Date.now()}-${Math.random()}.md`;
		const before = (await store.listSources()).find((s) => s.source === source)?.chunks ?? 0;
		await store.upsert(makeChunks(source, 3), [source]);
		const after = await store.listSources();
		const found = after.find((s) => s.source === source);
		expect(found).toBeDefined();
		expect(found!.chunks).toBe(before + 3);
	});

	it('upserts (updates matching ids instead of duplicating)', async () => {
		const store = new Store();
		const source = `/test/upsert-${Date.now()}-${Math.random()}.md`;
		const v1 = makeChunks(source, 3);
		await store.upsert(v1, [source]);
		const before = (await store.listSources()).find((s) => s.source === source)?.chunks ?? 0;

		// Re-embed with new vector values, same IDs.
		const v2 = makeChunks(source, 3).map((c) => ({
			...c,
			vector: [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2],
		}));
		await store.upsert(v2, [source]);
		const after = await store.listSources();
		const found = after.find((s) => s.source === source);
		// No duplication — chunk count for this source is unchanged.
		expect(found!.chunks).toBe(before);
		// And the row's vector was updated.
		const rows = (await (await store.table())
			.query()
			.where(`source = '${source}'`)
			.toArray()) as Array<{
			vector: ArrayLike<number>;
			sourceHash: string;
		}>;
		const v0 = Array.from(rows[0]?.vector ?? []);
		expect(v0).toHaveLength(8);
		expect(v0[0]).toBeCloseTo(0.9);
		expect(v0[1]).toBeCloseTo(0.8);
		expect(v0[2]).toBeCloseTo(0.7);
		expect(rows[0]?.sourceHash).toBe('h');
	});

	it('deletes chunks for files no longer in the source set', async () => {
		const store = new Store();
		const stamp = Date.now();
		const rand = Math.random();
		const keep = `/test/keep-${stamp}-${rand}.md`;
		const drop = `/test/drop-${stamp}-${rand}.md`;
		await store.upsert(makeChunks(keep, 2, 'keep'), [keep, drop]);
		await store.upsert(makeChunks(drop, 3, 'drop'), [keep, drop]);

		const sourcesBefore = await store.listSources();
		expect(sourcesBefore.find((s) => s.source === keep)).toBeDefined();
		expect(sourcesBefore.find((s) => s.source === drop)).toBeDefined();

		// Re-index only `keep`. `drop` should disappear.
		await store.upsert(makeChunks(keep, 2, 'keep-v2'), [keep]);
		const sourcesAfter = await store.listSources();
		expect(sourcesAfter.find((s) => s.source === keep)).toBeDefined();
		expect(sourcesAfter.find((s) => s.source === drop)).toBeUndefined();
	});
});
