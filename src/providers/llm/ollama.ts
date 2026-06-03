import { Ollama, type Config } from 'ollama';
import type { LLMProvider, Message, ChatOptions, ChatChunk, ProviderInfo } from './base.js';

export interface OllamaLLMOptions {
	/**
	 * Provider flavor. `local` connects to an Ollama server running on
	 * the configured host (default: http://localhost:11434). `cloud` hits
	 * Ollama's hosted service and requires an API key in the
	 * `Authorization: Bearer` header.
	 */
	flavor: 'local' | 'cloud';
}

/**
 * Ollama — both local (`ollama serve`) and Ollama Cloud
 * (https://api.ollama.cloud). Same protocol, different transport.
 */
export class OllamaLLM implements LLMProvider {
	readonly info: ProviderInfo;
	private client: Ollama;
	private host: string;
	private flavor: 'local' | 'cloud';

	constructor(
		baseUrl: string | undefined,
		apiKey: string | undefined,
		options: OllamaLLMOptions = { flavor: 'local' },
	) {
		this.flavor = options.flavor;
		const defaultBase =
			options.flavor === 'cloud' ? 'https://api.ollama.cloud' : 'http://localhost:11434';
		this.host = baseUrl ?? defaultBase;

		const headers: Record<string, string> = {};
		if (options.flavor === 'cloud' && apiKey) {
			headers['Authorization'] = `Bearer ${apiKey}`;
		}

		const config: Config = { host: this.host, headers };
		this.client = new Ollama(config);

		this.info = {
			name: options.flavor === 'cloud' ? 'ollama-cloud' : 'ollama',
			displayName: options.flavor === 'cloud' ? 'Ollama Cloud' : 'Ollama (local)',
			defaultModel: 'llama3.1:8b',
			defaultBaseUrl: defaultBase,
			requiresApiKey: options.flavor === 'cloud',
		};
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
			if (/401|403|unauthor/i.test(msg)) {
				return { ok: false, error: 'Authentication failed. Check your OLLAMA_API_KEY.' };
			}
			return { ok: false, error: msg };
		}
	}
}
