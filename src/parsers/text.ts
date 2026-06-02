import { readFile } from 'node:fs/promises';
import type { ParsedDocument } from '../core/types.js';

/**
 * Plain text parser — no transformation, just read and normalize line endings.
 */
export async function parseText(filePath: string): Promise<ParsedDocument> {
	const content = await readFile(filePath, 'utf-8');
	const text = content
		.replace(/\r\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
	const ext = filePath.toLowerCase().endsWith('.mdx') ? 'mdx' : 'txt';
	return { text, ext };
}
