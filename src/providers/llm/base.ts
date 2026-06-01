export interface Message {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface ChatOptions {
	model: string;
	temperature?: number;
	maxTokens?: number;
	systemPrompt?: string;
}

export interface ChatChunk {
	content: string;
	done: boolean;
}

export interface ProviderInfo {
	name: string;
	displayName: string;
	defaultModel: string;
	defaultBaseUrl?: string;
	requiresApiKey: boolean;
}

export interface LLMProvider {
	readonly info: ProviderInfo;
	listModels(): Promise<string[]>;
	chat(messages: Message[], options: ChatOptions): AsyncIterable<ChatChunk>;
	validateConnection(): Promise<{ ok: boolean; error?: string; models?: string[] }>;
}
