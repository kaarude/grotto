/**
 * Web-only provider metadata.
 *
 * Mirrors src/providers/presets.ts. We can't import the server file
 * directly because the web bundle has its own tsconfig that excludes
 * the providers directory. Keep this in sync with presets.ts when
 * you add or rename a provider.
 *
 * The web UI only needs the picker data (display name, hint, default
 * model, default base URL, curated model list). API-key resolution
 * happens server-side.
 */

export interface WebLlmProviderMeta {
	name: string;
	displayName: string;
	hint?: string;
	defaultModel: string;
	defaultBaseUrl?: string;
	requiresApiKey: boolean;
	curatedModels: string[];
}

export interface WebEmbedProviderMeta {
	name: string;
	displayName: string;
	hint?: string;
	defaultModel: string;
	defaultBaseUrl?: string;
	requiresApiKey: boolean;
	curatedModels: string[];
}

export const LLM_PROVIDERS: WebLlmProviderMeta[] = [
	{
		name: 'openai',
		displayName: 'OpenAI',
		hint: 'BYOK · recommended',
		defaultModel: 'gpt-4o-mini',
		defaultBaseUrl: 'https://api.openai.com/v1',
		requiresApiKey: true,
		curatedModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'gpt-4.1-mini', 'o4-mini', 'o3'],
	},
	{
		name: 'openrouter',
		displayName: 'OpenRouter',
		hint: '100+ models · one key',
		defaultModel: 'anthropic/claude-3.5-sonnet',
		defaultBaseUrl: 'https://openrouter.ai/api/v1',
		requiresApiKey: true,
		curatedModels: [
			'anthropic/claude-3.5-sonnet',
			'anthropic/claude-3.5-haiku',
			'openai/gpt-4o-mini',
			'google/gemini-pro-1.5',
			'meta-llama/llama-3.1-70b-instruct',
		],
	},
	{
		name: 'anthropic',
		displayName: 'Anthropic (Claude)',
		hint: 'native API',
		defaultModel: 'claude-3-5-sonnet-latest',
		defaultBaseUrl: 'https://api.anthropic.com',
		requiresApiKey: true,
		curatedModels: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest'],
	},
	{
		name: 'groq',
		displayName: 'Groq',
		hint: 'fast inference',
		defaultModel: 'llama-3.1-70b-versatile',
		defaultBaseUrl: 'https://api.groq.com/openai/v1',
		requiresApiKey: true,
		curatedModels: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
	},
	{
		name: 'together',
		displayName: 'Together AI',
		hint: 'open models',
		defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
		defaultBaseUrl: 'https://api.together.xyz/v1',
		requiresApiKey: true,
		curatedModels: [
			'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
			'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
			'mistralai/Mixtral-8x7B-Instruct-v0.1',
		],
	},
	{
		name: 'mistral',
		displayName: 'Mistral',
		hint: "Mistral's API",
		defaultModel: 'mistral-large-latest',
		defaultBaseUrl: 'https://api.mistral.ai/v1',
		requiresApiKey: true,
		curatedModels: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'],
	},
	{
		name: 'xai',
		displayName: 'xAI (Grok)',
		hint: 'Grok models',
		defaultModel: 'grok-2-latest',
		defaultBaseUrl: 'https://api.x.ai/v1',
		requiresApiKey: true,
		curatedModels: ['grok-2-latest', 'grok-2-mini', 'grok-beta'],
	},
	{
		name: 'deepseek',
		displayName: 'DeepSeek',
		hint: 'reasoning + chat',
		defaultModel: 'deepseek-chat',
		defaultBaseUrl: 'https://api.deepseek.com/v1',
		requiresApiKey: true,
		curatedModels: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder'],
	},
	{
		name: 'fireworks',
		displayName: 'Fireworks AI',
		hint: 'fast open models',
		defaultModel: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
		defaultBaseUrl: 'https://api.fireworks.ai/inference/v1',
		requiresApiKey: true,
		curatedModels: [
			'accounts/fireworks/models/llama-v3p1-70b-instruct',
			'accounts/fireworks/models/llama-v3p1-8b-instruct',
		],
	},
	{
		name: 'perplexity',
		displayName: 'Perplexity',
		hint: 'web-grounded answers',
		defaultModel: 'sonar-pro',
		defaultBaseUrl: 'https://api.perplexity.ai',
		requiresApiKey: true,
		curatedModels: ['sonar-pro', 'sonar'],
	},
	{
		name: 'cohere',
		displayName: 'Cohere',
		hint: "Cohere's models",
		defaultModel: 'command-r-plus',
		defaultBaseUrl: 'https://api.cohere.ai/compatibility/v1',
		requiresApiKey: true,
		curatedModels: ['command-r-plus', 'command-r', 'command'],
	},
	{
		name: 'ollama',
		displayName: 'Ollama (local)',
		hint: 'free · private',
		defaultModel: 'llama3.1:8b',
		defaultBaseUrl: 'http://localhost:11434',
		requiresApiKey: false,
		curatedModels: ['llama3.1:8b', 'llama3.1:70b', 'qwen2.5:7b', 'mistral:7b', 'gemma2:9b'],
	},
	{
		name: 'ollama-cloud',
		displayName: 'Ollama Cloud',
		hint: 'hosted Ollama',
		defaultModel: 'llama3.1:8b',
		defaultBaseUrl: 'https://api.ollama.cloud',
		requiresApiKey: true,
		curatedModels: ['llama3.1:8b', 'llama3.1:70b', 'qwen2.5:7b', 'mistral:7b', 'gemma2:9b'],
	},
	{
		name: 'lmstudio',
		displayName: 'LM Studio (local)',
		hint: 'GUI',
		defaultModel: 'local-model',
		defaultBaseUrl: 'http://localhost:1234/v1',
		requiresApiKey: false,
		curatedModels: ['local-model'],
	},
	{
		name: 'llamacpp',
		displayName: 'llama.cpp server',
		hint: 'CLI',
		defaultModel: 'local-model',
		defaultBaseUrl: 'http://localhost:8080/v1',
		requiresApiKey: false,
		curatedModels: ['local-model'],
	},
	{
		name: 'openai-compatible',
		displayName: 'OpenAI-compatible (custom URL)',
		hint: 'any URL',
		defaultModel: 'gpt-4o-mini',
		requiresApiKey: true,
		curatedModels: ['gpt-4o-mini'],
	},
];

export const EMBED_PROVIDERS: WebEmbedProviderMeta[] = [
	{
		name: 'openai',
		displayName: 'OpenAI',
		hint: 'recommended',
		defaultModel: 'text-embedding-3-small',
		defaultBaseUrl: 'https://api.openai.com/v1',
		requiresApiKey: true,
		curatedModels: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'],
	},
	{
		name: 'openrouter',
		displayName: 'OpenRouter',
		hint: 'many models',
		defaultModel: 'openai/text-embedding-3-small',
		defaultBaseUrl: 'https://openrouter.ai/api/v1',
		requiresApiKey: true,
		curatedModels: [
			'openai/text-embedding-3-small',
			'openai/text-embedding-3-large',
			'voyage/voyage-3',
		],
	},
	{
		name: 'voyage',
		displayName: 'Voyage AI',
		hint: 'best for RAG',
		defaultModel: 'voyage-3',
		defaultBaseUrl: 'https://api.voyageai.com/v1',
		requiresApiKey: true,
		curatedModels: ['voyage-3', 'voyage-3-lite', 'voyage-3-large'],
	},
	{
		name: 'cohere',
		displayName: 'Cohere',
		hint: 'native API',
		defaultModel: 'embed-english-v3.0',
		defaultBaseUrl: 'https://api.cohere.ai',
		requiresApiKey: true,
		curatedModels: ['embed-english-v3.0', 'embed-multilingual-v3.0', 'embed-english-light-v3.0'],
	},
	{
		name: 'mistral',
		displayName: 'Mistral',
		hint: 'one strong model',
		defaultModel: 'mistral-embed',
		defaultBaseUrl: 'https://api.mistral.ai/v1',
		requiresApiKey: true,
		curatedModels: ['mistral-embed'],
	},
	{
		name: 'jina',
		displayName: 'Jina AI',
		hint: 'multilingual',
		defaultModel: 'jina-embeddings-v3',
		defaultBaseUrl: 'https://api.jina.ai/v1',
		requiresApiKey: true,
		curatedModels: ['jina-embeddings-v3', 'jina-embeddings-v2-base-en'],
	},
	{
		name: 'nomic',
		displayName: 'Nomic Atlas',
		hint: 'open weights',
		defaultModel: 'nomic-embed-text-v1.5',
		defaultBaseUrl: 'https://api-atlas.nomic.ai/v1',
		requiresApiKey: true,
		curatedModels: ['nomic-embed-text-v1.5', 'nomic-embed-text-v1.0'],
	},
	{
		name: 'together',
		displayName: 'Together AI',
		hint: 'open models',
		defaultModel: 'togethercomputer/m2-bert-80M-8k-retrieval',
		defaultBaseUrl: 'https://api.together.xyz/v1',
		requiresApiKey: true,
		curatedModels: ['togethercomputer/m2-bert-80M-8k-retrieval', 'BAAI/bge-large-en-v1.5'],
	},
	{
		name: 'ollama',
		displayName: 'Ollama (local)',
		hint: 'free',
		defaultModel: 'nomic-embed-text',
		defaultBaseUrl: 'http://localhost:11434',
		requiresApiKey: false,
		curatedModels: ['nomic-embed-text', 'mxbai-embed-large', 'all-minilm'],
	},
	{
		name: 'ollama-cloud',
		displayName: 'Ollama Cloud',
		hint: 'hosted Ollama',
		defaultModel: 'nomic-embed-text',
		defaultBaseUrl: 'https://api.ollama.cloud',
		requiresApiKey: true,
		curatedModels: ['nomic-embed-text', 'mxbai-embed-large', 'all-minilm'],
	},
	{
		name: 'lmstudio',
		displayName: 'LM Studio (local)',
		hint: 'GUI',
		defaultModel: 'text-embedding-nomic-embed-text-v1.5',
		defaultBaseUrl: 'http://localhost:1234/v1',
		requiresApiKey: false,
		curatedModels: ['text-embedding-nomic-embed-text-v1.5'],
	},
	{
		name: 'llamacpp',
		displayName: 'llama.cpp server',
		hint: 'CLI',
		defaultModel: 'local-model',
		defaultBaseUrl: 'http://localhost:8080/v1',
		requiresApiKey: false,
		curatedModels: ['local-model'],
	},
	{
		name: 'openai-compatible',
		displayName: 'OpenAI-compatible (custom URL)',
		hint: 'any URL',
		defaultModel: 'text-embedding-3-small',
		requiresApiKey: true,
		curatedModels: ['text-embedding-3-small'],
	},
];

/** Quick lookup by provider name. */
export function getLlmProviderMeta(name: string): WebLlmProviderMeta | undefined {
	return LLM_PROVIDERS.find((p) => p.name === name);
}

export function getEmbedProviderMeta(name: string): WebEmbedProviderMeta | undefined {
	return EMBED_PROVIDERS.find((p) => p.name === name);
}
