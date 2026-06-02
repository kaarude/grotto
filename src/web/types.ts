/**
 * Types shared with the grotto server.
 * Mirrors src/core/config.ts and src/server/index.ts.
 */

export interface MaskedConfig {
	version: number;
	notes: { paths: string[]; ignore: string[] };
	embed: { provider: string; model: string; baseUrl?: string; apiKey?: string };
	llm: { provider: string; model: string; baseUrl?: string; apiKey?: string };
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
export type FontChoice = 'inter' | 'plex-sans' | 'pt-serif' | 'source-serif' | 'geist' | 'plex-mono';

export const FONT_CHOICES: { value: FontChoice; label: string; sample: string }[] = [
	{ value: 'inter', label: 'Inter', sample: 'modern humanist sans' },
	{ value: 'plex-sans', label: 'IBM Plex Sans', sample: 'technical, paired with mono' },
	{ value: 'pt-serif', label: 'PT Serif', sample: 'editorial warmth' },
	{ value: 'source-serif', label: 'Source Serif 4', sample: 'modern editorial' },
	{ value: 'geist', label: 'Geist', sample: 'Vercel default' },
	{ value: 'plex-mono', label: 'IBM Plex Mono', sample: 'monospace everything' },
];
