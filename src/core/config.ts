import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parse, stringify } from 'smol-toml';
import { z } from 'zod';
import { paths, ensureDirs } from '../util/paths.js';
import { log } from '../util/logger.js';

/**
 * Provider enum. We allow every named provider for both [llm] and [embed]
 * — the factory in providers/llm/index.ts and providers/embed/index.ts
 * validates whether a given name is actually supported for that role and
 * throws a helpful error if not.
 */
const Provider = z.enum([
	// LLM + embed (OpenAI-compatible)
	'openai',
	'openai-compatible',
	'openrouter',
	// LLM + embed (Anthropic is LLM-only; OpenAI-compat handles Cohere)
	'anthropic',
	// LLM + embed
	'groq',
	'together',
	'mistral',
	'xai',
	'deepseek',
	'fireworks',
	'perplexity',
	'cohere',
	// Local / self-hosted
	'ollama',
	'ollama-cloud',
	'lmstudio',
	'llamacpp',
	// Embed-only
	'voyage',
	'jina',
	'nomic',
]);

const Notes = z.object({
	paths: z.array(z.string()).default([]),
	ignore: z.array(z.string()).default(['**/node_modules/**', '**/.git/**']),
});

const Embed = z.object({
	provider: Provider,
	model: z.string().min(1),
	baseUrl: z.string().url().optional(),
	apiKey: z.string().optional(),
});

const LLM = z.object({
	provider: Provider,
	model: z.string().min(1),
	baseUrl: z.string().url().optional(),
	apiKey: z.string().optional(),
});

const Chat = z.object({
	topK: z.number().int().min(1).max(50).default(5),
	temperature: z.number().min(0).max(2).default(0.3),
	systemPrompt: z.string().optional(),
});

export const ConfigSchema = z.object({
	version: z.literal(1),
	notes: Notes,
	embed: Embed,
	llm: LLM,
	chat: Chat,
});

export type GrottoConfig = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG: GrottoConfig = {
	version: 1,
	notes: { paths: [], ignore: ['**/node_modules/**', '**/.git/**'] },
	embed: { provider: 'openai', model: 'text-embedding-3-small' },
	llm: { provider: 'openai', model: 'gpt-4o-mini' },
	chat: { topK: 5, temperature: 0.3 },
};

export function configExists(): boolean {
	return existsSync(paths.configFile);
}

export function loadConfig(): GrottoConfig {
	if (!configExists()) {
		throw new Error(`No config found at ${paths.configFile}\nRun \`grotto init\` to get started.`);
	}
	const raw = readFileSync(paths.configFile, 'utf-8');
	const parsed = parse(raw);
	const result = ConfigSchema.safeParse(parsed);
	if (!result.success) {
		log.error('Invalid config:');
		console.error(result.error.format());
		throw new Error('Config validation failed');
	}
	return result.data;
}

export function loadConfigSafe(): GrottoConfig | null {
	if (!configExists()) return null;
	try {
		return loadConfig();
	} catch {
		return null;
	}
}

export function saveConfig(config: GrottoConfig): void {
	ensureDirs();
	const obj = {
		version: config.version,
		notes: config.notes,
		embed: config.embed,
		llm: config.llm,
		chat: config.chat,
	};
	writeFileSync(paths.configFile, stringify(obj) + '\n', 'utf-8');
}

export function maskConfig(config: GrottoConfig): GrottoConfig {
	const mask = (v?: string): string | undefined => (v ? '***' + v.slice(-4) : undefined);
	return {
		...config,
		embed: { ...config.embed, apiKey: mask(config.embed.apiKey) },
		llm: { ...config.llm, apiKey: mask(config.llm.apiKey) },
	};
}
