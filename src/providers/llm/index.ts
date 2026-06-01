import type { LLMProvider } from './base.js';
import { OllamaLLM } from './ollama.js';
import { OpenAICompatibleLLM } from './openai-compatible.js';
import type { GrottoConfig } from '../../core/config.js';

export function createLLMProvider(config: GrottoConfig): LLMProvider {
	const c = config.llm;
	if (c.provider === 'ollama') {
		return new OllamaLLM(c.baseUrl);
	}
	const apiKey = process.env.GROTTO_API_KEY ?? process.env.OPENAI_API_KEY ?? c.apiKey;
	if (!apiKey) {
		throw new Error(
			`LLM provider "${c.provider}" requires an API key.\n` +
				`Set GROTTO_API_KEY or OPENAI_API_KEY in your environment, or add apiKey to your config.`,
		);
	}
	return new OpenAICompatibleLLM(c.baseUrl, apiKey);
}

export type { LLMProvider, Message, ChatOptions, ChatChunk, ProviderInfo } from './base.js';
