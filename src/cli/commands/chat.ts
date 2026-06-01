import chalk from 'chalk';

/**
 * Stub for now. Day 3-4 will:
 *   1. Load config
 *   2. Embed user query
 *   3. Vector search top-K chunks
 *   4. Build prompt with system + context
 *   5. Stream LLM response into Ink TUI
 *   6. Show source citations
 */
export async function chatCommand(): Promise<void> {
	console.log(chalk.yellow('⚠ chat is not implemented yet — coming in the next build.'));
	console.log(chalk.gray('  Plan: embed query → retrieve top-K → stream LLM → show sources.'));
}
