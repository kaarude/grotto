import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, Message, ChatOptions, ChatChunk, ProviderInfo } from './base.js';

/**
 * Anthropic Claude via their native Messages API.
 *
 * Anthropic is the one named provider that isn't OpenAI-compatible, so
 * it gets its own class. Two shape differences from OpenAI:
 *
 *   1. The system prompt is a top-level field, not a message with
 *      role: 'system'. We pull it out of `messages` before sending.
 *   2. `max_tokens` is required by the API. We default to 4096 if the
 *      caller didn't pass one — enough for most RAG answers.
 */
export class AnthropicLLM implements LLMProvider {
	readonly info: ProviderInfo = {
		name: 'anthropic',
		displayName: 'Anthropic',
		defaultModel: 'claude-3-5-sonnet-latest',
		defaultBaseUrl: 'https://api.anthropic.com',
		requiresApiKey: true,
	};

	private client: Anthropic;

	constructor(baseUrl: string | undefined, apiKey: string) {
		this.client = new Anthropic({
			apiKey,
			baseURL: baseUrl ?? 'https://api.anthropic.com',
		});
	}

	/**
	 * Anthropic doesn't expose a /models endpoint. We return the curated
	 * list from the preset so the web UI's model picker still has
	 * something useful to show.
	 */
	async listModels(): Promise<string[]> {
		return [
			'claude-3-5-sonnet-latest',
			'claude-3-5-haiku-latest',
			'claude-3-opus-latest',
			'claude-3-7-sonnet-latest',
		];
	}

	async *chat(messages: Message[], options: ChatOptions): AsyncIterable<ChatChunk> {
		// Anthropic: pull out the system message (if any) and filter to
		// user/assistant turns only. Adjacent same-role messages get
		// merged, but grotto's chat orchestrator already alternates, so
		// we just pass them through.
		const systemParts: string[] = [];
		if (options.systemPrompt) systemParts.push(options.systemPrompt);
		for (const m of messages) {
			if (m.role === 'system') systemParts.push(m.content);
		}
		const system = systemParts.length > 0 ? systemParts.join('\n\n') : undefined;

		const anthropicMessages: Anthropic.MessageParam[] = messages
			.filter((m) => m.role !== 'system')
			.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

		const stream = this.client.messages.stream({
			model: options.model,
			max_tokens: options.maxTokens ?? 4096,
			temperature: options.temperature,
			system,
			messages: anthropicMessages,
		});

		for await (const event of stream) {
			// We only care about text deltas. Other event types
			// (content_block_start, message_stop, etc.) are bookkeeping
			// for the SDK, not for the user-facing token stream.
			if (
				event.type === 'content_block_delta' &&
				(event.delta as { type: string }).type === 'text_delta'
			) {
				const text = (event.delta as { text?: string }).text;
				if (text) yield { content: text, done: false };
			}
		}
		yield { content: '', done: true };
	}

	async validateConnection(): Promise<{ ok: boolean; error?: string; models?: string[] }> {
		try {
			// A minimal messages.create call to check the key works.
			// Anthropic doesn't expose a "list models" endpoint, so this
			// is the cheapest valid request we can make.
			await this.client.messages.create({
				model: this.info.defaultModel,
				max_tokens: 1,
				messages: [{ role: 'user', content: 'ping' }],
			});
			return { ok: true, models: await this.listModels() };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (/401|403|unauthor|invalid.*api.*key/i.test(msg)) {
				return {
					ok: false,
					error: 'Authentication failed. Check your ANTHROPIC_API_KEY.',
				};
			}
			if (/404|not.*found|model/i.test(msg)) {
				// Auth worked but the model name is unknown — still a pass.
				return { ok: true, models: await this.listModels() };
			}
			return { ok: false, error: msg };
		}
	}
}
