import chalk from 'chalk';
import { loadConfig } from '../../core/config.js';
import { createEmbedProvider } from '../../providers/embed/index.js';
import { ingest } from '../../core/ingest.js';
import { log } from '../../util/logger.js';

export async function addCommand(opts: { path?: string; watch?: boolean }): Promise<void> {
	const config = loadConfig();

	const providerName = config.embed.provider;
	const model = config.embed.model;
	log.dim(`Using embedder: ${providerName}/${model}`);

	const embedder = createEmbedProvider(config);

	try {
		const result = await ingest(config, embedder, { path: opts.path });
		console.log();
		log.success(
			`Done. ${result.chunks} chunks from ${result.filesIndexed} file${result.filesIndexed === 1 ? '' : 's'} ` +
				`(${result.filesSkipped} unchanged, ${result.filesFailed} failed).`,
		);
		if (result.filesIndexed > 0) {
			console.log(chalk.gray('  Next: ') + chalk.cyan('grotto chat'));
		}
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		log.error(msg);
		process.exit(1);
	}
}
