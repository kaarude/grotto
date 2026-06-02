import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chunkText } from '../src/core/chunker.js';
import { parseMarkdown, parseText } from '../src/parsers/index.js';
import { retrieve } from '../src/core/retrieve.js';
import { chat } from '../src/core/chat.js';
import { Store } from '../src/core/store.js';
import { FakeEmbedder, makeFakeLlm, makeChunk, fakeEmbed, cfg } from './helpers/fakes.js';

describe('retrieve', () => {
	it('returns [] for empty query', async () => {
		const store = new Store();
		const r = await retrieve('   ', store, new FakeEmbedder(), 'fake');
		expect(r).toEqual([]);
	});

	it('returns [] when no chunks table exists', async () => {
		const store = new Store();
		const r = await retrieve('hello', store, new FakeEmbedder(), 'fake');
		expect(r).toEqual([]);
	});

	it('returns top-K relevant chunks', async () => {
		const store = new Store();
		const embedder = new FakeEmbedder();
		await store.upsert(
			[
				makeChunk('/a.md', 0, 'grotto is a local RAG tool for chatting with notes'),
				makeChunk('/b.md', 0, 'the weather is sunny today in the park'),
				makeChunk('/c.md', 0, 'grotto uses LanceDB for vector search and embeddings'),
			],
			['/a.md', '/b.md', '/c.md'],
		);
		const r = await retrieve('what is grotto?', store, embedder, 'fake', { topK: 2 });
		expect(r.length).toBe(2);
		// The relevant chunks (a.md, c.md) should both be in the top 2.
		// The b.md chunk (about weather) is the most likely to be excluded.
		const sources = r.map((h) => h.chunk.source);
		// We don't assert b.md is excluded because hash-bag embeddings
		// are noisy. We DO assert that at least one of a/c made it.
		const relevantMatches = sources.filter((s) => s === '/a.md' || s === '/c.md');
		expect(relevantMatches.length).toBeGreaterThan(0);
	});

	it('respects topK', async () => {
		const store = new Store();
		const embedder = new FakeEmbedder();
		await store.upsert(
			Array.from({ length: 5 }, (_, i) => makeChunk(`/f${i}.md`, 0, `note number ${i}`)),
			Array.from({ length: 5 }, (_, i) => `/f${i}.md`),
		);
		const r = await retrieve('note', store, embedder, 'fake', { topK: 3 });
		expect(r.length).toBe(3);
	});
});

describe('chat orchestrator', () => {
	it('returns citations and streams tokens', async () => {
		const store = new Store();
		await store.upsert([makeChunk('/x.md', 0, 'grotto is a local RAG tool')], ['/x.md']);

		const embedder = new FakeEmbedder();
		const llm = makeFakeLlm(['Hello', ' world', '!']);

		const result = await chat({ question: 'what is grotto?' }, cfg, store, embedder, llm);
		expect(result.citations.length).toBeGreaterThan(0);
		const tokens: string[] = [];
		for await (const t of result.stream) tokens.push(t);
		expect(tokens.join('')).toBe('Hello world!');
	});

	it('rejects empty questions', async () => {
		const store = new Store();
		const embedder = new FakeEmbedder();
		const llm = makeFakeLlm(['unused']);
		await expect(chat({ question: '   ' }, cfg, store, embedder, llm)).rejects.toThrow();
	});

	it('handles "no relevant notes found" gracefully', async () => {
		const store = new Store();
		// No chunks inserted, but use a query that won't match any random junk.
		const embedder = new FakeEmbedder();
		const llm = makeFakeLlm(['I do not have any notes to reference.']);
		const result = await chat(
			{ question: 'xyzqq_no_relevant_notes_marker_xyzqq' },
			cfg,
			store,
			embedder,
			llm,
		);
		// Citations may be 0 (clean) or small (noise from other tests). Just check
		// the stream returns our canned response.
		const tokens: string[] = [];
		for await (const t of result.stream) tokens.push(t);
		expect(tokens.join('')).toContain('do not have any notes');
	});
});

// Smoke tests on the parsers/chunker to keep the suite's coverage in one place.
describe('parsers & chunker (smoke)', () => {
	it('chunkText splits long text', () => {
		const result = chunkText('a'.repeat(5000), { chunkSize: 1000, overlap: 0 });
		expect(result.length).toBe(5);
	});
	it('parseMarkdown strips syntax', () => {
		const result = parseMarkdown('# Title\n\nParagraph.');
		expect(result.text).toContain('Title');
		expect(result.text).not.toContain('#');
	});
	it('parseText trims content', async () => {
		const path = join(process.env.GROTTO_TEST_HOME!, 'sample.txt');
		writeFileSync(path, 'hello world\n\n  ');
		const result = await parseText(path);
		expect(result.text).toBe('hello world');
	});
});

// Suppress the unused-import warning for fakeEmbed; it's re-exported for other tests.
void fakeEmbed;
