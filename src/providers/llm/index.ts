import type { LLMProvider } from './base.js';
import { OllamaLLM } from './ollama.js';
import { OpenAICompatibleLLM } from './openai-compatible.js';
import { AnthropicLLM } from './anthropic.js';
import type { GrottoConfig } from '../../core/config.js';
import { LLM_PRESETS, resolveApiKey } from '../presets.js';

/**
 * Build the LLM provider for the current config.
 *
 * Dispatch table:
 *   - ollama / ollama-cloud → OllamaLLM (native client, no SDK)
 *   - anthropic → AnthropicLLM (native Messages API via @anthropic-ai/sdk)
 *   - everything else → OpenAICompatibleLLM, fed by a preset
 *
 * Unknown provider names fail loudly with a list of valid options.
 */
export function createLLMProvider(config: GrottoConfig): LLMProvider {
	const c = config.llm;
	const preset = LLM_PRESETS[c.provider];

	if (c.provider === 'ollama') {
		return new OllamaLLM(c.baseUrl, c.apiKey ?? process.env.OLLAMA_API_KEY, { flavor: 'local' });
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
		return new OllamaLLM(c.baseUrl, apiKey, { flavor: 'cloud' });
	}
	if (c.provider === 'anthropic') {
		const apiKey = resolveApiKey(preset!, c.apiKey);
		if (!apiKey) {
			throw new Error(
				`Anthropic requires an API key.\n` +
					`Set ANTHROPIC_API_KEY (or GROTTO_API_KEY) in your environment, or add apiKey to your config.`,
			);
		}
		return new AnthropicLLM(c.baseUrl, apiKey);
	}

	// Everything else is OpenAI-compatible.
	if (!preset) {
		throw new Error(
			`Unknown LLM provider: "${c.provider}".\n` +
				`Valid options: ${Object.keys(LLM_PRESETS).join(', ')}`,
		);
	}
	const apiKey = resolveApiKey(preset, c.apiKey);
	if (!apiKey && preset.requiresApiKey) {
		const envHint = preset.envVars?.length
			? ` Try ${preset.envVars.join(' or ')} in your environment.`
			: '';
		throw new Error(
			`LLM provider "${c.provider}" requires an API key.${envHint}\n` +
				`Set GROTTO_API_KEY in your environment, or add apiKey to your config.`,
		);
	}
	if (!apiKey) {
		// Local server with no key — pass a placeholder. The OpenAI SDK
		// requires a non-empty string.
		return new OpenAICompatibleLLM(preset, c.baseUrl, 'no-key-needed');
	}
	return new OpenAICompatibleLLM(preset, c.baseUrl, apiKey);
}

export type { LLMProvider, Message, ChatOptions, ChatChunk, ProviderInfo } from './base.js';
