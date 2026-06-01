#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initCommand } from './commands/init.js';
import {
	configShowCommand,
	configPathCommand,
	configEditCommand,
	configValidateCommand,
} from './commands/config.js';
import { addCommand } from './commands/add.js';
import { chatCommand } from './commands/chat.js';
import { listCommand } from './commands/list.js';
import { webCommand } from './commands/web.js';
import { BRAND, MESSAGES } from './messages.js';
import { configExists, loadConfigSafe } from '../core/config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'));

const program = new Command();

program
	.name(BRAND.name)
	.description(BRAND.tagline)
	.version(pkg.version)
	.showHelpAfterError();

program
	.command('init')
	.description('First-time setup: configure notes folder, embedder, and LLM')
	.action(initCommand);

program
	.command('add [path]')
	.description('Index notes (all configured paths, or a specific one)')
	.option('-w, --watch', 'Re-index when files change')
	.action((path, opts) => addCommand({ path, ...opts }));

program
	.command('chat')
	.description('Start an interactive chat with your notes')
	.action(chatCommand);

program
	.command('list')
	.description('List indexed collections and stats')
	.action(listCommand);

program
	.command('web')
	.description('Open the local web UI')
	.option('-p, --port <port>', 'port to serve on', '4737')
	.option('--no-open', 'do not open the browser automatically')
	.action((opts) => webCommand({ port: Number(opts.port), open: opts.open }));

const configCmd = program
	.command('config')
	.description('View or edit configuration');

configCmd
	.command('show')
	.description('Print current config (API keys masked)')
	.action(configShowCommand);

configCmd
	.command('path')
	.description('Print config file path')
	.action(configPathCommand);

configCmd
	.command('edit')
	.description('Open config in $EDITOR')
	.action(configEditCommand);

configCmd
	.command('validate')
	.description('Validate current config')
	.action(configValidateCommand);

// Friendly default: if no args, show welcome + help
async function main(): Promise<void> {
	if (process.argv.length <= 2) {
		console.log();
		console.log(chalk.bold.cyan(`  ${BRAND.name}`) + chalk.gray(' — ') + BRAND.tagline);
		console.log();
		if (!configExists() || !loadConfigSafe()) {
			console.log(chalk.yellow('  Not configured yet.'));
			console.log(chalk.gray('  Run ') + chalk.cyan('grotto init') + chalk.gray(' to get started.'));
		} else {
			console.log(chalk.gray('  Try: ') + chalk.cyan('grotto add') + chalk.gray(' · ') + chalk.cyan('grotto chat') + chalk.gray(' · ') + chalk.cyan('grotto web'));
		}
		console.log();
		program.help();
		return;
	}
	await program.parseAsync(process.argv);
}

main().catch((err) => {
	console.error(chalk.red('✖ ' + (err instanceof Error ? err.message : String(err))));
	if (process.env.GROTTO_DEBUG) console.error(err);
	process.exit(1);
});
