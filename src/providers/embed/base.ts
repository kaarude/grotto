export interface EmbedOptions {
	model: string;
}

export interface EmbedResult {
	vector: number[];
	model: string;
}

export interface EmbedProviderInfo {
	name: string;
	displayName: string;
	defaultModel: string;
	defaultBaseUrl?: string;
	requiresApiKey: boolean;
}

export interface EmbedProvider {
	readonly info: EmbedProviderInfo;
	listModels(): Promise<string[]>;
	embed(text: string, options: EmbedOptions): Promise<EmbedResult>;
	embedBatch(texts: string[], options: EmbedOptions): Promise<EmbedResult[]>;
	validateConnection(): Promise<{ ok: boolean; error?: string; models?: string[] }>;
}
