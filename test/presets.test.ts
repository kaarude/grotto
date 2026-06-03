import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
	LLM_PRESETS,
	EMBED_PRESETS,
	LLM_PROVIDER_ORDER,
	EMBED_PROVIDER_ORDER,
	isLlmProvider,
	isEmbedProvider,
	resolveApiKey,
} from '../src/providers/presets.js';

describe('presets', () => {
	it('every named LLM provider has required fields', () => {
		for (const [name, p] of Object.entries(LLM_PRESETS)) {
			expect(p.name, `name mismatch: ${name}`).toBe(name);
			expect(p.displayName.length).toBeGreaterThan(0);
			expect(p.defaultLlmModel.length).toBeGreaterThan(0);
			expect(p.curatedModels.length).toBeGreaterThan(0);
			// If it requires a key, it should have a default base URL
			// (or the user is expected to provide one, e.g. openai-compatible).
			if (p.requiresApiKey && p.name !== 'openai-compatible') {
				expect(p.defaultBaseUrl, `${name} needs a defaultBaseUrl`).toBeDefined();
			}
		}
	});

	it('every named embed provider has required fields', () => {
		for (const [name, p] of Object.entries(EMBED_PRESETS)) {
			expect(p.name, `name mismatch: ${name}`).toBe(name);
			expect(p.displayName.length).toBeGreaterThan(0);
			expect(p.defaultEmbedModel.length).toBeGreaterThan(0);
			expect(p.curatedModels.length).toBeGreaterThan(0);
		}
	});

	it('LLM_PROVIDER_ORDER references valid presets', () => {
		for (const name of LLM_PROVIDER_ORDER) {
			expect(LLM_PRESETS[name], `LLM_PROVIDER_ORDER has unknown name: ${name}`).toBeDefined();
		}
	});

	it('EMBED_PROVIDER_ORDER references valid presets', () => {
		for (const name of EMBED_PROVIDER_ORDER) {
			expect(EMBED_PRESETS[name], `EMBED_PROVIDER_ORDER has unknown name: ${name}`).toBeDefined();
		}
	});

	it('isLlmProvider / isEmbedProvider type guards work', () => {
		expect(isLlmProvider('openai')).toBe(true);
		expect(isLlmProvider('anthropic')).toBe(true);
		expect(isLlmProvider('does-not-exist')).toBe(false);

		expect(isEmbedProvider('voyage')).toBe(true);
		expect(isEmbedProvider('cohere')).toBe(true);
		expect(isEmbedProvider('does-not-exist')).toBe(false);
	});

	it('OpenRouter preset adds the attribution headers grotto is expected to send', () => {
		const p = LLM_PRESETS.openrouter!;
		expect(p.extraHeaders).toBeDefined();
		expect(p.extraHeaders?.['HTTP-Referer']).toBeTruthy();
		expect(p.extraHeaders?.['X-Title']).toBe('grotto');
	});
});

describe('resolveApiKey', () => {
	const originalEnv = { ...process.env };
	afterEach(() => {
		// Reset relevant env vars between tests.
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
		delete process.env.GROTTO_API_KEY;
		delete process.env.OPENAI_API_KEY;
		delete process.env.ANTHROPIC_API_KEY;
		delete process.env.OPENROUTER_API_KEY;
		delete process.env.OLLAMA_API_KEY;
	});

	it('returns GROTTO_API_KEY first (universal override)', () => {
		process.env.GROTTO_API_KEY = 'universal';
		process.env.ANTHROPIC_API_KEY = 'provider-specific';
		const preset = LLM_PRESETS.anthropic!;
		expect(resolveApiKey(preset, 'toml-key')).toBe('universal');
	});

	it('falls back to OPENAI_API_KEY (back-compat)', () => {
		process.env.OPENAI_API_KEY = 'openai';
		const preset = LLM_PRESETS.openrouter!;
		expect(resolveApiKey(preset, 'toml-key')).toBe('openai');
	});

	it('falls back to provider-specific env var', () => {
		process.env.ANTHROPIC_API_KEY = 'anthropic-key';
		const preset = LLM_PRESETS.anthropic!;
		expect(resolveApiKey(preset, 'toml-key')).toBe('anthropic-key');
	});

	it('falls back to TOML apiKey last', () => {
		const preset = LLM_PRESETS.openrouter!;
		expect(resolveApiKey(preset, 'toml-key')).toBe('toml-key');
	});

	it('returns undefined if nothing is set', () => {
		const preset = LLM_PRESETS.openrouter!;
		expect(resolveApiKey(preset, undefined)).toBeUndefined();
	});

	it('checks every env var in preset.envVars in order', () => {
		// OpenRouter has ['OPENROUTER_API_KEY'] in envVars.
		process.env.OPENROUTER_API_KEY = 'openrouter';
		const preset = LLM_PRESETS.openrouter!;
		expect(resolveApiKey(preset, undefined)).toBe('openrouter');
	});
});
