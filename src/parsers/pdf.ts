import { readFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';
import type { ParsedDocument } from '../core/types.js';

/**
 * Parse a PDF file to plain text. We extract per-page text and join with
 * blank lines so the chunker sees natural paragraph boundaries.
 */
export async function parsePdf(filePath: string): Promise<ParsedDocument> {
	const data = await readFile(filePath);
	const parser = new PDFParse({ data: new Uint8Array(data) });
	try {
		const result = await parser.getText();
		// pdf-parse returns per-page text in `pages` and a concatenated `text`.
		// Prefer the concatenated text — it's already joined with newlines.
		const text = (result.text ?? '')
			.replace(/\r\n/g, '\n')
			.replace(/\n{3,}/g, '\n\n')
			.trim();
		return { text, ext: 'pdf' };
	} finally {
		await parser.destroy();
	}
}
