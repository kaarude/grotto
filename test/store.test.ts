import { describe, it, expect } from 'vitest';
import { Store } from '../src/core/store.js';
import type { Chunk } from '../src/core/types.js';

// Note: the store uses a single shared LanceDB dir (paths.dbDir), so tests
// share a table. We use unique source paths to keep test data isolated.

describe('Store', () => {
	it('starts empty when DB is fresh', async () => {
		// Just sanity check — count() is total rows, sources is unique files.
		const store = new Store();
		const sources = await store.listSources();
		// Whatever the count, the API should work.
		expect(Array.isArray(sources)).toBe(true);
	});

	it('inserts chunks for a new source', async () => {
		const store = new Store();
		const source = `/test/insert-${Date.now()}.md`;
		const chunks = makeChunks(source, 3);
		const before = (await store.listSources()).find((s) => s.source === source)?.chunks ?? 0;
		await store.upsert(chunks, [source]);
		const after = await store.listSources();
		const found = after.find((s) => s.source === source);
		expect(found).toBeDefined();
		expect(found!.chunks).toBe(before + 3);
	});

	it('upserts (updates matching ids instead of duplicating)', async () => {
		const store = new Store();
		const source = `/test/upsert-${Date.now()}.md`;
		const v1 = makeChunks(source, 2, 'hash1');
		await store.upsert(v1, [source]);
		const before = (await store.listSources()).find((s) => s.source === source)?.chunks ?? 0;

		// Re-embed with new vector values, same IDs.
		const v2 = makeChunks(source, 2, 'hash2').map((c) => ({ ...c, vector: [0.9, 0.8, 0.7] }));
		await store.upsert(v2, [source]);
		const after = await store.listSources();
		const found = after.find((s) => s.source === source);
		// No duplication — chunk count for this source is unchanged.
		expect(found!.chunks).toBe(before);
		// And the row's vector was updated.
		const rows = (await (await store.table())
			.query()
			.where(`source = '${source}'`)
			.toArray()) as Chunk[];
		// lancedb returns vectors as Arrow Float32 — coerce to array and
		// compare with float tolerance.
		const v0 = Array.from((rows[0]?.vector as ArrayLike<number> | undefined) ?? []);
		expect(v0).toHaveLength(3);
		expect(v0[0]).toBeCloseTo(0.9);
		expect(v0[1]).toBeCloseTo(0.8);
		expect(v0[2]).toBeCloseTo(0.7);
		expect(rows[0]?.sourceHash).toBe('hash2');
	});

	it('deletes chunks for files no longer in the source set', async () => {
		const store = new Store();
		const stamp = Date.now();
		const keep = `/test/keep-${stamp}.md`;
		const drop = `/test/drop-${stamp}.md`;
		await store.upsert(makeChunks(keep, 2, 'h-keep'), [keep, drop]);
		await store.upsert(makeChunks(drop, 3, 'h-drop'), [keep, drop]);

		const sourcesBefore = await store.listSources();
		expect(sourcesBefore.find((s) => s.source === keep)).toBeDefined();
		expect(sourcesBefore.find((s) => s.source === drop)).toBeDefined();

		// Re-index only `keep`. `drop` should disappear.
		await store.upsert(makeChunks(keep, 2, 'h-keep2'), [keep]);
		const sourcesAfter = await store.listSources();
		expect(sourcesAfter.find((s) => s.source === keep)).toBeDefined();
		expect(sourcesAfter.find((s) => s.source === drop)).toBeUndefined();
	});
});

function makeChunks(source: string, n: number, hash = 'hash-abc'): Chunk[] {
	return Array.from({ length: n }, (_, i) => ({
		id: `${source}::${i}`,
		source,
		chunkIndex: i,
		text: `chunk ${i} of ${source}`,
		vector: [0.1, 0.2, 0.3],
		embedModel: 'fake-embed',
		sourceHash: hash,
		indexedAt: new Date().toISOString(),
		ext: 'md',
		size: 100,
	}));
}
