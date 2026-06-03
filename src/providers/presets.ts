/**
 * Provider presets.
 *
 * Every named provider grotto ships with is described here: its default
 * base URL, default model, curated model list (used when the provider's
 * /models endpoint is unreachable), any extra headers the API needs
 * (OpenRouter attribution, etc.), and the env-var names that should be
 * checked for the API key.
 *
 * This file is the single source of truth. The LLM and embed factories
 * (`llm/index.ts`, `embed/index.ts`) read from here to spin up the right
 * provider class with the right defaults. The CLI init wizard and the
 * web settings sheet both use it to populate their provider pickers.
 *
 * Adding a new provider is (almost always) a single entry here.
 */

export interface PresetBase {
	/** Provider name as it appears in the TOML config. Must be unique. */
	name: string;
	/** Human-readable name for menus and titles. */
	displayName: string;
	/** Default API base URL. If undefined, the user must supply one. */
	defaultBaseUrl?: string;
	/** Does the provider need an API key? Ollama and local servers don't. */
	requiresApiKey: boolean;
	/**
	 * Env-var names to check for the API key, in order, before falling back
	 * to the `apiKey` field in TOML. The first non-empty value wins.
	 * GROTTO_API_KEY and OPENAI_API_KEY are checked separately by the
	 * resolver and don't need to be repeated here.
	 */
	envVars?: string[];
	/** Extra headers to send with every request. */
	extraHeaders?: Record<string, string>;
	/** Short description for the CLI / web picker. */
	hint?: string;
	/** Longer description for the README / docs. */
	description?: string;
}

export interface LlmPreset extends PresetBase {
	defaultLlmModel: string;
	/** Curated fallback model list, used when the /models endpoint is down. */
	curatedModels: string[];
}

export interface EmbedPreset extends PresetBase {
	defaultEmbedModel: string;
	curatedModels: string[];
	/** Vector dimensionality of the default model. Used to size the index. */
	defaultDimensions?: number;
	/** Whether the API needs a special input/encoding parameter. */
	inputType?: 'search_document' | 'search_query' | null;
}

// ---------------------------------------------------------------------------
// LLM presets
// ---------------------------------------------------------------------------

export const LLM_PRESETS: Record<string, LlmPreset> = {
	openai: {
		name: 'openai',
		displayName: 'OpenAI',
		defaultBaseUrl: 'https://api.openai.com/v1',
		requiresApiKey: true,
		defaultLlmModel: 'gpt-4o-mini',
		curatedModels: [
			'gpt-4o-mini',
			'gpt-4o',
			'gpt-4.1',
			'gpt-4.1-mini',
			'o4-mini',
			'o3',
			'gpt-5',
			'gpt-5-mini',
		],
		hint: 'BYOK · recommended',
		description: "OpenAI's API. The default cloud provider.",
	},

	openrouter: {
		name: 'openrouter',
		displayName: 'OpenRouter',
		defaultBaseUrl: 'https://openrouter.ai/api/v1',
		requiresApiKey: true,
		envVars: ['OPENROUTER_API_KEY'],
		// OpenRouter asks for these for attribution. Values are placeholders;
		// users can override via TOML if they want their own site listed.
		extraHeaders: {
			'HTTP-Referer': 'https://github.com/USER/grotto',
			'X-Title': 'grotto',
		},
		defaultLlmModel: 'anthropic/claude-3.5-sonnet',
		curatedModels: [
			'anthropic/claude-3.5-sonnet',
			'anthropic/claude-3.5-haiku',
			'anthropic/claude-3-opus',
			'openai/gpt-4o-mini',
			'openai/gpt-4o',
			'google/gemini-pro-1.5',
			'meta-llama/llama-3.1-70b-instruct',
			'meta-llama/llama-3.1-8b-instruct',
			'mistralai/mistral-large-latest',
			'qwen/qwen-2.5-72b-instruct',
		],
		hint: '100+ models · one key',
		description:
			'OpenRouter routes requests to many providers via an OpenAI-compatible API. One key, many models.',
	},

	anthropic: {
		name: 'anthropic',
		displayName: 'Anthropic',
		defaultBaseUrl: 'https://api.anthropic.com',
		requiresApiKey: true,
		envVars: ['ANTHROPIC_API_KEY'],
		defaultLlmModel: 'claude-3-5-sonnet-latest',
		curatedModels: [
			'claude-3-5-sonnet-latest',
			'claude-3-5-haiku-latest',
			'claude-3-opus-latest',
			'claude-3-7-sonnet-latest',
		],
		hint: 'Claude · native API',
		description: "Anthropic's Claude models via their native Messages API.",
	},

	ollama: {
		name: 'ollama',
		displayName: 'Ollama (local)',
		defaultBaseUrl: 'http://localhost:11434',
		requiresApiKey: false,
		defaultLlmModel: 'llama3.1:8b',
		curatedModels: [
			'llama3.1:8b',
			'llama3.1:70b',
			'llama3.3:70b',
			'qwen2.5:7b',
			'mistral:7b',
			'gemma2:9b',
			'phi3:medium',
			'deepseek-r1:8b',
		],
		hint: 'local · free · private',
		description: 'Run models locally with Ollama. No API key, no data leaves your machine.',
	},

	'ollama-cloud': {
		name: 'ollama-cloud',
		displayName: 'Ollama Cloud',
		defaultBaseUrl: 'https://api.ollama.cloud',
		requiresApiKey: true,
		envVars: ['OLLAMA_API_KEY', 'OLLAMA_CLOUD_API_KEY'],
		defaultLlmModel: 'llama3.1:8b',
		curatedModels: [
			'llama3.1:8b',
			'llama3.1:70b',
			'qwen2.5:7b',
			'mistral:7b',
			'gemma2:9b',
			'deepseek-r1:8b',
		],
		hint: 'hosted Ollama',
		description:
			"Ollama's hosted cloud service — same model catalog as local Ollama, but no GPU needed.",
	},

	groq: {
		name: 'groq',
		displayName: 'Groq',
		defaultBaseUrl: 'https://api.groq.com/openai/v1',
		requiresApiKey: true,
		envVars: ['GROQ_API_KEY'],
		defaultLlmModel: 'llama-3.1-70b-versatile',
		curatedModels: [
			'llama-3.1-70b-versatile',
			'llama-3.1-8b-instant',
			'llama-3.3-70b-versatile',
			'mixtral-8x7b-32768',
			'gemma2-9b-it',
		],
		hint: 'fast inference',
		description: 'Groq runs models on custom LPU hardware. Extremely fast token generation.',
	},

	together: {
		name: 'together',
		displayName: 'Together AI',
		defaultBaseUrl: 'https://api.together.xyz/v1',
		requiresApiKey: true,
		envVars: ['TOGETHER_API_KEY'],
		defaultLlmModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
		curatedModels: [
			'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
			'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
			'mistralai/Mixtral-8x7B-Instruct-v0.1',
			'Qwen/Qwen2.5-72B-Instruct-Turbo',
			'google/gemma-2-9b-it',
		],
		hint: 'open models',
		description: 'Together AI hosts a wide catalog of open models with OpenAI-compatible API.',
	},

	mistral: {
		name: 'mistral',
		displayName: 'Mistral',
		defaultBaseUrl: 'https://api.mistral.ai/v1',
		requiresApiKey: true,
		envVars: ['MISTRAL_API_KEY'],
		defaultLlmModel: 'mistral-large-latest',
		curatedModels: [
			'mistral-large-latest',
			'mistral-medium-latest',
			'mistral-small-latest',
			'open-mistral-7b',
			'open-mixtral-8x7b',
		],
		hint: "Mistral's API",
		description: "Mistral's own API. Hosts their first-party open and commercial models.",
	},

	xai: {
		name: 'xai',
		displayName: 'xAI (Grok)',
		defaultBaseUrl: 'https://api.x.ai/v1',
		requiresApiKey: true,
		envVars: ['XAI_API_KEY', 'GROK_API_KEY'],
		defaultLlmModel: 'grok-2-latest',
		curatedModels: ['grok-2-latest', 'grok-2-mini', 'grok-beta', 'grok-vision-beta'],
		hint: 'Grok models',
		description: "xAI's Grok models via an OpenAI-compatible endpoint.",
	},

	deepseek: {
		name: 'deepseek',
		displayName: 'DeepSeek',
		defaultBaseUrl: 'https://api.deepseek.com/v1',
		requiresApiKey: true,
		envVars: ['DEEPSEEK_API_KEY'],
		defaultLlmModel: 'deepseek-chat',
		curatedModels: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder'],
		hint: 'reasoning + chat',
		description: "DeepSeek's API. Strong reasoning and coding models at very low cost.",
	},

	fireworks: {
		name: 'fireworks',
		displayName: 'Fireworks AI',
		defaultBaseUrl: 'https://api.fireworks.ai/inference/v1',
		requiresApiKey: true,
		envVars: ['FIREWORKS_API_KEY'],
		defaultLlmModel: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
		curatedModels: [
			'accounts/fireworks/models/llama-v3p1-70b-instruct',
			'accounts/fireworks/models/llama-v3p1-8b-instruct',
			'accounts/fireworks/models/mixtral-8x7b-instruct',
			'accounts/fireworks/models/qwen2p5-72b-instruct',
		],
		hint: 'fast open models',
		description: 'Fireworks AI serves open models with very low latency. OpenAI-compatible.',
	},

	perplexity: {
		name: 'perplexity',
		displayName: 'Perplexity',
		defaultBaseUrl: 'https://api.perplexity.ai',
		requiresApiKey: true,
		envVars: ['PERPLEXITY_API_KEY', 'PPLX_API_KEY'],
		defaultLlmModel: 'sonar-pro',
		curatedModels: [
			'sonar-pro',
			'sonar',
			'llama-3.1-sonar-large-128k-online',
			'llama-3.1-sonar-small-128k-online',
		],
		hint: 'web-grounded answers',
		description: "Perplexity's API returns web-grounded answers with citations baked in.",
	},

	cohere: {
		name: 'cohere',
		displayName: 'Cohere',
		defaultBaseUrl: 'https://api.cohere.ai/compatibility/v1',
		requiresApiKey: true,
		envVars: ['COHERE_API_KEY', 'CO_API_KEY'],
		defaultLlmModel: 'command-r-plus',
		curatedModels: ['command-r-plus', 'command-r', 'command', 'command-light'],
		hint: "Cohere's models",
		description: "Cohere's chat models via their OpenAI-compatible endpoint.",
	},

	lmstudio: {
		name: 'lmstudio',
		displayName: 'LM Studio (local)',
		defaultBaseUrl: 'http://localhost:1234/v1',
		requiresApiKey: false,
		defaultLlmModel: 'local-model',
		curatedModels: ['local-model'],
		hint: 'local · GUI',
		description:
			"LM Studio's local OpenAI-compatible server. Spin up a model in the GUI, then point grotto at it.",
	},

	llamacpp: {
		name: 'llamacpp',
		displayName: 'llama.cpp server (local)',
		defaultBaseUrl: 'http://localhost:8080/v1',
		requiresApiKey: false,
		defaultLlmModel: 'local-model',
		curatedModels: ['local-model'],
		hint: 'local · CLI',
		description: 'llama.cpp server with --api. Run any GGUF model behind an OpenAI-compatible API.',
	},

	'openai-compatible': {
		name: 'openai-compatible',
		displayName: 'OpenAI-compatible (custom URL)',
		requiresApiKey: true,
		defaultLlmModel: 'gpt-4o-mini',
		curatedModels: ['gpt-4o-mini'],
		hint: 'BYOK · any URL',
		description:
			'Any service that speaks the OpenAI API. You supply the base URL, grotto does the rest.',
	},
};

// ---------------------------------------------------------------------------
// Embed presets
// ---------------------------------------------------------------------------

export const EMBED_PRESETS: Record<string, EmbedPreset> = {
	openai: {
		name: 'openai',
		displayName: 'OpenAI',
		defaultBaseUrl: 'https://api.openai.com/v1',
		requiresApiKey: true,
		defaultEmbedModel: 'text-embedding-3-small',
		defaultDimensions: 1536,
		curatedModels: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'],
		hint: 'BYOK · recommended',
		description: "OpenAI's embedding models.",
	},

	openrouter: {
		name: 'openrouter',
		displayName: 'OpenRouter',
		defaultBaseUrl: 'https://openrouter.ai/api/v1',
		requiresApiKey: true,
		envVars: ['OPENROUTER_API_KEY'],
		extraHeaders: {
			'HTTP-Referer': 'https://github.com/USER/grotto',
			'X-Title': 'grotto',
		},
		defaultEmbedModel: 'openai/text-embedding-3-small',
		curatedModels: [
			'openai/text-embedding-3-small',
			'openai/text-embedding-3-large',
			'openai/text-embedding-ada-002',
			'voyage/voyage-3',
			'voyage/voyage-3-lite',
			'cohere/embed-english-v3.0',
		],
		hint: 'many embed models',
		description: 'OpenRouter routes embedding requests too.',
	},

	ollama: {
		name: 'ollama',
		displayName: 'Ollama (local)',
		defaultBaseUrl: 'http://localhost:11434',
		requiresApiKey: false,
		defaultEmbedModel: 'nomic-embed-text',
		defaultDimensions: 768,
		curatedModels: ['nomic-embed-text', 'mxbai-embed-large', 'all-minilm'],
		hint: 'local · free',
		description: 'Local embedding models via Ollama.',
	},

	'ollama-cloud': {
		name: 'ollama-cloud',
		displayName: 'Ollama Cloud',
		defaultBaseUrl: 'https://api.ollama.cloud',
		requiresApiKey: true,
		envVars: ['OLLAMA_API_KEY', 'OLLAMA_CLOUD_API_KEY'],
		defaultEmbedModel: 'nomic-embed-text',
		defaultDimensions: 768,
		curatedModels: ['nomic-embed-text', 'mxbai-embed-large', 'all-minilm'],
		hint: 'hosted Ollama',
		description: "Ollama Cloud's hosted embedding models.",
	},

	voyage: {
		name: 'voyage',
		displayName: 'Voyage AI',
		defaultBaseUrl: 'https://api.voyageai.com/v1',
		requiresApiKey: true,
		envVars: ['VOYAGE_API_KEY'],
		defaultEmbedModel: 'voyage-3',
		defaultDimensions: 1024,
		curatedModels: ['voyage-3', 'voyage-3-lite', 'voyage-3-large', 'voyage-code-3'],
		hint: 'best for RAG',
		description: "Voyage AI's embedding models. Top of the MTEB benchmark for retrieval.",
	},

	cohere: {
		name: 'cohere',
		displayName: 'Cohere',
		defaultBaseUrl: 'https://api.cohere.ai',
		requiresApiKey: true,
		envVars: ['COHERE_API_KEY', 'CO_API_KEY'],
		defaultEmbedModel: 'embed-english-v3.0',
		defaultDimensions: 1024,
		// Cohere's embed API requires input_type per request. The provider
		// sets search_document for indexing, search_query for queries.
		inputType: 'search_document',
		curatedModels: [
			'embed-english-v3.0',
			'embed-multilingual-v3.0',
			'embed-english-light-v3.0',
			'embed-multilingual-light-v3.0',
		],
		hint: 'native embed API',
		description:
			"Cohere's embedding models via their native /v1/embed endpoint (different shape from OpenAI).",
	},

	mistral: {
		name: 'mistral',
		displayName: 'Mistral',
		defaultBaseUrl: 'https://api.mistral.ai/v1',
		requiresApiKey: true,
		envVars: ['MISTRAL_API_KEY'],
		defaultEmbedModel: 'mistral-embed',
		defaultDimensions: 1024,
		curatedModels: ['mistral-embed'],
		hint: 'one strong model',
		description: "Mistral's embedding model.",
	},

	jina: {
		name: 'jina',
		displayName: 'Jina AI',
		defaultBaseUrl: 'https://api.jina.ai/v1',
		requiresApiKey: true,
		envVars: ['JINA_API_KEY'],
		defaultEmbedModel: 'jina-embeddings-v3',
		defaultDimensions: 1024,
		curatedModels: ['jina-embeddings-v3', 'jina-embeddings-v2-base-en', 'jina-clip-v2'],
		hint: 'multilingual',
		description: "Jina's embedding models. Strong multilingual support, OpenAI-compatible shape.",
	},

	nomic: {
		name: 'nomic',
		displayName: 'Nomic Atlas',
		defaultBaseUrl: 'https://api-atlas.nomic.ai/v1',
		requiresApiKey: true,
		envVars: ['NOMIC_API_KEY'],
		defaultEmbedModel: 'nomic-embed-text-v1.5',
		defaultDimensions: 768,
		curatedModels: ['nomic-embed-text-v1.5', 'nomic-embed-text-v1.0'],
		hint: 'open weights',
		description: "Nomic's embedding models via their Atlas API.",
	},

	together: {
		name: 'together',
		displayName: 'Together AI',
		defaultBaseUrl: 'https://api.together.xyz/v1',
		requiresApiKey: true,
		envVars: ['TOGETHER_API_KEY'],
		defaultEmbedModel: 'togethercomputer/m2-bert-80M-8k-retrieval',
		defaultDimensions: 768,
		curatedModels: [
			'togethercomputer/m2-bert-80M-8k-retrieval',
			'BAAI/bge-large-en-v1.5',
			'BAAI/bge-base-en-v1.5',
		],
		hint: 'open models',
		description: "Together AI's hosted embedding models.",
	},

	lmstudio: {
		name: 'lmstudio',
		displayName: 'LM Studio (local)',
		defaultBaseUrl: 'http://localhost:1234/v1',
		requiresApiKey: false,
		defaultEmbedModel: 'text-embedding-nomic-embed-text-v1.5',
		defaultDimensions: 768,
		curatedModels: ['text-embedding-nomic-embed-text-v1.5'],
		hint: 'local · GUI',
		description: 'Local embedding models served by LM Studio.',
	},

	llamacpp: {
		name: 'llamacpp',
		displayName: 'llama.cpp server (local)',
		defaultBaseUrl: 'http://localhost:8080/v1',
		requiresApiKey: false,
		defaultEmbedModel: 'local-model',
		curatedModels: ['local-model'],
		hint: 'local · CLI',
		description: 'Embedding models served by llama.cpp server.',
	},

	'openai-compatible': {
		name: 'openai-compatible',
		displayName: 'OpenAI-compatible (custom URL)',
		requiresApiKey: true,
		defaultEmbedModel: 'text-embedding-3-small',
		defaultDimensions: 1536,
		curatedModels: ['text-embedding-3-small'],
		hint: 'BYOK · any URL',
		description: 'Any service that speaks the OpenAI /embeddings endpoint.',
	},
};

// ---------------------------------------------------------------------------
// Lookups & helpers
// ---------------------------------------------------------------------------

/** All known LLM provider names, in the order they should appear in pickers. */
export const LLM_PROVIDER_ORDER: string[] = [
	'openai',
	'openrouter',
	'anthropic',
	'groq',
	'together',
	'mistral',
	'xai',
	'deepseek',
	'fireworks',
	'perplexity',
	'cohere',
	'ollama',
	'ollama-cloud',
	'lmstudio',
	'llamacpp',
	'openai-compatible',
];

/** All known embed provider names, in the order they should appear in pickers. */
export const EMBED_PROVIDER_ORDER: string[] = [
	'openai',
	'openrouter',
	'voyage',
	'cohere',
	'mistral',
	'jina',
	'nomic',
	'together',
	'ollama',
	'ollama-cloud',
	'lmstudio',
	'llamacpp',
	'openai-compatible',
];

/** Is this a known LLM provider name? */
export function isLlmProvider(name: string): name is keyof typeof LLM_PRESETS {
	return Object.hasOwn(LLM_PRESETS, name);
}

/** Is this a known embed provider name? */
export function isEmbedProvider(name: string): name is keyof typeof EMBED_PRESETS {
	return Object.hasOwn(EMBED_PRESETS, name);
}

/**
 * Resolve an API key. Order of precedence:
 *   1. process.env.GROTTO_API_KEY  (universal override)
 *   2. process.env.OPENAI_API_KEY  (back-compat for early adopters)
 *   3. Each name in preset.envVars (provider-specific)
 *   4. The apiKey field from TOML
 *
 * Returns undefined if nothing is set.
 */
export function resolveApiKey(preset: PresetBase, tomlKey: string | undefined): string | undefined {
	if (process.env.GROTTO_API_KEY) return process.env.GROTTO_API_KEY;
	if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
	if (preset.envVars) {
		for (const v of preset.envVars) {
			const value = process.env[v];
			if (value) return value;
		}
	}
	return tomlKey;
}
