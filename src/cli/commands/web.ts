import chalk from 'chalk';

/**
 * Stub. Day 7+ will spin up a local web UI.
 * For now we just print the plan.
 */
export async function webCommand(opts: { port?: number; open?: boolean }): Promise<void> {
	const port = opts.port ?? 4737;
	console.log(chalk.yellow('⚠ web is not implemented yet — coming in a later build.'));
	console.log(chalk.gray(`  Plan: serve a Svelte UI at http://localhost:${port}`));
	if (opts.open) console.log(chalk.gray('  Would open browser automatically.'));
}
