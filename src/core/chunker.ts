/**
 * Recursive character text splitter.
 *
 * Goal: turn long documents into ~800-token chunks with ~15% overlap, while
 * trying to break on natural boundaries (paragraphs → sentences → words).
 *
 * We don't pull in a tokenizer (no tiktoken, no gpt-tokenizer) — token counts
 * are approximate via `Math.ceil(chars / 4)`. For ~800 tokens that's ~3200
 * chars, which is fine for a first pass. We can swap in a real tokenizer later
 * if retrieval quality suffers.
 *
 * The recursion:
 *   1. If the whole text fits, return it as one chunk.
 *   2. Try splitting on the largest natural separator that exists in the text.
 *   3. If pieces are still too big, recurse into them.
 *   4. Finally, if even a single piece is bigger than the limit, hard-split
 *      on characters.
 */

const SEPARATORS = ['\n\n', '\n', '. ', '? ', '! ', '; ', ', ', ' ', ''] as const;

export interface ChunkOptions {
	/** Target chunk size in characters (~4 chars ≈ 1 token). Default 3200 ≈ 800 tokens. */
	chunkSize?: number;
	/** Overlap between consecutive chunks as a fraction (0–1). Default 0.15. */
	overlap?: number;
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
	const chunkSize = options.chunkSize ?? 3200;
	const overlap = options.overlap ?? 0.15;
	const overlapChars = Math.floor(chunkSize * overlap);

	const cleaned = text.replace(/\r\n/g, '\n').trim();
	if (!cleaned) return [];

	const pieces = splitRecursive(cleaned, chunkSize, 0);
	return mergeWithOverlap(pieces, chunkSize, overlapChars);
}

function splitRecursive(text: string, chunkSize: number, depth: number): string[] {
	if (text.length <= chunkSize) return [text];

	const sep = SEPARATORS[depth] ?? '';
	if (!sep) {
		// Last resort: hard-split on characters.
		const out: string[] = [];
		for (let i = 0; i < text.length; i += chunkSize) {
			out.push(text.slice(i, i + chunkSize));
		}
		return out;
	}

	const parts = text.split(sep);
	// Reattach the separator to each piece except the last, so we don't lose
	// formatting (newlines, periods, etc.).
	const reattached: string[] = [];
	for (let i = 0; i < parts.length; i++) {
		const piece = parts[i]!;
		const isLast = i === parts.length - 1;
		reattached.push(isLast ? piece : piece + sep);
	}

	const result: string[] = [];
	let buffer = '';
	for (const piece of reattached) {
		if (piece.length > chunkSize) {
			// Flush the buffer and recurse into the oversized piece.
			if (buffer) {
				result.push(buffer);
				buffer = '';
			}
			result.push(...splitRecursive(piece, chunkSize, depth + 1));
			continue;
		}
		if ((buffer + piece).length > chunkSize) {
			if (buffer) result.push(buffer);
			buffer = piece;
		} else {
			buffer += piece;
		}
	}
	if (buffer) result.push(buffer);
	return result;
}

function mergeWithOverlap(pieces: string[], chunkSize: number, overlapChars: number): string[] {
	if (pieces.length === 0) return [];
	if (pieces.length === 1) return pieces;

	const out: string[] = [pieces[0]!];
	for (let i = 1; i < pieces.length; i++) {
		const prev = out[out.length - 1]!;
		const curr = pieces[i]!;
		// If current piece is small, prepend the tail of the previous chunk
		// to give us overlap. Cap the overlap so we don't double-count too much.
		if (curr.length < chunkSize && overlapChars > 0) {
			const tail = prev.slice(-overlapChars);
			out.push((tail + curr).trim());
		} else {
			out.push(curr);
		}
	}
	return out.filter((p) => p.length > 0);
}
