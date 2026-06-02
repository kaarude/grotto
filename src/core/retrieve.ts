import type { Store } from './store.js';
import type { EmbedProvider } from '../providers/embed/base.js';
import type { Chunk } from './types.js';

export interface RetrievalHit {
	/** The matched chunk, with its embedding stripped (we don't need to ship vectors to the LLM). */
	chunk: Omit<Chunk, 'vector'>;
	/** Distance score from LanceDB. Lower = more similar. */
	_distance: number;
}

export interface RetrieveOptions {
	/** How many chunks to return. Default: from config.chat.topK. */
	topK?: number;
}

/**
 * Retrieve the top-K chunks most relevant to a query.
 *
 * Pipeline:
 *   1. Embed the query with the same provider/model used at index time.
 *   2. Vector-search the LanceDB chunks table.
 *   3. Return the top-K hits, vectors stripped.
 *
 * Filters (by source path, by recency, etc.) are intentionally NOT here.
 * v0.3+ can add them once we know what users actually want.
 */
export async function retrieve(
	query: string,
	store: Store,
	embedder: EmbedProvider,
	embedModel: string,
	options: RetrieveOptions = {},
): Promise<RetrievalHit[]> {
	const trimmed = query.trim();
	if (!trimmed) return [];

	const hasTable = await store.hasTable();
	if (!hasTable) return [];

	const topK = options.topK ?? 5;
	const results = await embedder.embedBatch([trimmed], { model: embedModel });
	const queryVec = results[0];
	if (!queryVec) return [];
	const vector = queryVec.vector;
	if (!vector || vector.length === 0) return [];

	const table = await store.table();
	const rows = (await table
		.vectorSearch(vector)
		.limit(topK)
		.toArray()) as (Chunk & { _distance: number })[];

	return rows.map((row) => {
		const { vector: _v, _distance, ...rest } = row;
		return { chunk: rest, _distance };
	});
}
