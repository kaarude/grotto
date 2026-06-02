import { useState, useCallback } from 'react';
import { Prompt, type ChatTurn } from './Prompt.js';
import { Conversation } from './Conversation.js';
import { Settings } from './Settings.js';
import { useConfig, useSources } from './hooks.js';
import type { Citation } from './types.js';

export function App() {
	const [turns, setTurns] = useState<ChatTurn[]>([]);
	const [streaming, setStreaming] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const { sources, error: sourcesError, refresh: refreshSources } = useSources();
	const { error: configError } = useConfig();

	const handleSend = useCallback(
		async (question: string) => {
			const id = crypto.randomUUID();
			setTurns((prev) => [...prev, { id, question, answer: '', streaming: true, citations: [] }]);
			setStreaming(true);

			try {
				const res = await fetch('/api/chat', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ question }),
				});
				if (!res.ok || !res.body) {
					const errText = await res.text().catch(() => res.statusText);
					throw new Error(`Chat failed: ${errText}`);
				}

				const reader = res.body.getReader();
				const decoder = new TextDecoder();
				let buffer = '';

				// Parse SSE frames. The Hono server emits event: citations | token | done | error.
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });

					// Split into frames on the SSE separator (blank line).
					let frameEnd: number;
					while ((frameEnd = buffer.indexOf('\n\n')) !== -1) {
						const frame = buffer.slice(0, frameEnd);
						buffer = buffer.slice(frameEnd + 2);
						const evt = parseSseFrame(frame);
						if (!evt) continue;

						if (evt.event === 'citations') {
							const citations = JSON.parse(evt.data) as Citation[];
							setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, citations } : t)));
						} else if (evt.event === 'token') {
							const { token } = JSON.parse(evt.data) as { token: string };
							setTurns((prev) =>
								prev.map((t) => (t.id === id ? { ...t, answer: t.answer + token } : t)),
							);
						} else if (evt.event === 'done') {
							setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, streaming: false } : t)));
							// New chunks may have been embedded (no — chat is read-only, but
							// sources may have changed if the user is iterating).
							refreshSources();
						} else if (evt.event === 'error') {
							const { error } = JSON.parse(evt.data) as { error: string };
							throw new Error(error);
						}
					}
				}
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				setTurns((prev) =>
					prev.map((t) =>
						t.id === id ? { ...t, streaming: false, answer: t.answer + `\n\n[error: ${msg}]` } : t,
					),
				);
			} finally {
				setStreaming(false);
			}
		},
		[refreshSources],
	);

	const showEmpty = turns.length === 0;

	return (
		<div className="page">
			<header className="header">
				<div className="brand">
					<span className="brand-dot" aria-hidden="true" />
					grotto
				</div>
				<div className="header-actions">
					<button
						className="icon-btn"
						onClick={() => setSettingsOpen(true)}
						aria-label="Open settings"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<circle cx="12" cy="12" r="3" />
							<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
						</svg>
					</button>
				</div>
			</header>

			{showEmpty ? <EmptyState /> : <Conversation turns={turns} />}

			<Prompt onSend={handleSend} streaming={streaming} />
			<Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
		</div>
	);
}

function EmptyState() {
	const { sources, error } = useSources();
	const { error: configError } = useConfig();
	const hasNotes = sources && sources.total > 0;
	return (
		<div className="empty">
			<h1>Ask your notes anything</h1>
			<p>
				grotto is a local assistant. It reads from your indexed notes and answers with citations
				back to the source.
			</p>
			{configError ? (
				<p>
					<strong>No config found.</strong> Run <code>grotto init</code> in your terminal to get
					started.
				</p>
			) : error ? (
				<p>Could not reach the grotto server: {error}</p>
			) : hasNotes ? (
				<p>
					<strong>{sources!.total}</strong> chunks from <strong>{sources!.sources.length}</strong>{' '}
					file
					{sources!.sources.length === 1 ? '' : 's'} ready to search.
				</p>
			) : (
				<p>
					No notes indexed yet. Run <code>grotto add</code> in your terminal.
				</p>
			)}
			<p className="meta">
				Press <code>⏎</code> to send · <code>Shift+⏎</code> for newline · <code>⌘K</code> to focus
			</p>
		</div>
	);
}

interface SseFrame {
	event: string;
	data: string;
}

function parseSseFrame(frame: string): SseFrame | null {
	let event = 'message';
	let data = '';
	for (const line of frame.split('\n')) {
		if (line.startsWith('event: ')) {
			event = line.slice(7).trim();
		} else if (line.startsWith('data: ')) {
			data += line.slice(6);
		} else if (line.startsWith('data:')) {
			// Tolerate missing space.
			data += line.slice(5);
		}
	}
	if (!data && event === 'message') return null;
	return { event, data };
}
