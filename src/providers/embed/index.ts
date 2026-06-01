import type { EmbedProvider } from './base.js';
import { OllamaEmbed } from './ollama.js';
import { OpenAIEmbed } from './openai.js';
import type { GrottoConfig } from '../../core/config.js';

export function createEmbedProvider(config: GrottoConfig): EmbedProvider {
	const c = config.embed;
	if (c.provider === 'ollama') {
		return new OllamaEmbed(c.baseUrl);
	}
	const apiKey = process.env.GROTTO_API_KEY ?? process.env.OPENAI_API_KEY ?? c.apiKey;
	if (!apiKey) {
		throw new Error(
			`Embed provider "${c.provider}" requires an API key.\n` +
				`Set GROTTO_API_KEY or OPENAI_API_KEY in your environment, or add apiKey to your config.`,
		);
	}
	return new OpenAIEmbed(c.baseUrl, apiKey);
}

export type { EmbedProvider, EmbedOptions, EmbedResult } from './base.js';
