import { startServer } from '../../server/start.js';
import { log } from '../../util/logger.js';

export interface WebOptions {
	port?: number;
	open?: boolean;
	host?: string;
}

export async function webCommand(opts: WebOptions): Promise<void> {
	const port = opts.port ?? 4737;
	const host = opts.host ?? '127.0.0.1';
	try {
		await startServer({ port, host, open: opts.open });
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		log.error(msg);
		process.exit(1);
	}
}
