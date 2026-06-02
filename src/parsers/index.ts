import { extname } from 'node:path';
import { readFile } from 'node:fs/promises';
import { parseMarkdown } from './markdown.js';
import { parsePdf } from './pdf.js';
import { parseText } from './text.js';
import type { ParsedDocument } from '../core/types.js';

export type ParserName = 'markdown' | 'pdf' | 'text';

/**
 * Pick a parser based on file extension. We support:
 *   - markdown: .md, .mdx, .markdown
 *   - pdf:      .pdf
 *   - text:     .txt, .text, .log (and anything else, as a best-effort fallback)
 */
export function parserFor(filePath: string): ParserName {
	const ext = extname(filePath).toLowerCase();
	switch (ext) {
		case '.md':
		case '.mdx':
		case '.markdown':
			return 'markdown';
		case '.pdf':
			return 'pdf';
		default:
			return 'text';
	}
}

export async function parseFile(filePath: string): Promise<ParsedDocument> {
	const parser = parserFor(filePath);
	switch (parser) {
		case 'markdown': {
			const content = await readFile(filePath, 'utf-8');
			return parseMarkdown(content);
		}
		case 'pdf':
			return parsePdf(filePath);
		case 'text':
			return parseText(filePath);
	}
}

export { parseMarkdown, parsePdf, parseText };
