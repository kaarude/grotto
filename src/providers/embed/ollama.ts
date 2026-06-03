import { Ollama, type Config } from 'ollama';
import type { EmbedProvider, EmbedOptions, EmbedResult, EmbedProviderInfo } from './base.js';

export interface OllamaEmbedOptions {
	flavor: 'local' | 'cloud';
}

/**
 * Ollama embeddings — both local and Ollama Cloud.
 */
export class OllamaEmbed implements EmbedProvider {
	readonly info: EmbedProviderInfo;
	private client: Ollama;
	private flavor: 'local' | 'cloud';

	constructor(
		baseUrl: string | undefined,
		apiKey: string | undefined,
		options: OllamaEmbedOptions = { flavor: 'local' },
	) {
		this.flavor = options.flavor;
		const defaultBase =
			options.flavor === 'cloud' ? 'https://api.ollama.cloud' : 'http://localhost:11434';

		const headers: Record<string, string> = {};
		if (options.flavor === 'cloud' && apiKey) {
			headers['Authorization'] = `Bearer ${apiKey}`;
		}

		const config: Config = { host: baseUrl ?? defaultBase, headers };
		this.client = new Ollama(config);

		this.info = {
			name: options.flavor === 'cloud' ? 'ollama-cloud' : 'ollama',
			displayName: options.flavor === 'cloud' ? 'Ollama Cloud' : 'Ollama (local)',
			defaultModel: 'nomic-embed-text',
			defaultBaseUrl: defaultBase,
			requiresApiKey: options.flavor === 'cloud',
		};
	}

	async listModels(): Promise<string[]> {
		const installed = await this.client.list();
		const names = installed.models.map((m) => m.name);
		// Ollama doesn't separate embed models — any model can embed.
		// Suggest the canonical embedding model plus whatever is installed.
		const has = names.some((n) => n.startsWith('nomic-embed-text'));
		return has ? names : ['nomic-embed-text', ...names];
	}

	async embed(text: string, options: EmbedOptions): Promise<EmbedResult> {
		const res = await this.client.embeddings({
			model: options.model,
			prompt: text,
		});
		return { vector: res.embedding, model: options.model };
	}

	async embedBatch(texts: string[], options: EmbedOptions): Promise<EmbedResult[]> {
		// Ollama doesn't batch natively; do in parallel with a small pool.
		const concurrency = 4;
		const results: EmbedResult[] = new Array(texts.length);
		let cursor = 0;
		const workers = Array.from({ length: concurrency }, async () => {
			while (true) {
				const i = cursor++;
				if (i >= texts.length) return;
				results[i] = await this.embed(texts[i]!, options);
			}
		});
		await Promise.all(workers);
		return results;
	}

	async validateConnection() {
		try {
			const models = await this.listModels();
			return { ok: true, models };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
				return {
					ok: false,
					error: `Cannot reach Ollama. Start it with \`ollama serve\`. (${msg})`,
				};
			}
			if (/401|403|unauthor/i.test(msg)) {
				return { ok: false, error: 'Authentication failed. Check your OLLAMA_API_KEY.' };
			}
			return { ok: false, error: msg };
		}
	}
}
