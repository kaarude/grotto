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

/**
 * Live, mutable references to the providers and config. The web UI's model
 * picker can swap the LLM (and config) at runtime via `setLlm()`. The chat
 * route reads from getters so the next request automatically uses the new
 * values \u2014 no server restart needed.
 */
export interface LiveDeps {
	config: GrottoConfig;
	store: Store;
	embedder: EmbedProvider;
	llm: LLMProvider;
}

export interface ServerDeps {
	/** Initial live deps. Will be mutated when the model changes. */
	live: LiveDeps;
	/** Absolute path to the built React app (dist/web/). Omit in dev. */
	staticDir?: string;
	/** Optional callback fired after the live deps are replaced. */
	onChange?: (newLive: LiveDeps) => void;
}

export interface CreateAppOptions {
	/** If true, enables CORS for the Vite dev server (default port 5173). */
	dev?: boolean;
}

/**
 * Build the Hono app. Pure factory \u2014 doesn't bind a port. Use `start()`
 * (or your own adapter) to actually listen.
 */
export function createApp(deps: ServerDeps, options: CreateAppOptions = {}): Hono {
	const { live, staticDir, onChange } = deps;
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
		return c.json(maskConfig(live.config));
	});

	app.get('/api/sources', async (c) => {
		const sources = await live.store.listSources();
		const total = await live.store.count();
		return c.json({ total, sources });
	});

	// Streaming chat (SSE)
	app.post('/api/chat', async (c) => {
		const body = (await c.req.json().catch(() => null)) as { question?: string } | null;
		const question = body?.question?.trim() ?? '';
		if (!question) return c.json({ error: 'question is required' }, 400);

		let result: ChatResult;
		try {
			result = await chat({ question }, live.config, live.store, live.embedder, live.llm);
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

	// Live model config (PATCH). Body: { llm: { model, baseUrl?, provider? } }
	app.patch('/api/config/llm', async (c) => {
		const body = (await c.req.json().catch(() => null)) as {
			model?: string;
			baseUrl?: string | null;
			provider?: 'ollama' | 'openai';
		} | null;
		if (!body) return c.json({ error: 'invalid body' }, 400);

		// Build a tentative new config. Provider is the existing one unless
		// explicitly overridden (changing provider is rare; model is what
		// users tweak constantly).
		const next: GrottoConfig = {
			...live.config,
			llm: {
				...live.config.llm,
				provider: body.provider ?? live.config.llm.provider,
				model: (body.model ?? live.config.llm.model).trim(),
				baseUrl:
					body.baseUrl === null ? undefined : body.baseUrl?.trim() || live.config.llm.baseUrl,
			},
		};
		if (!next.llm.model) return c.json({ error: 'model is required' }, 400);

		// Build a new LLM provider for the new config and validate.
		const { createLLMProvider } = await import('../providers/llm/index.js');
		let nextLlm: LLMProvider;
		try {
			nextLlm = createLLMProvider(next);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			return c.json({ error: msg }, 400);
		}

		// Persist the new config to TOML. Mask the API key on the way out \u2014
		// we don't want to round-trip secrets unnecessarily.
		const { saveConfig } = await import('../core/config.js');
		try {
			saveConfig(next);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			return c.json({ error: `Failed to save config: ${msg}` }, 500);
		}

		// Swap the live providers. Next chat request uses the new model.
		live.llm = nextLlm;
		live.config = next;
		onChange?.(live);

		return c.json({ ok: true, config: maskConfig(next) });
	});

	// List available models for the current LLM provider. Calls the provider's
	// /models endpoint when possible, with a curated fallback list so the UI
	// always has something to show.
	app.get('/api/llm/models', async (c) => {
		try {
			const models = await live.llm.listModels();
			return c.json({ models, source: 'provider' });
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			log.warn(`Could not list models: ${msg}`);
			return c.json({ models: curatedModelsFor(live.config.llm.provider), source: 'fallback' });
		}
	});

	// Static files (production). In dev, Vite serves the client on its own port.
	if (staticDir) {
		app.use('/*', serveStatic({ root: staticDir }));
		// SPA fallback \u2014 React Router (or just history API) needs index.html
		// for any non-asset route.
		app.get('*', serveStatic({ path: `${staticDir}/index.html` }));
	}

	return app;
}

/**
 * Curated model fallback. Used when the provider's /models endpoint fails
 * (Ollama down, network error, etc.). Keep the list short \u2014 these are
 * reasonable defaults, not a catalog.
 */
function curatedModelsFor(provider: 'ollama' | 'openai'): string[] {
	if (provider === 'ollama') {
		return ['llama3.1:8b', 'llama3.1:70b', 'qwen2.5:7b', 'mistral:7b', 'gemma2:9b'];
	}
	return [
		'gpt-4o-mini',
		'gpt-4o',
		'gpt-4.1',
		'gpt-4.1-mini',
		'o4-mini',
		'o3',
		'claude-3-5-sonnet-latest',
		'claude-3-5-haiku-latest',
	];
}

/**
 * Load the config and build all the providers + store the app needs.
 * Centralized so the CLI command and the (future) Docker entry point
 * share the same wiring.
 */
export async function buildLiveDeps(): Promise<LiveDeps> {
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

/**
 * Back-compat shim. Older callers used `buildDeps()`; new code should use
 * `buildLiveDeps()` and pass the result as `deps.live`.
 *
 * @deprecated Use buildLiveDeps + new ServerDeps shape.
 */
export async function buildDeps(): Promise<{
	config: GrottoConfig;
	store: Store;
	embedder: EmbedProvider;
	llm: LLMProvider;
}> {
	const live = await buildLiveDeps();
	return {
		config: live.config,
		store: live.store,
		embedder: live.embedder,
		llm: live.llm,
	};
}
