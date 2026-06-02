/**
 * Shared types for the indexing pipeline.
 *
 * A `Chunk` is what ends up in LanceDB. Keep it flat — LanceDB loves flat
 * records and we want vector search to be fast.
 *
 * The index signature is required because LanceDB's `Data` type is
 * `Record<string, unknown>[]`. We keep all fields strongly typed for our
 * own use; the index signature just lets the record flow into LanceDB.
 */

export interface Chunk {
	id: string;
	source: string;
	chunkIndex: number;
	text: string;
	vector: number[];
	embedModel: string;
	sourceHash: string;
	indexedAt: string;
	ext: string;
	size: number;
	[key: string]: unknown;
}

export interface ParsedDocument {
	text: string;
	/** File extension (lowercase, no dot). */
	ext: string;
}
