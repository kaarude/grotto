import type { LLMProvider, Message } from '../providers/llm/base.js';
import type { EmbedProvider } from '../providers/embed/base.js';
import type { GrottoConfig } from './config.js';
import type { Store } from './store.js';
import { retrieve, type RetrievalHit } from './retrieve.js';

export interface ChatRequest {
	question: string;
	/** Optional prior messages for multi-turn. v0.6 = single-turn, but the API supports it. */
	history?: Message[];
}

export interface ChatResult {
	/** Streamed answer text. Yielded token-by-token from the LLM. */
	stream: AsyncIterable<string>;
	/** The chunks we retrieved to answer the question. Sent to the client up front so it can render citations as the answer streams. */
	citations: RetrievalHit[];
}

/**
 * One-shot chat: embed → retrieve → answer. Returns a streaming iterator
 * plus the citations that produced the answer, so the UI can render both
 * as the response comes in.
 */
export async function chat(
	request: ChatRequest,
	config: GrottoConfig,
	store: Store,
	embedder: EmbedProvider,
	llm: LLMProvider,
): Promise<ChatResult> {
	const question = request.question.trim();
	if (!question) {
		throw new Error('Question cannot be empty.');
	}

	const citations = await retrieve(question, store, embedder, config.embed.model, {
		topK: config.chat.topK,
	});

	const messages = buildMessages(question, citations, config, request.history);

	const llmStream = llm.chat(messages, {
		model: config.llm.model,
		temperature: config.chat.temperature,
		systemPrompt: config.chat.systemPrompt,
	});

	// Map the provider's chat() shape (with `done` flag) to a plain string iterable.
	async function* tokens(): AsyncIterable<string> {
		for await (const chunk of llmStream) {
			if (chunk.content) yield chunk.content;
		}
	}

	return { stream: tokens(), citations };
}

function buildMessages(
	question: string,
	citations: RetrievalHit[],
	config: GrottoConfig,
	history: Message[] = [],
): Message[] {
	const system =
		config.chat.systemPrompt ??
		`You are grotto, a local assistant that answers questions using the user's personal notes.\n` +
			`When relevant, cite the source paths of the notes you used. Keep answers concise and grounded in the provided context.`;

	const contextBlock =
		citations.length === 0
			? '(No relevant notes found. You can answer from general knowledge but should say so.)'
			: citations
					.map(
						(c, i) =>
							`[${i + 1}] ${c.chunk.source} (chunk ${c.chunk.chunkIndex})\n` + `${c.chunk.text}`,
					)
					.join('\n\n');

	const userPrompt =
		`Context from your notes:\n\n${contextBlock}\n\n` +
		`Question: ${question}\n\n` +
		`Answer using the context above. Cite sources inline as [1], [2], etc., matching the numbers above.`;

	return [{ role: 'system', content: system }, ...history, { role: 'user', content: userPrompt }];
}
