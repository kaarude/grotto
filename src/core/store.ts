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
			await db.createTable(TABLE_NAME, chunks);
			return;
		}

		const t = await this.table();

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
	}
}

function escapeSql(s: string): string {
	return s.replace(/'/g, "''");
}
