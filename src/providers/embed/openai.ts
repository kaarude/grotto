import OpenAI from 'openai';
import type { EmbedProvider, EmbedOptions, EmbedResult, EmbedProviderInfo } from './base.js';

export class OpenAIEmbed implements EmbedProvider {
	readonly info: EmbedProviderInfo = {
		name: 'openai',
		displayName: 'OpenAI-compatible',
		defaultModel: 'text-embedding-3-small',
		requiresApiKey: true,
	};

	private client: OpenAI;

	constructor(baseUrl: string | undefined, apiKey: string) {
		this.client = new OpenAI({ apiKey, baseURL: baseUrl });
	}

	async listModels(): Promise<string[]> {
		// OpenAI doesn't have a public list-embeddings endpoint,
		// so we hardcode the common ones and trust the user.
		return ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'];
	}

	async embed(text: string, options: EmbedOptions): Promise<EmbedResult> {
		const res = await this.client.embeddings.create({
			model: options.model,
			input: text,
		});
		const vec = res.data[0]?.embedding;
		if (!vec) throw new Error('No embedding returned from API');
		return { vector: vec, model: options.model };
	}

	async embedBatch(texts: string[], options: EmbedOptions): Promise<EmbedResult[]> {
		// OpenAI supports batch input natively — way faster.
		const res = await this.client.embeddings.create({
			model: options.model,
			input: texts,
		});
		return res.data.map((d) => ({
			vector: d.embedding,
			model: options.model,
		}));
	}

	async validateConnection() {
		try {
			await this.embed('ping', { model: this.info.defaultModel });
			return { ok: true };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			return { ok: false, error: msg };
		}
	}
}
