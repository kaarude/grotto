import { spawn } from 'node:child_process';
import chalk from 'chalk';
import { loadConfig, maskConfig, configExists, saveConfig } from '../../core/config.js';
import { paths } from '../../util/paths.js';

export function configShowCommand(): void {
	if (!configExists()) {
		console.error(chalk.red('No config found. Run `grotto init` first.'));
		process.exit(1);
	}
	const config = maskConfig(loadConfig());
	console.log(chalk.bold('\nCurrent config'));
	console.log(chalk.gray('─'.repeat(40)));
	console.log(chalk.cyan('Config file: ') + paths.configFile);
	console.log(JSON.stringify(config, null, 2));
	console.log();
}

export function configPathCommand(): void {
	console.log(paths.configFile);
}

export async function configEditCommand(): Promise<void> {
	if (!configExists()) {
		console.error(chalk.red('No config found. Run `grotto init` first.'));
		process.exit(1);
	}
	const editor = process.env.EDITOR ?? process.env.VISUAL ?? 'vi';
	const child = spawn(editor, [paths.configFile], { stdio: 'inherit' });
	await new Promise<void>((resolve) => child.on('exit', () => resolve()));
	// Re-validate after edit
	try {
		loadConfig();
		console.log(chalk.green('✓ Config is valid'));
	} catch (err) {
		console.error(chalk.red('✖ Config has errors:'), err);
		process.exit(1);
	}
}

export function configValidateCommand(): void {
	try {
		loadConfig();
		console.log(chalk.green('✓ Config is valid'));
	} catch (err) {
		console.error(chalk.red('✖ Config has errors:'), err);
		process.exit(1);
	}
}
