import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the Anthropic SDK before importing the class under test.
// We need a fake stream that yields the same shape as the real one.
type SdkEvent = { type: string; delta?: { type: string; text?: string } };

class FakeMessageStream {
	async *[Symbol.asyncIterator]() {
		const events: SdkEvent[] = [
			{ type: 'message_start' },
			{ type: 'content_block_start' },
			{ type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } },
			{ type: 'content_block_delta', delta: { type: 'text_delta', text: ', world' } },
			{ type: 'content_block_stop' },
			{ type: 'message_stop' },
		];
		for (const e of events) yield e;
	}
}

const messagesCreateMock = vi.fn(async () => ({ id: 'msg_x' }));
const messagesStreamMock = vi.fn(() => new FakeMessageStream());

vi.mock('@anthropic-ai/sdk', () => {
	return {
		default: class FakeAnthropic {
			messages = {
				create: messagesCreateMock,
				stream: messagesStreamMock,
			};
			constructor(_opts: unknown) {}
		},
	};
});

const { AnthropicLLM } = await import('../src/providers/llm/anthropic.js');

describe('AnthropicLLM', () => {
	beforeEach(() => {
		messagesCreateMock.mockClear();
		messagesStreamMock.mockClear();
		messagesCreateMock.mockResolvedValue({ id: 'msg_x' });
	});

	it('reports the right provider info', () => {
		const llm = new AnthropicLLM(undefined, 'sk-ant-test');
		expect(llm.info.name).toBe('anthropic');
		expect(llm.info.requiresApiKey).toBe(true);
		expect(llm.info.defaultModel).toBe('claude-3-5-sonnet-latest');
	});

	it('listModels returns the curated Claude list (Anthropic has no /models endpoint)', async () => {
		const llm = new AnthropicLLM(undefined, 'sk-ant-test');
		const models = await llm.listModels();
		expect(models).toContain('claude-3-5-sonnet-latest');
		expect(models.length).toBeGreaterThan(2);
	});

	it('chat() pulls out the system prompt and streams text deltas', async () => {
		const llm = new AnthropicLLM(undefined, 'sk-ant-test');
		const out: string[] = [];
		for await (const chunk of llm.chat(
			[
				{ role: 'user', content: 'hi' },
				{ role: 'assistant', content: 'hello' },
				{ role: 'user', content: 'how are you?' },
			],
			{
				model: 'claude-3-5-sonnet-latest',
				temperature: 0.5,
				systemPrompt: 'You are a helpful assistant.',
			},
		)) {
			if (chunk.content) out.push(chunk.content);
		}

		expect(out.join('')).toBe('Hello, world');

		// The stream call should have received the system prompt separately
		// (not as a system message) and the user/assistant turns only.
		expect(messagesStreamMock).toHaveBeenCalledOnce();
		const call = messagesStreamMock.mock.calls[0]![0] as {
			model: string;
			system?: string;
			messages: { role: string; content: string }[];
			max_tokens: number;
			temperature: number;
		};
		expect(call.model).toBe('claude-3-5-sonnet-latest');
		expect(call.system).toBe('You are a helpful assistant.');
		expect(call.max_tokens).toBe(4096); // default
		expect(call.temperature).toBe(0.5);
		expect(call.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
		expect(call.messages.map((m) => m.content)).toEqual(['hi', 'hello', 'how are you?']);
	});

	it('chat() collects system messages from the messages array into the top-level system field', async () => {
		const llm = new AnthropicLLM(undefined, 'sk-ant-test');
		// Consume the stream to trigger the call.
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for await (const _chunk of llm.chat(
			[
				{ role: 'system', content: 'from-messages' },
				{ role: 'user', content: 'hi' },
			],
			{ model: 'claude-3-5-sonnet-latest', systemPrompt: 'from-options' },
		)) {
			// drain
		}

		const call = messagesStreamMock.mock.calls[0]![0] as { system?: string; messages: unknown[] };
		// system prompt and the in-message system are joined.
		expect(call.system).toContain('from-options');
		expect(call.system).toContain('from-messages');
		// The system message should NOT appear in the messages array.
		expect(call.messages.every((m) => (m as { role: string }).role !== 'system')).toBe(true);
	});

	it('validateConnection() returns ok on success', async () => {
		const llm = new AnthropicLLM(undefined, 'sk-ant-test');
		const result = await llm.validateConnection();
		expect(result.ok).toBe(true);
		expect(messagesCreateMock).toHaveBeenCalledOnce();
	});

	it('validateConnection() returns a friendly error on auth failure', async () => {
		messagesCreateMock.mockRejectedValueOnce(new Error('401 unauthorized: invalid api key'));
		const llm = new AnthropicLLM(undefined, 'bad-key');
		const result = await llm.validateConnection();
		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/Authentication failed/);
	});

	it('validateConnection() treats 404 model errors as success (auth is fine)', async () => {
		messagesCreateMock.mockRejectedValueOnce(new Error('404 not_found_error: model not found'));
		const llm = new AnthropicLLM(undefined, 'good-key');
		const result = await llm.validateConnection();
		expect(result.ok).toBe(true);
	});
});
