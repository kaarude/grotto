import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import ignore from 'ignore';
import ora from 'ora';
import { log } from '../util/logger.js';
import { parseFile } from '../parsers/index.js';
import { chunkText } from './chunker.js';
import { Store } from './store.js';
import type { Chunk } from './types.js';
import type { GrottoConfig } from './config.js';
import type { EmbedProvider } from '../providers/embed/base.js';

// Spinners are useless in tests and CI; only show them on a TTY.
const spinnerOpts = { isSilent: !process.stdout.isTTY || !!process.env.VITEST || !!process.env.CI };

export interface IngestResult {
	filesScanned: number;
	filesIndexed: number;
	filesSkipped: number;
	filesFailed: number;
	chunks: number;
}

export interface IngestOptions {
	/** Only process this absolute path (overrides config.notes.paths). */
	path?: string;
	/** Print debug info about the pipeline. */
	debug?: boolean;
}

const SUPPORTED_EXTS = new Set(['.md', '.mdx', '.markdown', '.pdf', '.txt', '.text', '.log']);

/**
 * Top-level orchestrator: walk → filter → parse → chunk → embed → store.
 *
 * Incremental: we hash file content; if a file's hash hasn't changed, we
 * skip embedding it. Re-running `grotto add` is cheap.
 */
export async function ingest(
	config: GrottoConfig,
	embedder: EmbedProvider,
	options: IngestOptions = {},
): Promise<IngestResult> {
	const store = new Store();
	const roots = options.path ? [resolve(options.path)] : config.notes.paths.map((p) => resolve(p));

	if (roots.length === 0) {
		throw new Error('No notes paths configured. Run `grotto init` or add paths to your config.');
	}

	// 1. Walk and filter files
	const walkSpinner = ora({ ...spinnerOpts, text: 'Scanning folders…' }).start();
	const allFiles: string[] = [];
	for (const root of roots) {
		const found = await walkFolder(root, config.notes.ignore);
		allFiles.push(...found);
	}
	const supported = allFiles.filter((f) => SUPPORTED_EXTS.has(extname(f).toLowerCase()));
	walkSpinner.succeed(
		`Found ${supported.length} supported file${supported.length === 1 ? '' : 's'} across ${roots.length} path${roots.length === 1 ? '' : 's'}`,
	);
	if (options.debug) {
		for (const f of supported) log.debug('  · ' + relative(process.cwd(), f));
	}

	if (supported.length === 0) {
		return { filesScanned: 0, filesIndexed: 0, filesSkipped: 0, filesFailed: 0, chunks: 0 };
	}

	// 2. Read prior state for incremental indexing
	const existing = new Map<string, string>(); // source → hash
	if (await store.hasTable()) {
		const sources = await store.listSources();
		for (const s of sources) existing.set(s.source, s.hash);
	}

	// 3. Hash and filter to files we actually need to process
	const hashSpinner = ora({ ...spinnerOpts, text: 'Hashing files…' }).start();
	const toProcess: { path: string; hash: string; size: number; ext: string }[] = [];
	let skipped = 0;
	for (const file of supported) {
		try {
			const { hash, size } = await hashFile(file);
			const ext = extname(file).toLowerCase().replace(/^\./, '');
			const prior = existing.get(file);
			if (prior === hash) {
				skipped++;
				continue;
			}
			toProcess.push({ path: file, hash, size, ext });
		} catch (err) {
			log.warn(`Could not read ${file}: ${err instanceof Error ? err.message : err}`);
		}
	}
	hashSpinner.succeed(
		`Hashed ${supported.length} files — ${toProcess.length} new/changed, ${skipped} unchanged`,
	);

	if (toProcess.length === 0) {
		// Even though we have nothing new to embed, we still need to call the
		// store so it can delete chunks for files that no longer exist on disk.
		await store.upsert([], supported);
		log.info('Nothing to index. Everything is up to date. ✨');
		return {
			filesScanned: supported.length,
			filesIndexed: 0,
			filesSkipped: skipped,
			filesFailed: 0,
			chunks: 0,
		};
	}

	// 4. Parse + chunk
	const parseSpinner = ora({ ...spinnerOpts, text: 'Parsing & chunking…' }).start();
	const fileChunks: { path: string; hash: string; ext: string; size: number; texts: string[] }[] =
		[];
	let failed = 0;
	for (const { path, hash, ext, size } of toProcess) {
		try {
			const doc = await parseFile(path);
			if (!doc.text) {
				log.debug(`Skipping empty file: ${path}`);
				continue;
			}
			const texts = chunkText(doc.text);
			if (texts.length === 0) {
				log.debug(`No chunks from: ${path}`);
				continue;
			}
			fileChunks.push({ path, hash, ext, size, texts });
		} catch (err) {
			failed++;
			const msg = err instanceof Error ? err.message : String(err);
			log.warn(`Failed to parse ${path}: ${msg}`);
		}
	}
	parseSpinner.succeed(
		`Parsed ${fileChunks.length} files into ${fileChunks.reduce((n, f) => n + f.texts.length, 0)} chunks`,
	);

	if (fileChunks.length === 0) {
		// Parsing failed for every changed file — still run the store so it
		// can prune any chunks for files that disappeared.
		await store.upsert([], supported);
		return {
			filesScanned: supported.length,
			filesIndexed: 0,
			filesSkipped: skipped,
			filesFailed: failed,
			chunks: 0,
		};
	}

	// 5. Embed in batches with progress
	const embedSpinner = ora({ ...spinnerOpts, text: 'Embedding chunks…' }).start();
	const allChunks: Chunk[] = [];
	const model = config.embed.model;
	const batchSize = embedder.info.name === 'ollama' ? 16 : 64;
	for (const file of fileChunks) {
		for (let i = 0; i < file.texts.length; i += batchSize) {
			const batch = file.texts.slice(i, i + batchSize);
			embedSpinner.text = `Embedding ${file.path} (${i + batch.length}/${file.texts.length})…`;
			const results = await embedder.embedBatch(batch, { model });
			for (let j = 0; j < batch.length; j++) {
				const text = batch[j]!;
				const result = results[j]!;
				allChunks.push({
					id: `${file.path}::${i + j}`,
					source: file.path,
					chunkIndex: i + j,
					text,
					vector: result.vector,
					embedModel: model,
					sourceHash: file.hash,
					indexedAt: new Date().toISOString(),
					ext: file.ext,
					size: file.size,
				});
			}
		}
	}
	embedSpinner.succeed(`Embedded ${allChunks.length} chunks`);

	// 6. Store
	const storeSpinner = ora({ ...spinnerOpts, text: 'Writing to LanceDB…' }).start();
	const allSources = supported; // for delete-by-source predicate
	await store.upsert(allChunks, allSources);
	storeSpinner.succeed(
		`Indexed ${allChunks.length} chunks from ${fileChunks.length} file${fileChunks.length === 1 ? '' : 's'}`,
	);

	return {
		filesScanned: supported.length,
		filesIndexed: fileChunks.length,
		filesSkipped: skipped,
		filesFailed: failed,
		chunks: allChunks.length,
	};
}

/**
 * Recursively walk a folder, honoring gitignore-style patterns. Returns
 * absolute file paths that pass the ignore filter.
 */
async function walkFolder(root: string, patterns: string[]): Promise<string[]> {
	const ig = ignore().add(patterns);

	async function walk(dir: string, prefix: string): Promise<string[]> {
		const { readdir } = await import('node:fs/promises');
		const entries = await readdir(dir, { withFileTypes: true });
		const out: string[] = [];
		for (const entry of entries) {
			const full = `${dir}/${entry.name}`;
			// Path relative to root, for matching against ignore patterns.
			const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
			if (ig.ignores(rel)) continue;
			if (entry.isDirectory()) {
				out.push(...(await walk(full, rel)));
			} else if (entry.isFile()) {
				out.push(full);
			}
		}
		return out;
	}

	const rootStat = await stat(root).catch(() => null);
	if (!rootStat?.isDirectory()) {
		throw new Error(`Not a directory: ${root}`);
	}
	return walk(root, '');
}

async function hashFile(file: string): Promise<{ hash: string; size: number }> {
	const content = await readFile(file);
	const hash = createHash('sha256').update(content).digest('hex');
	return { hash, size: content.byteLength };
}
