import { serve } from '@hono/node-server';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, buildLiveDeps } from './index.js';
import { log } from '../util/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface StartOptions {
	port: number;
	host: string;
	/** Open the browser after the server is up. */
	open?: boolean;
	/** Force dev mode (CORS for Vite, no static serving). Auto-detected otherwise. */
	dev?: boolean;
}

/**
 * Boot the grotto web server.
 *
 * - In production: serves the built React app from dist/web/ as static files.
 * - In dev: Hono runs on the configured port; the user is expected to run
 *   `npm run dev:web` (Vite) in another terminal. The two communicate via
 *   the Vite proxy in vite.config.ts.
 */
export async function startServer(opts: StartOptions): Promise<void> {
	const live = await buildLiveDeps();

	// Auto-detect prod vs dev: if dist/web/ exists, serve it; otherwise run in dev mode.
	// From dist/server/start.js, we walk up to dist/ then into web/.
	const candidate = join(__dirname, '..', 'web');
	const staticDir = existsSync(candidate) ? candidate : undefined;
	const dev = opts.dev ?? staticDir === undefined;

	const app = createApp(
		{
			live,
			staticDir,
			onChange: (next) => {
				log.dim(`  Model switched: ${next.llm.info.name} / ${next.config.llm.model}`);
			},
		},
		{ dev },
	);

	serve(
		{
			fetch: app.fetch,
			port: opts.port,
			hostname: opts.host,
		},
		(info) => {
			const url = `http://${info.address === '::' ? 'localhost' : info.address}:${info.port}`;
			log.success(`grotto web is running at ${url}`);
			log.dim(`  Embedder: ${live.config.embed.provider}/${live.config.embed.model}`);
			log.dim(`  LLM:      ${live.config.llm.provider}/${live.config.llm.model}`);
			if (dev) {
				log.dim(`  Dev mode: start the client with \`npm run dev:web\``);
			}
			if (opts.open) {
				import('node:child_process').then(({ spawn }) => {
					const cmd =
						process.platform === 'darwin'
							? 'open'
							: process.platform === 'win32'
								? 'start'
								: 'xdg-open';
					spawn(cmd, [url], { stdio: 'ignore', detached: true }).unref();
				});
			}
		},
	);
}
