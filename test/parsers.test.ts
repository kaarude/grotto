import { describe, it, expect } from 'vitest';
import { parseMarkdown, parseText } from '../src/parsers/index.js';

describe('parseMarkdown', () => {
	it('strips markdown syntax', () => {
		const md = '# Hello\n\nThis is **bold** and *italic*.';
		const result = parseMarkdown(md);
		expect(result.text).toContain('Hello');
		expect(result.text).toContain('bold');
		expect(result.text).toContain('italic');
		expect(result.text).not.toContain('#');
		expect(result.text).not.toContain('**');
	});

	it('preserves paragraph breaks', () => {
		const md = 'Para one.\n\nPara two.\n\nPara three.';
		const result = parseMarkdown(md);
		expect(result.text.split('\n\n').length).toBeGreaterThanOrEqual(2);
	});

	it('sets ext to md', () => {
		expect(parseMarkdown('hi').ext).toBe('md');
	});
});

describe('parseText', () => {
	it('returns trimmed content', async () => {
		const result = await parseText('test/fixtures/sample.txt');
		expect(result.text.length).toBeGreaterThan(0);
		expect(result.ext).toBe('txt');
	});
});
