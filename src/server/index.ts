import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { serveStatic } from '@hono/node-server/serve-static';
import type { GrottoConfig } from '../core/config.js';
import type { Store } from '../core/store.js';
import type { EmbedProvider } from '../providers/embed/base.js';
import type { LLMProvider } from '../providers/llm/base.js';
import { chat, type ChatResult } from '../core/chat.js';
import { loadConfigSafe, maskConfig } from '../core/config.js';
import { log } from '../util/logger.js';

export interface ServerDeps {
	config: GrottoConfig;
	store: Store;
	embedder: EmbedProvider;
	llm: LLMProvider;
	/** Absolute path to the built React app (dist/web/). Omit in dev. */
	staticDir?: string;
}

export interface CreateAppOptions {
	/** If true, enables CORS for the Vite dev server (default port 5173). */
	dev?: boolean;
}

/**
 * Build the Hono app. Pure factory — doesn't bind a port. Use `start()`
 * (or your own adapter) to actually listen.
 */
export function createApp(deps: ServerDeps, options: CreateAppOptions = {}): Hono {
	const { config, store, embedder, llm, staticDir } = deps;
	const app = new Hono();

	if (options.dev) {
		app.use(
			'*',
			cors({
				origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
				credentials: true,
			}),
		);
	}

	// Health & info
	app.get('/api/health', (c) => c.json({ ok: true, version: '0.6.0' }));

	app.get('/api/config', (c) => {
		// Never expose API keys. maskConfig() handles that for us.
		return c.json(maskConfig(config));
	});

	app.get('/api/sources', async (c) => {
		const sources = await store.listSources();
		const total = await store.count();
		return c.json({ total, sources });
	});

	// Streaming chat (SSE)
	app.post('/api/chat', async (c) => {
		const body = (await c.req.json().catch(() => null)) as { question?: string } | null;
		const question = body?.question?.trim() ?? '';
		if (!question) return c.json({ error: 'question is required' }, 400);

		let result: ChatResult;
		try {
			result = await chat({ question }, config, store, embedder, llm);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			log.error(`Chat failed: ${msg}`);
			return c.json({ error: msg }, 500);
		}

		// Stream the answer, sending citations as the first event so the client
		// can render them as tokens arrive.
		return streamSSE(c, async (stream) => {
			try {
				await stream.writeSSE({
					event: 'citations',
					data: JSON.stringify(
						result.citations.map((hit) => ({
							source: hit.chunk.source,
							chunkIndex: hit.chunk.chunkIndex,
							text: hit.chunk.text,
							distance: hit._distance,
						})),
					),
				});
				for await (const token of result.stream) {
					await stream.writeSSE({ event: 'token', data: JSON.stringify({ token }) });
				}
				await stream.writeSSE({ event: 'done', data: '{}' });
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				log.error(`Stream interrupted: ${msg}`);
				await stream.writeSSE({ event: 'error', data: JSON.stringify({ error: msg }) });
			}
		});
	});

	// Static files (production). In dev, Vite serves the client on its own port.
	if (staticDir) {
		app.use('/*', serveStatic({ root: staticDir }));
		// SPA fallback — React Router (or just history API) needs index.html
		// for any non-asset route.
		app.get('*', serveStatic({ path: `${staticDir}/index.html` }));
	}

	return app;
}

/**
 * Load the config and build all the providers + store the app needs.
 * Centralized so the CLI command and the (future) Docker entry point
 * share the same wiring.
 */
export async function buildDeps(): Promise<ServerDeps> {
	const config = loadConfigSafe();
	if (!config) {
		throw new Error(
			'No config found. Run `grotto init` to set up your notes folder, embedder, and LLM.',
		);
	}
	const { createEmbedProvider } = await import('../providers/embed/index.js');
	const { createLLMProvider } = await import('../providers/llm/index.js');
	const { Store } = await import('../core/store.js');

	const embedder = createEmbedProvider(config);
	const llm = createLLMProvider(config);
	const store = new Store();
	return { config, store, embedder, llm };
}
