import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createLLMProvider } from '../src/providers/llm/index.js';
import { createEmbedProvider } from '../src/providers/embed/index.js';
import type { GrottoConfig } from '../src/core/config.js';

function makeConfig(overrides: Partial<GrottoConfig['llm']>): GrottoConfig {
	return {
		version: 1,
		notes: { paths: [''], ignore: [] },
		embed: { provider: 'openai', model: 'fake' },
		llm: { provider: 'openai', model: 'fake', ...overrides },
		chat: { topK: 3, temperature: 0 },
	};
}

function makeEmbedConfig(overrides: Partial<GrottoConfig['embed']>): GrottoConfig {
	return {
		version: 1,
		notes: { paths: [''], ignore: [] },
		embed: { provider: 'openai', model: 'fake', ...overrides },
		llm: { provider: 'openai', model: 'fake' },
		chat: { topK: 3, temperature: 0 },
	};
}

describe('createLLMProvider', () => {
	const originalEnv = { ...process.env };
	afterEach(() => {
		for (const k of [
			'GROTTO_API_KEY',
			'OPENAI_API_KEY',
			'ANTHROPIC_API_KEY',
			'OPENROUTER_API_KEY',
			'OLLAMA_API_KEY',
		]) {
			if (originalEnv[k] === undefined) delete process.env[k];
			else process.env[k] = originalEnv[k];
		}
	});
	beforeEach(() => {
		for (const k of Object.keys(process.env)) {
			if (k.startsWith('GROTTO_') || k.endsWith('_API_KEY') || k === 'OPENAI_API_KEY') {
				delete (process.env as Record<string, string | undefined>)[k];
			}
		}
	});

	it('builds an OllamaLLM for provider=ollama (no key needed)', () => {
		const p = createLLMProvider(
			makeConfig({ provider: 'ollama', baseUrl: 'http://localhost:11434' }),
		);
		expect(p.info.name).toBe('ollama');
		expect(p.info.requiresApiKey).toBe(false);
	});

	it('builds an OllamaLLM (cloud) for provider=ollama-cloud', () => {
		process.env.OLLAMA_API_KEY = 'cloud-key';
		const p = createLLMProvider(
			makeConfig({ provider: 'ollama-cloud', baseUrl: 'https://api.ollama.cloud' }),
		);
		expect(p.info.name).toBe('ollama-cloud');
		expect(p.info.requiresApiKey).toBe(true);
	});

	it('builds an AnthropicLLM for provider=anthropic', () => {
		process.env.ANTHROPIC_API_KEY = 'ant-key';
		const p = createLLMProvider(makeConfig({ provider: 'anthropic' }));
		expect(p.info.name).toBe('anthropic');
		expect(p.info.requiresApiKey).toBe(true);
	});

	it('builds an OpenAICompatibleLLM for provider=openai', () => {
		process.env.OPENAI_API_KEY = 'sk-test';
		const p = createLLMProvider(makeConfig({ provider: 'openai' }));
		expect(p.info.name).toBe('openai');
	});

	it('builds an OpenAICompatibleLLM for provider=openrouter with attribution headers', () => {
		process.env.OPENROUTER_API_KEY = 'or-key';
		const p = createLLMProvider(makeConfig({ provider: 'openrouter' }));
		expect(p.info.name).toBe('openrouter');
		// defaultBaseUrl should come from the preset
		expect(p.info.defaultBaseUrl).toBe('https://openrouter.ai/api/v1');
	});

	it('builds an OpenAICompatibleLLM for every preset name', () => {
		// Smoke test: every cloud provider can be constructed given an env key.
		const envVarByProvider: Record<string, string> = {
			openai: 'OPENAI_API_KEY',
			openrouter: 'OPENROUTER_API_KEY',
			groq: 'GROQ_API_KEY',
			together: 'TOGETHER_API_KEY',
			mistral: 'MISTRAL_API_KEY',
			xai: 'XAI_API_KEY',
			deepseek: 'DEEPSEEK_API_KEY',
			fireworks: 'FIREWORKS_API_KEY',
			perplexity: 'PERPLEXITY_API_KEY',
			cohere: 'COHERE_API_KEY',
		};
		for (const [provider, env] of Object.entries(envVarByProvider)) {
			process.env[env] = `test-${provider}`;
			const p = createLLMProvider(makeConfig({ provider }));
			expect(p.info.name).toBe(provider);
		}
	});

	it('throws a helpful error when an API key is missing', () => {
		expect(() => createLLMProvider(makeConfig({ provider: 'openai' }))).toThrow(
			/LLM provider "openai" requires an API key/,
		);
	});

	it('suggests provider-specific env vars in error messages', () => {
		// Groq expects GROQ_API_KEY; without one, the error should mention it.
		expect(() => createLLMProvider(makeConfig({ provider: 'groq' }))).toThrow(/GROQ_API_KEY/);
	});

	it('throws for an unknown provider name', () => {
		// Force the schema to accept it so we can test the factory's error path.
		const bad = makeConfig({ provider: 'openai' });
		(bad.llm as { provider: string }).provider = 'does-not-exist';
		expect(() => createLLMProvider(bad)).toThrow(/Unknown LLM provider/);
	});

	it('GROTTO_API_KEY works as a universal override', () => {
		process.env.GROTTO_API_KEY = 'universal';
		// No OPENAI_API_KEY, no ANTHROPIC_API_KEY — GROTTO_API_KEY should win.
		const p = createLLMProvider(makeConfig({ provider: 'anthropic' }));
		expect(p.info.name).toBe('anthropic');
	});

	it('local providers (LM Studio, llama.cpp) do not require a key', () => {
		const lm = createLLMProvider(
			makeConfig({ provider: 'lmstudio', baseUrl: 'http://localhost:1234/v1' }),
		);
		expect(lm.info.name).toBe('lmstudio');
		const lc = createLLMProvider(
			makeConfig({ provider: 'llamacpp', baseUrl: 'http://localhost:8080/v1' }),
		);
		expect(lc.info.name).toBe('llamacpp');
	});
});

describe('createEmbedProvider', () => {
	const originalEnv = { ...process.env };
	afterEach(() => {
		for (const k of [
			'GROTTO_API_KEY',
			'OPENAI_API_KEY',
			'VOYAGE_API_KEY',
			'COHERE_API_KEY',
			'MISTRAL_API_KEY',
			'JINA_API_KEY',
			'NOMIC_API_KEY',
			'TOGETHER_API_KEY',
			'OLLAMA_API_KEY',
		]) {
			if (originalEnv[k] === undefined) delete process.env[k];
			else process.env[k] = originalEnv[k];
		}
	});
	beforeEach(() => {
		for (const k of Object.keys(process.env)) {
			if (k.startsWith('GROTTO_') || k.endsWith('_API_KEY') || k === 'OPENAI_API_KEY') {
				delete (process.env as Record<string, string | undefined>)[k];
			}
		}
	});

	it('builds an OllamaEmbed for provider=ollama', () => {
		const p = createEmbedProvider(
			makeEmbedConfig({ provider: 'ollama', baseUrl: 'http://localhost:11434' }),
		);
		expect(p.info.name).toBe('ollama');
	});

	it('builds an OllamaEmbed (cloud) for provider=ollama-cloud', () => {
		process.env.OLLAMA_API_KEY = 'cloud-key';
		const p = createEmbedProvider(makeEmbedConfig({ provider: 'ollama-cloud' }));
		expect(p.info.name).toBe('ollama-cloud');
	});

	it('builds a CohereEmbed (native API) for provider=cohere', () => {
		process.env.COHERE_API_KEY = 'cohere-key';
		const p = createEmbedProvider(makeEmbedConfig({ provider: 'cohere' }));
		expect(p.info.name).toBe('cohere');
		// Cohere's default base URL is the native endpoint, not the OpenAI-compat one.
		expect(p.info.defaultBaseUrl).toBe('https://api.cohere.ai');
	});

	it('builds an OpenAICompatibleEmbed for every other preset', () => {
		const envVarByProvider: Record<string, string> = {
			openai: 'OPENAI_API_KEY',
			openrouter: 'OPENROUTER_API_KEY',
			voyage: 'VOYAGE_API_KEY',
			mistral: 'MISTRAL_API_KEY',
			jina: 'JINA_API_KEY',
			nomic: 'NOMIC_API_KEY',
			together: 'TOGETHER_API_KEY',
		};
		for (const [provider, env] of Object.entries(envVarByProvider)) {
			process.env[env] = `test-${provider}`;
			const p = createEmbedProvider(makeEmbedConfig({ provider }));
			expect(p.info.name).toBe(provider);
		}
	});

	it('throws a helpful error when a key is missing', () => {
		expect(() => createEmbedProvider(makeEmbedConfig({ provider: 'voyage' }))).toThrow(
			/Embed provider "voyage" requires an API key/,
		);
	});
});
