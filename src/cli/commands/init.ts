import * as p from '@clack/prompts';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { saveConfig, type GrottoConfig } from '../../core/config.js';
import { paths, ensureDirs } from '../../util/paths.js';
import { createLLMProvider } from '../../providers/llm/index.js';
import { createEmbedProvider } from '../../providers/embed/index.js';

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
		options: [
			{ value: 'openai', label: 'OpenAI-compatible API', hint: 'BYOK · recommended' },
			{ value: 'ollama', label: 'Ollama', hint: 'local · free · private' },
		],
	});
	if (p.isCancel(embedProvider)) {
		p.cancel('Setup cancelled.');
		process.exit(0);
	}

	const embedConfig = await configureProvider(embedProvider, 'embedding');
	if (!embedConfig) {
		p.cancel('Setup cancelled.');
		process.exit(0);
	}

	// 3. LLM provider
	const llmProvider = await p.select({
		message: 'Chat (LLM) provider?',
		options: [
			{ value: 'openai', label: 'OpenAI-compatible API', hint: 'BYOK · recommended' },
			{ value: 'ollama', label: 'Ollama', hint: 'local · free · private' },
		],
	});
	if (p.isCancel(llmProvider)) {
		p.cancel('Setup cancelled.');
		process.exit(0);
	}

	const llmConfig = await configureProvider(llmProvider, 'chat');
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

async function configureProvider(
	provider: 'ollama' | 'openai',
	kind: 'embedding' | 'chat',
): Promise<GrottoConfig['embed'] | GrottoConfig['llm'] | null> {
	if (provider === 'ollama') {
		const baseUrl = await p.text({
			message: 'Ollama base URL?',
			placeholder: 'http://localhost:11434',
			initialValue: 'http://localhost:11434',
			validate: (v) => (v?.startsWith('http') ? undefined : 'Must start with http(s)://'),
		});
		if (p.isCancel(baseUrl)) return null;

		const model = await p.text({
			message: `${kind} model?`,
			placeholder: kind === 'embedding' ? 'nomic-embed-text' : 'llama3.1:8b',
			initialValue: kind === 'embedding' ? 'nomic-embed-text' : 'llama3.1:8b',
		});
		if (p.isCancel(model)) return null;

		return {
			provider: 'ollama',
			model: model as string,
			baseUrl: baseUrl as string,
		};
	}

	// openai-compatible
	const baseUrl = await p.text({
		message: 'API base URL? (leave empty for OpenAI)',
		placeholder: 'https://api.openai.com/v1',
		validate: () => undefined, // optional
	});
	if (p.isCancel(baseUrl)) return null;

	// Prefer env var — never makes it onto disk that way.
	const envKey = process.env.GROTTO_API_KEY ?? process.env.OPENAI_API_KEY;
	let apiKey: string;
	if (envKey) {
		p.log.info(`Using API key from environment (${envKey.slice(0, 7)}…)`);
		apiKey = envKey;
	} else {
		const entered = await p.password({
			message: 'API key? (or set OPENAI_API_KEY / GROTTO_API_KEY in your shell)',
			validate: (v) => (v ? undefined : 'Required'),
		});
		if (p.isCancel(entered)) return null;
		apiKey = entered as string;
	}

	const model = await p.text({
		message: `${kind} model?`,
		placeholder: kind === 'embedding' ? 'text-embedding-3-small' : 'gpt-4o-mini',
		initialValue: kind === 'embedding' ? 'text-embedding-3-small' : 'gpt-4o-mini',
	});
	if (p.isCancel(model)) return null;

	return {
		provider: 'openai',
		model: model as string,
		baseUrl: (baseUrl as string) || undefined,
		apiKey: apiKey as string,
	};
}
