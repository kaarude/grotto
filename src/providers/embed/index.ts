import type { EmbedProvider } from './base.js';
import { OllamaEmbed } from './ollama.js';
import { OpenAIEmbed } from './openai.js';
import type { GrottoConfig } from '../../core/config.js';

export function createEmbedProvider(config: GrottoConfig): EmbedProvider {
	const c = config.embed;
	if (c.provider === 'ollama') {
		return new OllamaEmbed(c.baseUrl);
	}
	if (!c.apiKey) {
		throw new Error(`Embed provider "${c.provider}" requires an API key. Run \`grotto config\` to set it.`);
	}
	return new OpenAIEmbed(c.baseUrl, c.apiKey);
}

export type { EmbedProvider, EmbedOptions, EmbedResult } from './base.js';
