import chalk from 'chalk';

type Level = 'debug' | 'info' | 'warn' | 'error';
const ranks: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

let currentLevel: Level = (process.env.GROTTO_LOG as Level) ?? 'info';

function shouldLog(level: Level): boolean {
	return ranks[level] >= ranks[currentLevel];
}

function prefix(level: Level): string {
	const icons: Record<Level, string> = {
		debug: chalk.gray('·'),
		info: chalk.blue('ℹ'),
		warn: chalk.yellow('⚠'),
		error: chalk.red('✖'),
	};
	return `${icons[level]} `;
}

export const log = {
	debug(msg: string, ...args: unknown[]): void {
		if (shouldLog('debug')) console.log(prefix('debug') + chalk.gray(msg), ...args);
	},
	info(msg: string, ...args: unknown[]): void {
		if (shouldLog('info')) console.log(prefix('info') + msg, ...args);
	},
	warn(msg: string, ...args: unknown[]): void {
		if (shouldLog('warn')) console.warn(prefix('warn') + chalk.yellow(msg), ...args);
	},
	error(msg: string, ...args: unknown[]): void {
		if (shouldLog('error')) console.error(prefix('error') + chalk.red(msg), ...args);
	},
	success(msg: string): void {
		console.log(chalk.green('✔ ') + msg);
	},
	dim(msg: string): void {
		console.log(chalk.gray(msg));
	},
};
