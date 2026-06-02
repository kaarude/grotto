import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { ingest } from '../src/core/ingest.js';
import { Store } from '../src/core/store.js';
import { FakeEmbedder, cfg as baseConfig } from './helpers/fakes.js';

let notesDir: string;
let homeDir: string;

beforeAll(async () => {
	homeDir = process.env.GROTTO_TEST_HOME!;
	notesDir = join(homeDir, 'notes');
	await mkdir(notesDir, { recursive: true });
	await writeFile(join(notesDir, 'a.md'), '# Hello\n\nThis is a test note with some content.');
	await writeFile(join(notesDir, 'b.md'), '# World\n\nAnother note with totally different words.');
	await writeFile(join(notesDir, 'c.txt'), 'Plain text file that should also be indexed.');
	await mkdir(join(notesDir, 'node_modules'), { recursive: true });
	await writeFile(join(notesDir, 'node_modules', 'skipme.md'), '# Skip me');
});

afterAll(async () => {
	// We share the test home with other tests; don't wipe it here.
});

function testConfig() {
	return {
		...baseConfig,
		notes: { paths: [notesDir], ignore: ['**/node_modules/**', '**/.git/**'] },
	};
}

describe('ingest end-to-end', () => {
	it('walks, parses, chunks, embeds, and stores', async () => {
		const cfg = testConfig();
		const result = await ingest(cfg, new FakeEmbedder());

		expect(result.filesIndexed).toBe(3); // a.md, b.md, c.txt
		expect(result.chunks).toBeGreaterThan(0);

		const store = new Store();
		const sources = await store.listSources();
		// listSources returns ALL sources in the table, not just from this test.
		// We just check that ours are there.
		const ourSources = sources.filter((s) => s.source.startsWith(notesDir));
		expect(ourSources.length).toBe(3);
	});

	it('skips unchanged files on second run', async () => {
		const cfg = testConfig();
		const result = await ingest(cfg, new FakeEmbedder());
		expect(result.filesIndexed).toBe(0);
		expect(result.filesSkipped).toBe(result.filesScanned);
	});

	it('honors ignore patterns', async () => {
		const sources = await new Store().listSources();
		const ourSources = sources.filter((s) => s.source.startsWith(notesDir));
		const paths = ourSources.map((s) => s.source);
		expect(paths.every((p) => !p.includes('node_modules'))).toBe(true);
		expect(paths.every((p) => !p.endsWith('skipme.md'))).toBe(true);
	});

	it('re-indexes only changed files', async () => {
		await writeFile(join(notesDir, 'a.md'), '# Hello MODIFIED\n\nThis is a changed note.');

		const cfg = testConfig();
		const result = await ingest(cfg, new FakeEmbedder());
		expect(result.filesIndexed).toBe(1);
		expect(result.filesSkipped).toBe(2);
	});

	it('removes chunks for files that no longer exist', async () => {
		const { unlink } = await import('node:fs/promises');
		await unlink(join(notesDir, 'b.md'));

		const cfg = testConfig();
		await ingest(cfg, new FakeEmbedder());

		const sources = await new Store().listSources();
		const ourSources = sources.filter((s) => s.source.startsWith(notesDir));
		const paths = ourSources.map((s) => s.source);
		expect(paths.every((p) => !p.endsWith('b.md'))).toBe(true);
	});
});
