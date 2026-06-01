import type { LLMProvider } from './base.js';
import { OllamaLLM } from './ollama.js';
import { OpenAICompatibleLLM } from './openai-compatible.js';
import type { GrottoConfig } from '../../core/config.js';

export function createLLMProvider(config: GrottoConfig): LLMProvider {
	const c = config.llm;
	if (c.provider === 'ollama') {
		return new OllamaLLM(c.baseUrl);
	}
	if (!c.apiKey) {
		throw new Error(`LLM provider "${c.provider}" requires an API key. Run \`grotto config\` to set it.`);
	}
	return new OpenAICompatibleLLM(c.baseUrl, c.apiKey);
}

export type { LLMProvider, Message, ChatOptions, ChatChunk, ProviderInfo } from './base.js';
