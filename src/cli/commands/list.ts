import chalk from 'chalk';
import { loadConfig } from '../../core/config.js';

/**
 * Stub. Day 5 will:
 *   1. Open LanceDB
 *   2. List collections (one per notes path? or single collection?)
 *   3. Show file count, chunk count, last indexed
 */
export async function listCommand(): Promise<void> {
	try {
		const config = loadConfig();
		console.log(chalk.bold('\nIndexed collections'));
		console.log(chalk.gray('─'.repeat(40)));
		for (const p of config.notes.paths) {
			console.log(`${chalk.cyan('·')} ${p}  ${chalk.gray('(not yet indexed — run `grotto add`)')}`);
		}
		console.log();
	} catch (err) {
		console.error(chalk.red((err as Error).message));
		process.exit(1);
	}
}
