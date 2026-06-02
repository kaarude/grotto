import { Ollama } from 'ollama';
import type { EmbedProvider, EmbedOptions, EmbedResult, EmbedProviderInfo } from './base.js';

export class OllamaEmbed implements EmbedProvider {
	readonly info: EmbedProviderInfo = {
		name: 'ollama',
		displayName: 'Ollama (local)',
		defaultModel: 'nomic-embed-text',
		defaultBaseUrl: 'http://localhost:11434',
		requiresApiKey: false,
	};

	private client: Ollama;

	constructor(baseUrl: string = 'http://localhost:11434') {
		this.client = new Ollama({ host: baseUrl });
	}

	async listModels(): Promise<string[]> {
		// Ollama doesn't separate embed models — any model can embed.
		// Suggest the canonical embedding model plus whatever is installed.
		const installed = await this.client.list();
		const names = installed.models.map((m) => m.name);
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
			return {
				ok: false,
				error: `Cannot reach Ollama. Start it with \`ollama serve\`. (${msg})`,
			};
		}
	}
}
