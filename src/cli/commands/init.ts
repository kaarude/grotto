import * as p from '@clack/prompts';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { saveConfig, type GrottoConfig } from '../../core/config.js';
import { paths, ensureDirs } from '../../util/paths.js';
import { createLLMProvider } from '../../providers/llm/index.js';
import { createEmbedProvider } from '../../providers/embed/index.js';
import {
	LLM_PRESETS,
	EMBED_PRESETS,
	LLM_PROVIDER_ORDER,
	EMBED_PROVIDER_ORDER,
} from '../../providers/presets.js';

function expandPath(p: string): string {
	if (p.startsWith('~')) return homedir() + p.slice(1);
	return p;
}

export async function initCommand(): Promise<void> {
	p.intro('grotto · first-time setup');

	ensureDirs();

	// 1. Notes folder
	const notesPath = await p.text({
		message: 'Where are your notes?',
		placeholder: '~/Documents/notes',
		validate: (v) => {
			if (!v) return 'Please enter a path';
			const expanded = expandPath(v);
			if (!existsSync(expanded)) {
				return `Directory does not exist: ${expanded}\n(Create it first, then run grotto init again.)`;
			}
			return undefined;
		},
	});
	if (p.isCancel(notesPath)) {
		p.cancel('Setup cancelled.');
		process.exit(0);
	}

	// 2. Embedding provider
	const embedProvider = await p.select({
		message: 'Embedding provider?',
		options: embedProviderOptions(),
		initialValue: 'openai',
	});
	if (p.isCancel(embedProvider)) {
		p.cancel('Setup cancelled.');
		process.exit(0);
	}

	const embedConfig = await configureEmbedProvider(embedProvider as string);
	if (!embedConfig) {
		p.cancel('Setup cancelled.');
		process.exit(0);
	}

	// 3. LLM provider
	const llmProvider = await p.select({
		message: 'Chat (LLM) provider?',
		options: llmProviderOptions(),
		initialValue: 'openai',
	});
	if (p.isCancel(llmProvider)) {
		p.cancel('Setup cancelled.');
		process.exit(0);
	}

	const llmConfig = await configureLlmProvider(llmProvider as string);
	if (!llmConfig) {
		p.cancel('Setup cancelled.');
		process.exit(0);
	}

	// 4. Build config
	const config: GrottoConfig = {
		version: 1,
		notes: {
			paths: [resolve(expandPath(notesPath as string))],
			ignore: ['**/node_modules/**', '**/.git/**', '**/.DS_Store'],
		},
		embed: embedConfig,
		llm: llmConfig,
		chat: { topK: 5, temperature: 0.3 },
	};

	// 5. Validate connections
	const spinner = p.spinner();
	spinner.start('Validating connections…');
	const llm = createLLMProvider(config);
	const emb = createEmbedProvider(config);
	const [llmRes, embRes] = await Promise.all([llm.validateConnection(), emb.validateConnection()]);

	if (!llmRes.ok || !embRes.ok) {
		spinner.stop('Some connections failed');
		if (!llmRes.ok) p.log.error(`LLM: ${llmRes.error}`);
		if (!embRes.ok) p.log.error(`Embed: ${embRes.error}`);
		const proceed = await p.confirm({
			message: 'Save config anyway? (You can fix providers later with `grotto config`.)',
		});
		if (p.isCancel(proceed) || !proceed) {
			p.cancel('Setup cancelled.');
			process.exit(0);
		}
	} else {
		spinner.stop('All providers connected ✓');
		if (llmRes.models)
			p.log.info(
				`LLM models: ${llmRes.models.slice(0, 5).join(', ')}${llmRes.models.length > 5 ? '…' : ''}`,
			);
		if (embRes.models)
			p.log.info(
				`Embed models: ${embRes.models.slice(0, 5).join(', ')}${embRes.models.length > 5 ? '…' : ''}`,
			);
	}

	// 6. Save
	saveConfig(config);
	p.log.success(`Config saved to ${paths.configFile}`);

	p.outro(
		`All set! Next: run \`grotto add\` to index your notes, then \`grotto chat\` to talk to them.`,
	);
}

/**
 * Build the option list for the LLM provider picker. Group similar
 * providers visually with `hint`s, ordered by popularity.
 */
function llmProviderOptions(): { value: string; label: string; hint?: string }[] {
	return LLM_PROVIDER_ORDER.filter((n) => LLM_PRESETS[n]).map((name) => {
		const preset = LLM_PRESETS[name]!;
		return {
			value: name,
			label: preset.displayName,
			hint: preset.hint,
		};
	});
}

function embedProviderOptions(): { value: string; label: string; hint?: string }[] {
	return EMBED_PROVIDER_ORDER.filter((n) => EMBED_PRESETS[n]).map((name) => {
		const preset = EMBED_PRESETS[name]!;
		return {
			value: name,
			label: preset.displayName,
			hint: preset.hint,
		};
	});
}

/**
 * Walk the user through whatever fields the chosen provider needs.
 *
 * For local providers (Ollama, LM Studio, llama.cpp), we ask for the
 * base URL and skip the API key.
 * For cloud providers with a known default model, we ask for the model
 * (pre-filled), an optional base URL (the preset default is used if
 * blank), and an API key (pre-filled from env if present).
 * For the generic "openai-compatible" we ask for both base URL and key.
 */
async function configureLlmProvider(provider: string): Promise<GrottoConfig['llm'] | null> {
	const preset = LLM_PRESETS[provider];
	if (!preset) {
		p.log.error(`Unknown LLM provider: ${provider}`);
		process.exit(1);
	}

	// Local / no-key providers.
	if (!preset.requiresApiKey) {
		const baseUrl = await p.text({
			message: `${preset.displayName} base URL?`,
			placeholder: preset.defaultBaseUrl,
			initialValue: preset.defaultBaseUrl,
			validate: (v) => (v?.startsWith('http') ? undefined : 'Must start with http(s)://'),
		});
		if (p.isCancel(baseUrl)) return null;
		const model = await p.text({
			message: 'Model?',
			placeholder: preset.defaultLlmModel,
			initialValue: preset.defaultLlmModel,
		});
		if (p.isCancel(model)) return null;
		return {
			provider: provider as GrottoConfig['llm']['provider'],
			model: model as string,
			baseUrl: baseUrl as string,
		};
	}

	// Cloud / key-required providers.
	const baseUrl = await p.text({
		message: 'API base URL? (leave empty for default)',
		placeholder: preset.defaultBaseUrl ?? 'https://...',
		validate: () => undefined,
	});
	if (p.isCancel(baseUrl)) return null;

	const envKey = pickEnvKey(preset.envVars);
	let apiKey: string;
	if (envKey) {
		p.log.info(`Using API key from environment (${envKey.slice(0, 7)}…)`);
		apiKey = envKey;
	} else {
		const entered = await p.password({
			message: `API key for ${preset.displayName}? (or set ${preset.envVars?.[0] ?? 'GROTTO_API_KEY'} in your shell)`,
			validate: (v) => (v ? undefined : 'Required'),
		});
		if (p.isCancel(entered)) return null;
		apiKey = entered as string;
	}

	const model = await p.text({
		message: 'Model?',
		placeholder: preset.defaultLlmModel,
		initialValue: preset.defaultLlmModel,
	});
	if (p.isCancel(model)) return null;

	return {
		provider: provider as GrottoConfig['llm']['provider'],
		model: model as string,
		baseUrl: (baseUrl as string) || undefined,
		apiKey,
	};
}

async function configureEmbedProvider(provider: string): Promise<GrottoConfig['embed'] | null> {
	const preset = EMBED_PRESETS[provider];
	if (!preset) {
		p.log.error(`Unknown embed provider: ${provider}`);
		process.exit(1);
	}

	if (!preset.requiresApiKey) {
		const baseUrl = await p.text({
			message: `${preset.displayName} base URL?`,
			placeholder: preset.defaultBaseUrl,
			initialValue: preset.defaultBaseUrl,
			validate: (v) => (v?.startsWith('http') ? undefined : 'Must start with http(s)://'),
		});
		if (p.isCancel(baseUrl)) return null;
		const model = await p.text({
			message: 'Model?',
			placeholder: preset.defaultEmbedModel,
			initialValue: preset.defaultEmbedModel,
		});
		if (p.isCancel(model)) return null;
		return {
			provider: provider as GrottoConfig['embed']['provider'],
			model: model as string,
			baseUrl: baseUrl as string,
		};
	}

	const baseUrl = await p.text({
		message: 'API base URL? (leave empty for default)',
		placeholder: preset.defaultBaseUrl ?? 'https://...',
		validate: () => undefined,
	});
	if (p.isCancel(baseUrl)) return null;

	const envKey = pickEnvKey(preset.envVars);
	let apiKey: string;
	if (envKey) {
		p.log.info(`Using API key from environment (${envKey.slice(0, 7)}…)`);
		apiKey = envKey;
	} else {
		const entered = await p.password({
			message: `API key for ${preset.displayName}? (or set ${preset.envVars?.[0] ?? 'GROTTO_API_KEY'} in your shell)`,
			validate: (v) => (v ? undefined : 'Required'),
		});
		if (p.isCancel(entered)) return null;
		apiKey = entered as string;
	}

	const model = await p.text({
		message: 'Model?',
		placeholder: preset.defaultEmbedModel,
		initialValue: preset.defaultEmbedModel,
	});
	if (p.isCancel(model)) return null;

	return {
		provider: provider as GrottoConfig['embed']['provider'],
		model: model as string,
		baseUrl: (baseUrl as string) || undefined,
		apiKey,
	};
}

function pickEnvKey(envVars: string[] | undefined): string | undefined {
	if (process.env.GROTTO_API_KEY) return process.env.GROTTO_API_KEY;
	if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
	if (!envVars) return undefined;
	for (const v of envVars) {
		const value = process.env[v];
		if (value) return value;
	}
	return undefined;
}
