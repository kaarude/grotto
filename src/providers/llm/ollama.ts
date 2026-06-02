import { Ollama } from 'ollama';
import type { LLMProvider, Message, ChatOptions, ChatChunk, ProviderInfo } from './base.js';

export class OllamaLLM implements LLMProvider {
	readonly info: ProviderInfo = {
		name: 'ollama',
		displayName: 'Ollama (local)',
		defaultModel: 'llama3.1:8b',
		defaultBaseUrl: 'http://localhost:11434',
		requiresApiKey: false,
	};

	private client: Ollama;
	private host: string;

	constructor(baseUrl: string = 'http://localhost:11434') {
		this.host = baseUrl;
		this.client = new Ollama({ host: baseUrl });
	}

	async listModels(): Promise<string[]> {
		const res = await this.client.list();
		return res.models.map((m) => m.name);
	}

	async *chat(messages: Message[], options: ChatOptions): AsyncIterable<ChatChunk> {
		const ollamaMessages = messages.map((m) => ({
			role: m.role,
			content: m.content,
		}));

		if (options.systemPrompt) {
			ollamaMessages.unshift({ role: 'system', content: options.systemPrompt });
		}

		const stream = await this.client.chat({
			model: options.model,
			messages: ollamaMessages,
			stream: true,
			options: {
				temperature: options.temperature,
			},
		});

		for await (const part of stream) {
			yield {
				content: part.message?.content ?? '',
				done: part.done ?? false,
			};
		}
	}

	async validateConnection(): Promise<{ ok: boolean; error?: string; models?: string[] }> {
		try {
			const models = await this.listModels();
			return { ok: true, models };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
				return {
					ok: false,
					error: `Cannot reach Ollama at ${this.host}. Is it running? Start it with \`ollama serve\`.`,
				};
			}
			return { ok: false, error: msg };
		}
	}
}
