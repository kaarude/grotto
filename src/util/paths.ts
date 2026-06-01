import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

/**
 * XDG-style paths. We honor XDG_CONFIG_HOME and XDG_DATA_HOME when set,
 * otherwise fall back to ~/.config and ~/.local/share (Linux/Mac convention).
 *
 * Windows: we still use these paths under %USERPROFILE% since most CLI users
 * on Windows have WSL/git-bash where these are familiar. We can revisit.
 */
const home = homedir();

const xdgConfig = process.env.XDG_CONFIG_HOME ?? join(home, '.config');
const xdgData = process.env.XDG_DATA_HOME ?? join(home, '.local', 'share');

export const paths = {
	configDir: join(xdgConfig, 'grotto'),
	configFile: join(xdgConfig, 'grotto', 'config.toml'),
	dataDir: join(xdgData, 'grotto'),
	dbDir: join(xdgData, 'grotto', 'db'),
	cacheDir: join(xdgData, 'grotto', 'cache'),
};

export function ensureDirs(): void {
	for (const dir of [paths.configDir, paths.dataDir, paths.dbDir, paths.cacheDir]) {
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
	}
}

export function resolvePath(p: string): string {
	if (p.startsWith('~')) return join(home, p.slice(1));
	if (p.startsWith('/') || /^[a-zA-Z]:/.test(p)) return p;
	// relative to cwd of grotto config
	return join(paths.configDir, dirname(p));
}
