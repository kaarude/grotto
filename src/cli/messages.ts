/**
 * Branding & shared strings. Centralized so the demo GIF, README, and CLI
 * all tell the same story.
 */
export const BRAND = {
	name: 'grotto',
	tagline: 'Chat with your notes. Locally. Privately. For free.',
	github: 'https://github.com/USER/grotto',
} as const;

export const MESSAGES = {
	welcome: `Welcome to ${BRAND.name} — ${BRAND.tagline}`,
	noConfig: (path: string) => `No config found at ${path}\nRun \`grotto init\` to get started.`,
	firstRun: `Looks like this is your first run. Let's set things up.`,
} as const;
