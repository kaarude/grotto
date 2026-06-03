import OpenAI from 'openai';
import type { LLMProvider, Message, ChatOptions, ChatChunk, ProviderInfo } from './base.js';
import type { LlmPreset } from '../presets.js';

/**
 * Works with any OpenAI-compatible chat API.
 *
 * All the named providers that speak the OpenAI protocol (OpenRouter,
 * Groq, Together, Mistral, xAI, DeepSeek, Fireworks, Perplexity,
 * Cohere's compat endpoint, LM Studio, llama.cpp, vLLM, etc.) get
 * their baseUrl, default model, curated list, and extra headers from
 * a preset. The actual class is the same — there's nothing
 * provider-specific about how it talks to them.
 */
export class OpenAICompatibleLLM implements LLMProvider {
	readonly info: ProviderInfo;
	private client: OpenAI;
	private preset: LlmPreset;

	constructor(preset: LlmPreset, baseUrl: string | undefined, apiKey: string) {
		this.preset = preset;
		this.info = {
			name: preset.name,
			displayName: preset.displayName,
			defaultModel: preset.defaultLlmModel,
			defaultBaseUrl: preset.defaultBaseUrl,
			requiresApiKey: preset.requiresApiKey,
		};
		this.client = new OpenAI({
			apiKey,
			baseURL: baseUrl ?? preset.defaultBaseUrl,
			defaultHeaders: preset.extraHeaders,
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
			return { ok: true, models };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			// Bad keys are a special case — explain it clearly.
			if (/401|403|unauthor/i.test(msg)) {
				return {
					ok: false,
					error: `Authentication failed. Check your API key for ${this.info.displayName}.`,
				};
			}
			return { ok: false, error: msg };
		}
	}
}
