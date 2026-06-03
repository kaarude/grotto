/**
 * Types shared with the grotto server.
 * Mirrors src/core/config.ts and src/server/index.ts.
 */

/**
 * LLM provider names grotto supports. Mirrors the keys in
 * src/providers/presets.ts → LLM_PRESETS. Kept as a string union so the
 * web UI's type-checker catches typos when we use a provider in a string
 * literal.
 */
export type LlmProviderName =
	| 'openai'
	| 'openai-compatible'
	| 'openrouter'
	| 'anthropic'
	| 'groq'
	| 'together'
	| 'mistral'
	| 'xai'
	| 'deepseek'
	| 'fireworks'
	| 'perplexity'
	| 'cohere'
	| 'ollama'
	| 'ollama-cloud'
	| 'lmstudio'
	| 'llamacpp';

/** Embed provider names grotto supports. */
export type EmbedProviderName =
	| 'openai'
	| 'openai-compatible'
	| 'openrouter'
	| 'voyage'
	| 'cohere'
	| 'mistral'
	| 'jina'
	| 'nomic'
	| 'together'
	| 'ollama'
	| 'ollama-cloud'
	| 'lmstudio'
	| 'llamacpp';

export interface MaskedConfig {
	version: number;
	notes: { paths: string[]; ignore: string[] };
	embed: { provider: EmbedProviderName | string; model: string; baseUrl?: string; apiKey?: string };
	llm: { provider: LlmProviderName | string; model: string; baseUrl?: string; apiKey?: string };
	chat: { topK: number; temperature: number; systemPrompt?: string };
}

export interface Citation {
	source: string;
	chunkIndex: number;
	text: string;
	distance: number;
}

export interface SourceInfo {
	source: string;
	chunks: number;
	hash: string;
	ext: string;
}

export interface SourcesResponse {
	total: number;
	sources: SourceInfo[];
}

export type Theme = 'light' | 'dark';
export type FontChoice =
	| 'inter'
	| 'plex-sans'
	| 'pt-serif'
	| 'source-serif'
	| 'geist'
	| 'plex-mono';

export const FONT_CHOICES: { value: FontChoice; label: string; sample: string }[] = [
	{ value: 'inter', label: 'Inter', sample: 'modern humanist sans' },
	{ value: 'plex-sans', label: 'IBM Plex Sans', sample: 'technical, paired with mono' },
	{ value: 'pt-serif', label: 'PT Serif', sample: 'editorial warmth' },
	{ value: 'source-serif', label: 'Source Serif 4', sample: 'modern editorial' },
	{ value: 'geist', label: 'Geist', sample: 'Vercel default' },
	{ value: 'plex-mono', label: 'IBM Plex Mono', sample: 'monospace everything' },
];

export interface ModelsResponse {
	models: string[];
	source: 'provider' | 'fallback';
}

/**
 * Placeholder prompts shown on the empty state. Designed for grotto's job:
 * chat with your local notes. Each is a verb-led action, not a question.
 * Clicking one fills the prompt bar so the user can edit before sending.
 */
export const PLACEHOLDER_PROMPTS: { label: string; prompt: string; description: string }[] = [
	{
		label: 'Summarize',
		prompt: 'Summarize the most important points from my recent notes.',
		description: 'A quick read-back of what you wrote.',
	},
	{
		label: 'Find a quote',
		prompt: 'Find a quote I saved about ',
		description: 'Search for something you said or read.',
	},
	{
		label: 'Compare two',
		prompt: 'Compare the arguments in my notes about ',
		description: 'Two takes, side by side.',
	},
	{
		label: 'What did I decide',
		prompt: 'What did I decide about ',
		description: 'Pull a decision out of the noise.',
	},
];
