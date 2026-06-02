import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ingest } from '../src/core/ingest.js';
import { Store } from '../src/core/store.js';
import type { GrottoConfig } from '../src/core/config.js';
import type { EmbedProvider, EmbedResult, EmbedOptions } from '../src/providers/embed/base.js';

let notesDir: string;
let homeDir: string;

class FakeEmbedder implements EmbedProvider {
	readonly info = {
		name: 'fake',
		displayName: 'Fake',
		defaultModel: 'fake-model',
		requiresApiKey: false,
	} as const;
	async listModels() {
		return ['fake-model'];
	}
	async embed(text: string, _options: EmbedOptions): Promise<EmbedResult> {
		return { vector: [text.length, 0, 0], model: 'fake-model' };
	}
	async embedBatch(texts: string[], options: EmbedOptions): Promise<EmbedResult[]> {
		return texts.map((t) => ({ vector: [t.length, 0, 0], model: 'fake-model' }));
	}
	async validateConnection() {
		return { ok: true, models: ['fake-model'] };
	}
}

const config: GrottoConfig = {
	version: 1,
	notes: { paths: [''], ignore: ['**/node_modules/**', '**/.git/**'] },
	embed: { provider: 'openai', model: 'fake-model' },
	llm: { provider: 'openai', model: 'gpt-4o-mini' },
	chat: { topK: 5, temperature: 0.3 },
};

beforeAll(async () => {
	homeDir = await mkdtemp(join(tmpdir(), 'grotto-int-'));
	process.env.HOME = homeDir;
	process.env.XDG_DATA_HOME = homeDir;

	notesDir = join(homeDir, 'notes');
	await mkdir(notesDir, { recursive: true });
	await writeFile(join(notesDir, 'a.md'), '# Hello\n\nThis is a test note with some content.');
	await writeFile(join(notesDir, 'b.md'), '# World\n\nAnother note with totally different words.');
	await writeFile(join(notesDir, 'c.txt'), 'Plain text file that should also be indexed.');
	await mkdir(join(notesDir, 'node_modules'), { recursive: true });
	await writeFile(join(notesDir, 'node_modules', 'skipme.md'), '# Skip me');
});

afterAll(async () => {
	await rm(homeDir, { recursive: true, force: true });
});

describe('ingest end-to-end', () => {
	it('walks, parses, chunks, embeds, and stores', async () => {
		const cfg = { ...config, notes: { ...config.notes, paths: [notesDir] } };
		const result = await ingest(cfg, new FakeEmbedder());

		expect(result.filesIndexed).toBe(3); // a.md, b.md, c.txt
		expect(result.chunks).toBeGreaterThan(0);

		const store = new Store();
		const sources = await store.listSources();
		expect(sources.length).toBe(3);
	});

	it('skips unchanged files on second run', async () => {
		const cfg = { ...config, notes: { ...config.notes, paths: [notesDir] } };
		const result = await ingest(cfg, new FakeEmbedder());
		expect(result.filesIndexed).toBe(0);
		expect(result.filesSkipped).toBe(result.filesScanned);
	});

	it('honors ignore patterns', async () => {
		const sources = await new Store().listSources();
		const paths = sources.map((s) => s.source);
		expect(paths.every((p) => !p.includes('node_modules'))).toBe(true);
		expect(paths.every((p) => !p.endsWith('skipme.md'))).toBe(true);
	});

	it('re-indexes only changed files', async () => {
		// Modify a.md
		await writeFile(join(notesDir, 'a.md'), '# Hello MODIFIED\n\nThis is a changed note.');

		const cfg = { ...config, notes: { ...config.notes, paths: [notesDir] } };
		const result = await ingest(cfg, new FakeEmbedder());
		expect(result.filesIndexed).toBe(1);
		expect(result.filesSkipped).toBe(2);
	});

	it('removes chunks for files that no longer exist', async () => {
		const { unlink } = await import('node:fs/promises');
		await unlink(join(notesDir, 'b.md'));

		const cfg = { ...config, notes: { ...config.notes, paths: [notesDir] } };
		await ingest(cfg, new FakeEmbedder());

		const sources = await new Store().listSources();
		const paths = sources.map((s) => s.source);
		expect(paths.every((p) => !p.endsWith('b.md'))).toBe(true);
	});
});
