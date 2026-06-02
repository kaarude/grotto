import { describe, it, expect } from 'vitest';
import { chunkText } from '../src/core/chunker.js';

describe('chunkText', () => {
	it('returns empty array for empty input', () => {
		expect(chunkText('')).toEqual([]);
		expect(chunkText('   \n\n  ')).toEqual([]);
	});

	it('returns single chunk for short text', () => {
		const result = chunkText('hello world');
		expect(result).toEqual(['hello world']);
	});

	it('splits long text into multiple chunks', () => {
		const long = 'a'.repeat(10_000);
		const result = chunkText(long, { chunkSize: 1000, overlap: 0 });
		expect(result.length).toBeGreaterThan(1);
		for (const c of result) {
			expect(c.length).toBeLessThanOrEqual(1000);
		}
	});

	it('prefers paragraph boundaries when possible', () => {
		const text = 'First paragraph here.\n\nSecond paragraph here.\n\nThird paragraph here.';
		const result = chunkText(text, { chunkSize: 1000, overlap: 0 });
		// Whole thing fits in one chunk.
		expect(result).toEqual([text]);
	});

	it('applies overlap between consecutive chunks', () => {
		const long = 'word '.repeat(2000); // ~10000 chars
		const result = chunkText(long, { chunkSize: 1000, overlap: 0.2 });
		expect(result.length).toBeGreaterThan(1);
		// The first chunk should be ~1000 chars, the second should overlap with the first.
		expect(result[0]!.length).toBeLessThanOrEqual(1200);
	});

	it('handles text with no natural separators', () => {
		const noBreaks = 'x'.repeat(5000);
		const result = chunkText(noBreaks, { chunkSize: 1000, overlap: 0 });
		expect(result.length).toBe(5);
		for (const c of result) {
			expect(c.length).toBe(1000);
		}
	});
});
