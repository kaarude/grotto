import OpenAI from 'openai';
import type {
	LLMProvider,
	Message,
	ChatOptions,
	ChatChunk,
	ProviderInfo,
} from './base.js';

/**
 * Works with any OpenAI-compatible API:
 *   - OpenAI  (https://api.openai.com/v1)
 *   - OpenRouter (https://openrouter.ai/api/v1)
 *   - Groq, Together, Fireworks, Mistral, LM Studio, llama.cpp server, etc.
 */
export class OpenAICompatibleLLM implements LLMProvider {
	readonly info: ProviderInfo = {
		name: 'openai',
		displayName: 'OpenAI-compatible',
		defaultModel: 'gpt-4o-mini',
		requiresApiKey: true,
	};

	private client: OpenAI;

	constructor(baseUrl: string | undefined, apiKey: string) {
		this.client = new OpenAI({
			apiKey,
			baseURL: baseUrl,
		});
	}

	async listModels(): Promise<string[]> {
		const list = await this.client.models.list();
		return list.data.map((m: { id: string }) => m.id).sort();
	}

	async *chat(messages: Message[], options: ChatOptions): AsyncIterable<ChatChunk> {
		const oaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((m) => ({
			role: m.role,
			content: m.content,
		}));

		if (options.systemPrompt) {
			oaiMessages.unshift({ role: 'system', content: options.systemPrompt });
		}

		const stream = await this.client.chat.completions.create({
			model: options.model,
			messages: oaiMessages,
			temperature: options.temperature,
			stream: true,
		});

		for await (const part of stream) {
			const content = part.choices[0]?.delta?.content ?? '';
			yield { content, done: false };
		}
		yield { content: '', done: true };
	}

	async validateConnection(): Promise<{ ok: boolean; error?: string; models?: string[] }> {
		try {
			const models = await this.listModels();
			return { ok: true, models: models.slice(0, 10) };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			return { ok: false, error: msg };
		}
	}
}
