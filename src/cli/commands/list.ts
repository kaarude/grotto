import chalk from 'chalk';
import { loadConfig } from '../../core/config.js';
import { Store } from '../../core/store.js';
import { log } from '../../util/logger.js';

export async function listCommand(): Promise<void> {
	try {
		const config = loadConfig();
		const store = new Store();
		const sources = await store.listSources();
		const total = await store.count();

		console.log();
		console.log(chalk.bold('Indexed files') + chalk.gray(`  (${total} chunks in LanceDB)`));
		console.log(chalk.gray('─'.repeat(60)));

		if (sources.length === 0) {
			console.log(chalk.gray('  No files indexed yet.'));
			console.log(
				chalk.gray('  Run ') + chalk.cyan('grotto add') + chalk.gray(' to index your notes.'),
			);
		} else {
			for (const s of sources) {
				const rel = s.source.replace(process.cwd() + '/', '');
				const size = chalk.gray(`${formatSize(s.chunks)} chunk${s.chunks === 1 ? '' : 's'}`);
				console.log(`${chalk.cyan('·')} ${rel}  ${size}  ${chalk.gray('.' + s.ext)}`);
			}
		}
		console.log();
		console.log(chalk.gray('Paths:'));
		for (const p of config.notes.paths) {
			console.log(chalk.gray(`  ${p}`));
		}
		console.log();
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		log.error(msg);
		process.exit(1);
	}
}

function formatSize(n: number): string {
	if (n < 1000) return String(n);
	if (n < 1_000_000) return (n / 1000).toFixed(1) + 'k';
	return (n / 1_000_000).toFixed(1) + 'M';
}
