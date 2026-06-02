import MarkdownIt from 'markdown-it';
import type { ParsedDocument } from '../core/types.js';

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

/**
 * Parse markdown to plain text. We strip markdown syntax so embeddings
 * capture semantic meaning, not formatting characters. Paragraph breaks
 * are preserved (one blank line between blocks).
 */
export function parseMarkdown(content: string): ParsedDocument {
	const rendered = md.render(content);
	// Strip HTML tags (paragraphs, lists, code blocks, etc.) and replace them
	// with paragraph breaks where appropriate.
	const text = rendered
		.replace(/<\/(p|h[1-6]|li|blockquote|pre)>/gi, '\n\n') // block-level close → paragraph break
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<[^>]+>/g, '') // strip remaining tags
		.replace(/[ \t]+\n/g, '\n') // trim trailing whitespace
		.replace(/\n{3,}/g, '\n\n') // collapse excessive newlines
		.trim();
	return { text, ext: 'md' };
}
