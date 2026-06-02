import * as lancedb from '@lancedb/lancedb';
import { paths, ensureDirs } from '../util/paths.js';
import type { Chunk } from './types.js';
import { log } from '../util/logger.js';

const TABLE_NAME = 'chunks';

/**
 * Thin wrapper over LanceDB for the chunks table.
 *
 * The mergeInsert strategy:
 *   - match on `id` (`${source}::${chunkIndex}`)
 *   - when matched: update (handles re-embedding the same file)
 *   - when not matched: insert (new chunks)
 *
 * After mergeInsert, we issue a separate `delete` for any source path that
 * is no longer in the corpus. We can't do this inside mergeInsert's
 * `whenNotMatchedBySourceDelete` because that fires for ALL rows not in the
 * source batch — including chunks from files we want to keep (unchanged
 * files in incremental mode).
 */
export class Store {
	private db: lancedb.Connection | null = null;
	/** Cached flag: has the vector index been ensured on the chunks table? */
	private vectorIndexEnsured = false;

	async open(): Promise<lancedb.Connection> {
		if (this.db) return this.db;
		ensureDirs();
		this.db = await lancedb.connect(paths.dbDir);
		return this.db;
	}

	async table(): Promise<lancedb.Table> {
		const db = await this.open();
		const names = await db.tableNames();
		if (names.includes(TABLE_NAME)) {
			return db.openTable(TABLE_NAME);
		}
		// Create empty table — schema will be inferred from the first batch.
		return db.createTable(TABLE_NAME, []);
	}

	/**
	 * Make sure the chunks table is open and has a vector index. Call this
	 * before doing a vector search if you didn't go through upsert().
	 */
	async prepareForSearch(): Promise<lancedb.Table> {
		const t = await this.table();
		await this.ensureVectorIndex(t);
		return t;
	}

	/**
	 * Ensure a vector index exists on the `vector` column. Without one,
	 * vectorSearch() throws ("No vector column found to match"). We only
	 * do this once per Store instance — `createIndex` is idempotent enough
	 * to be a no-op if the index already exists, but skipping avoids the
	 * round-trip on every chat request.
	 */
	private async ensureVectorIndex(table: lancedb.Table): Promise<void> {
		if (this.vectorIndexEnsured) return;
		this.vectorIndexEnsured = true;
		try {
			const existing = await table.listIndices();
			if (existing.some((idx) => idx.columns?.includes('vector'))) return;
			await table.createIndex('vector');
		} catch (err) {
			// If indexing fails (e.g. too few rows for IVF-PQ), brute-force
			// search still works. Just log and move on.
			log.debug(`Vector index not created: ${err instanceof Error ? err.message : err}`);
		}
	}

	async hasTable(): Promise<boolean> {
		const db = await this.open();
		const names = await db.tableNames();
		return names.includes(TABLE_NAME);
	}

	async count(): Promise<number> {
		if (!(await this.hasTable())) return 0;
		const t = await this.table();
		return t.countRows();
	}

	async listSources(): Promise<{ source: string; chunks: number; hash: string; ext: string }[]> {
		if (!(await this.hasTable())) return [];
		const t = await this.table();
		const rows = (await t.query().toArray()) as Chunk[];
		const bySource = new Map<string, { chunks: number; hash: string; ext: string }>();
		for (const row of rows) {
			const existing = bySource.get(row.source);
			if (existing) {
				existing.chunks++;
			} else {
				bySource.set(row.source, { chunks: 1, hash: row.sourceHash, ext: row.ext });
			}
		}
		return Array.from(bySource.entries())
			.map(([source, info]) => ({ source, ...info }))
			.sort((a, b) => a.source.localeCompare(b.source));
	}

	/**
	 * Merge `chunks` into the table. Existing rows with the same `id` get
	 * updated; new ones are inserted. After the merge, any rows whose
	 * `source` is not in `currentSources` are deleted.
	 */
	async upsert(chunks: Chunk[], currentSources: string[]): Promise<void> {
		if (chunks.length === 0 && currentSources.length === 0) {
			log.debug('upsert called with nothing to do');
			return;
		}

		const exists = await this.hasTable();
		if (!exists) {
			if (chunks.length === 0) return;
			const db = await this.open();
			const t = await db.createTable(TABLE_NAME, chunks);
			await this.ensureVectorIndex(t);
			return;
		}

		const t = await this.table();
		await this.ensureVectorIndex(t);

		// 1. mergeInsert: update matching, insert new
		if (chunks.length > 0) {
			await t.mergeInsert('id').whenMatchedUpdateAll().whenNotMatchedInsertAll().execute(chunks);
		}

		// 2. Delete rows for sources that no longer exist on disk.
		//    Skip this on the very first call (chunks.length > 0 + no prior
		//    currentSources means we're establishing the corpus).
		if (currentSources.length > 0) {
			const sourceList = currentSources.map((s) => `'${escapeSql(s)}'`).join(', ');
			await t.delete(`source NOT IN (${sourceList})`);
		}
	}

	async close(): Promise<void> {
		this.db = null;
		this.vectorIndexEnsured = false;
	}
}

function escapeSql(s: string): string {
	return s.replace(/'/g, "''");
}
