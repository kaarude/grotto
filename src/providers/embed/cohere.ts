import type { EmbedProvider, EmbedOptions, EmbedResult, EmbedProviderInfo } from './base.js';
import type { EmbedPreset } from '../presets.js';

/**
 * Cohere's native embedding API.
 *
 * Cohere is the one popular embed provider that doesn't follow the
 * OpenAI /v1/embeddings shape. They use:
 *   - POST /v1/embed
 *   - request:  { texts: string[], model: string, input_type: string }
 *   - response: { embeddings: number[][], id: string, ... }
 *
 * The `input_type` is required and changes how the vector is computed:
 *   - 'search_document' for indexing
 *   - 'search_query' for queries
 *
 * We use 'search_document' for embed/embedBatch (indexing) and
 * 'search_query' for query-time embeddings.
 */
export class CohereEmbed implements EmbedProvider {
	readonly info: EmbedProviderInfo;
	private baseUrl: string;
	private apiKey: string;

	constructor(preset: EmbedPreset, baseUrl: string | undefined, apiKey: string) {
		this.info = {
			name: preset.name,
			displayName: preset.displayName,
			defaultModel: preset.defaultEmbedModel,
			defaultBaseUrl: preset.defaultBaseUrl,
			requiresApiKey: preset.requiresApiKey,
		};
		this.baseUrl = (baseUrl ?? preset.defaultBaseUrl ?? 'https://api.cohere.ai').replace(/\/$/, '');
		this.apiKey = apiKey;
	}

	async listModels(): Promise<string[]> {
		return [
			'embed-english-v3.0',
			'embed-multilingual-v3.0',
			'embed-english-light-v3.0',
			'embed-multilingual-light-v3.0',
		];
	}

	async embed(text: string, options: EmbedOptions): Promise<EmbedResult> {
		const res = await this.callApi(options.model, [text], 'search_query');
		const vec = res.embeddings[0];
		if (!vec) throw new Error('No embedding returned from Cohere');
		return { vector: vec, model: options.model };
	}

	async embedBatch(texts: string[], options: EmbedOptions): Promise<EmbedResult[]> {
		if (texts.length === 0) return [];
		// Cohere's API accepts batches of up to 96 texts. Most grotto
		// batches are well under that, so we just send them in one go.
		const res = await this.callApi(options.model, texts, 'search_document');
		return res.embeddings.map((vec) => ({ vector: vec, model: options.model }));
	}

	private async callApi(
		model: string,
		texts: string[],
		inputType: 'search_document' | 'search_query',
	): Promise<{ embeddings: number[][] }> {
		const res = await fetch(`${this.baseUrl}/v1/embed`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			body: JSON.stringify({ texts, model, input_type: inputType }),
		});
		if (!res.ok) {
			const body = await res.text().catch(() => '');
			if (res.status === 401 || res.status === 403) {
				throw new Error('Authentication failed. Check your COHERE_API_KEY.');
			}
			throw new Error(`Cohere embed failed (${res.status}): ${body.slice(0, 300)}`);
		}
		return (await res.json()) as { embeddings: number[][] };
	}

	async validateConnection(): Promise<{ ok: boolean; error?: string; models?: string[] }> {
		try {
			await this.embed('ping', { model: this.info.defaultModel });
			return { ok: true, models: await this.listModels() };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			return { ok: false, error: msg };
		}
	}
}
