import chalk from 'chalk';

/**
 * Stub for now. Day 2 will:
 *   1. Walk config.notes.paths (with ignore patterns)
 *   2. Detect file type → parser
 *   3. Chunk
 *   4. Embed (batched, with progress)
 *   5. Write to LanceDB
 */
export async function addCommand(opts: { path?: string; watch?: boolean }): Promise<void> {
	console.log(chalk.yellow('⚠ add is not implemented yet — coming in the next build.'));
	console.log(chalk.gray('  Plan: walk folder → parse → chunk → embed → store in LanceDB.'));
	if (opts.path) console.log(chalk.gray(`  Would scan: ${opts.path}`));
	if (opts.watch) console.log(chalk.gray('  Would watch for changes.'));
}
