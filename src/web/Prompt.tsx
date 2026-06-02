import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import type { Citation } from './types.js';

export interface ChatTurn {
	id: string;
	question: string;
	answer: string;
	streaming: boolean;
	citations: Citation[];
}

interface Props {
	onSend: (question: string) => Promise<void>;
	streaming: boolean;
}

export function Prompt({ onSend, streaming }: Props) {
	const [value, setValue] = useState('');
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Auto-grow the textarea up to its max-height.
	useEffect(() => {
		const el = textareaRef.current;
		if (!el) return;
		el.style.height = 'auto';
		el.style.height = Math.min(el.scrollHeight, 200) + 'px';
	}, [value]);

	// Global ⌘K / Ctrl-K to focus the prompt.
	useEffect(() => {
		const handler = (e: globalThis.KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				textareaRef.current?.focus();
			}
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, []);

	const submit = (e?: FormEvent) => {
		e?.preventDefault();
		const q = value.trim();
		if (!q || streaming) return;
		setValue('');
		void onSend(q);
	};

	const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			submit();
		}
	};

	return (
		<div className="prompt-wrap">
			<form className="prompt" onSubmit={submit} role="search">
				<textarea
					ref={textareaRef}
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={onKeyDown}
					placeholder="Ask your notes anything…"
					rows={1}
					aria-label="Ask a question"
				/>
				<button
					type="submit"
					className="send-btn"
					disabled={!value.trim() || streaming}
					aria-label="Send"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</button>
			</form>
		</div>
	);
}
