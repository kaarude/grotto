/**
 * Test fakes. Shared across the test suite so we don't duplicate embedding
 * and LLM mocks.
 */
import type { EmbedProvider, EmbedResult, EmbedOptions } from '../src/providers/embed/base.js';
import type { LLMProvider } from '../src/providers/llm/base.js';
import type { GrottoConfig } from '../src/core/config.js';

export const cfg: GrottoConfig = {
	version: 1,
	notes: { paths: [''], ignore: [] },
	embed: { provider: 'openai', model: 'fake' },
	llm: { provider: 'openai', model: 'fake' },
	chat: { topK: 3, temperature: 0 },
};

/** Deterministic fake embedding: bag-of-words-ish, so similar texts are similar. */
export function fakeEmbed(text: string): number[] {
	const v = new Array(8).fill(0) as number[];
	for (const word of text.toLowerCase().split(/\W+/)) {
		if (!word) continue;
		let h = 0;
		for (let i = 0; i < word.length; i++) h = (h * 31 + word.charCodeAt(i)) >>> 0;
		v[h % 8]! += 1;
	}
	return v;
}

export class FakeEmbedder implements EmbedProvider {
	readonly info = {
		name: 'fake',
		displayName: 'Fake',
		defaultModel: 'fake',
		requiresApiKey: false,
	} as const;
	async listModels() {
		return ['fake'];
	}
	async embed(text: string, _o: EmbedOptions): Promise<EmbedResult> {
		return { vector: fakeEmbed(text), model: 'fake' };
	}
	async embedBatch(texts: string[], o: EmbedOptions): Promise<EmbedResult[]> {
		return texts.map((t) => ({ vector: fakeEmbed(t), model: o.model }));
	}
	async validateConnection() {
		return { ok: true, models: ['fake'] };
	}
}

export function makeFakeLlm(tokens: string[]): LLMProvider {
	return {
		info: { name: 'fake', displayName: 'Fake', defaultModel: 'fake', requiresApiKey: false },
		async listModels() {
			return ['fake'];
		},
		async *chat() {
			for (const t of tokens) yield { content: t, done: false };
			yield { content: '', done: true };
		},
		async validateConnection() {
			return { ok: true, models: ['fake'] };
		},
	};
}

export function makeChunk(source: string, chunkIndex: number, text: string) {
	return {
		id: `${source}::${chunkIndex}`,
		source,
		chunkIndex,
		text,
		vector: fakeEmbed(text),
		embedModel: 'fake',
		sourceHash: 'h',
		indexedAt: new Date().toISOString(),
		ext: 'md',
		size: 100,
	};
}

/** Build N chunks for the same source with sequential indices. */
export function makeChunks(
	source: string,
	n: number,
	textBase = 'chunk',
): ReturnType<typeof makeChunk>[] {
	return Array.from({ length: n }, (_, i) => makeChunk(source, i, `${textBase} ${i}`));
}
