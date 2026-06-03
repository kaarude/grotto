import OpenAI from 'openai';
import type { EmbedProvider, EmbedOptions, EmbedResult, EmbedProviderInfo } from './base.js';
import type { EmbedPreset } from '../presets.js';

/**
 * Any embedding service that speaks the OpenAI /v1/embeddings protocol.
 *
 * Covers OpenAI, OpenRouter, Voyage, Mistral, Jina, Nomic, Together,
 * LM Studio, llama.cpp, and any custom base URL you point it at.
 */
export class OpenAICompatibleEmbed implements EmbedProvider {
	readonly info: EmbedProviderInfo;
	private client: OpenAI;
	private preset: EmbedPreset;

	constructor(preset: EmbedPreset, baseUrl: string | undefined, apiKey: string) {
		this.preset = preset;
		this.info = {
			name: preset.name,
			displayName: preset.displayName,
			defaultModel: preset.defaultEmbedModel,
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
		// Most OpenAI-compatible embed endpoints don't expose a /models
		// listing. The preset's curated list is the source of truth.
		return this.preset.curatedModels;
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
		// OpenAI supports batch input natively — way faster than per-text calls.
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
