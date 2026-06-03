import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CohereEmbed } from '../src/providers/embed/cohere.js';
import { EMBED_PRESETS } from '../src/providers/presets.js';

describe('CohereEmbed', () => {
	const originalFetch = globalThis.fetch;
	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	function mockFetch(handler: (url: string, init: RequestInit) => Promise<Response> | Response) {
		globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = typeof input === 'string' ? input : input.toString();
			return handler(url, init ?? {});
		}) as typeof fetch;
	}

	it('sends POST /v1/embed with the search_query input_type for query-time embeds', async () => {
		let capturedUrl = '';
		let capturedBody = '';
		mockFetch(async (url, init) => {
			capturedUrl = url;
			capturedBody = init.body as string;
			return new Response(JSON.stringify({ embeddings: [[0.1, 0.2, 0.3]], id: 'x' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		});

		const p = new CohereEmbed(EMBED_PRESETS.cohere!, undefined, 'cohere-key');
		const result = await p.embed('hello', { model: 'embed-english-v3.0' });

		expect(result.vector).toEqual([0.1, 0.2, 0.3]);
		expect(capturedUrl).toBe('https://api.cohere.ai/v1/embed');
		const body = JSON.parse(capturedBody);
		expect(body.model).toBe('embed-english-v3.0');
		expect(body.texts).toEqual(['hello']);
		expect(body.input_type).toBe('search_query');
	});

	it('sends input_type=search_document for batch indexing', async () => {
		let capturedBody = '';
		mockFetch(async (_url, init) => {
			capturedBody = init.body as string;
			return new Response(JSON.stringify({ embeddings: [[0.1], [0.2]] }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		});

		const p = new CohereEmbed(EMBED_PRESETS.cohere!, undefined, 'cohere-key');
		const results = await p.embedBatch(['a', 'b'], { model: 'embed-english-v3.0' });

		expect(results.length).toBe(2);
		const body = JSON.parse(capturedBody);
		expect(body.input_type).toBe('search_document');
		expect(body.texts).toEqual(['a', 'b']);
	});

	it('includes the Authorization header', async () => {
		let capturedHeaders: Record<string, string> = {};
		mockFetch(async (_url, init) => {
			capturedHeaders = init.headers as Record<string, string>;
			return new Response(JSON.stringify({ embeddings: [[0.1]] }), { status: 200 });
		});

		const p = new CohereEmbed(EMBED_PRESETS.cohere!, undefined, 'my-key');
		await p.embed('test', { model: 'embed-english-v3.0' });
		expect(capturedHeaders.Authorization).toBe('Bearer my-key');
	});

	it('rejects with a clean auth error on 401', async () => {
		mockFetch(async () => new Response('unauthorized', { status: 401 }));

		const p = new CohereEmbed(EMBED_PRESETS.cohere!, undefined, 'bad-key');
		const result = await p.validateConnection();
		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/Authentication failed/);
	});

	it('validateConnection succeeds when a real embed call works', async () => {
		mockFetch(
			async () => new Response(JSON.stringify({ embeddings: [[0.1, 0.2]] }), { status: 200 }),
		);
		const p = new CohereEmbed(EMBED_PRESETS.cohere!, undefined, 'good-key');
		const result = await p.validateConnection();
		expect(result.ok).toBe(true);
		expect(result.models).toContain('embed-english-v3.0');
	});

	it('embeds batch returns vectors in the same order as inputs', async () => {
		mockFetch(
			async () =>
				new Response(
					JSON.stringify({
						embeddings: [
							[0.1, 0.2],
							[0.3, 0.4],
							[0.5, 0.6],
						],
					}),
					{ status: 200 },
				),
		);
		const p = new CohereEmbed(EMBED_PRESETS.cohere!, undefined, 'key');
		const results = await p.embedBatch(['a', 'b', 'c'], { model: 'embed-english-v3.0' });
		expect(results.map((r) => r.vector)).toEqual([
			[0.1, 0.2],
			[0.3, 0.4],
			[0.5, 0.6],
		]);
	});
});
