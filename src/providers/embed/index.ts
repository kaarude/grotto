import type { EmbedProvider } from './base.js';
import { OllamaEmbed } from './ollama.js';
import { OpenAICompatibleEmbed } from './openai-compatible.js';
import { CohereEmbed } from './cohere.js';
import type { GrottoConfig } from '../../core/config.js';
import { EMBED_PRESETS, resolveApiKey } from '../presets.js';

/**
 * Build the embed provider for the current config.
 *
 * Dispatch:
 *   - ollama / ollama-cloud → OllamaEmbed
 *   - cohere → CohereEmbed (native /v1/embed, different shape)
 *   - everything else → OpenAICompatibleEmbed, fed by a preset
 */
export function createEmbedProvider(config: GrottoConfig): EmbedProvider {
	const c = config.embed;
	const preset = EMBED_PRESETS[c.provider];

	if (c.provider === 'ollama') {
		return new OllamaEmbed(c.baseUrl, c.apiKey ?? process.env.OLLAMA_API_KEY, { flavor: 'local' });
	}
	if (c.provider === 'ollama-cloud') {
		const apiKey = resolveApiKey(
			preset!,
			c.apiKey ?? process.env.OLLAMA_API_KEY ?? process.env.OLLAMA_CLOUD_API_KEY,
		);
		if (!apiKey) {
			throw new Error(
				`Ollama Cloud requires an API key.\n` +
					`Set OLLAMA_API_KEY (or GROTTO_API_KEY) in your environment, or add apiKey to your config.`,
			);
		}
		return new OllamaEmbed(c.baseUrl, apiKey, { flavor: 'cloud' });
	}
	if (c.provider === 'cohere') {
		const apiKey = resolveApiKey(preset!, c.apiKey);
		if (!apiKey) {
			throw new Error(
				`Cohere requires an API key.\n` +
					`Set COHERE_API_KEY (or GROTTO_API_KEY) in your environment, or add apiKey to your config.`,
			);
		}
		return new CohereEmbed(preset!, c.baseUrl, apiKey);
	}

	if (!preset) {
		throw new Error(
			`Unknown embed provider: "${c.provider}".\n` +
				`Valid options: ${Object.keys(EMBED_PRESETS).join(', ')}`,
		);
	}
	const apiKey = resolveApiKey(preset, c.apiKey);
	if (!apiKey && preset.requiresApiKey) {
		const envHint = preset.envVars?.length
			? ` Try ${preset.envVars.join(' or ')} in your environment.`
			: '';
		throw new Error(
			`Embed provider "${c.provider}" requires an API key.${envHint}\n` +
				`Set GROTTO_API_KEY in your environment, or add apiKey to your config.`,
		);
	}
	if (!apiKey) {
		return new OpenAICompatibleEmbed(preset, c.baseUrl, 'no-key-needed');
	}
	return new OpenAICompatibleEmbed(preset, c.baseUrl, apiKey);
}

export type { EmbedProvider, EmbedOptions, EmbedResult } from './base.js';
