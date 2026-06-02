import { useState } from 'react';
import type { ChatTurn } from './Prompt.js';
import type { Citation } from './types.js';

interface Props {
	turns: ChatTurn[];
}

function basename(path: string): string {
	const parts = path.split('/');
	return parts[parts.length - 1] ?? path;
}

export function Conversation({ turns }: Props) {
	const [expandedCitation, setExpandedCitation] = useState<string | null>(null);

	if (turns.length === 0) return null;

	return (
		<div className="conversation" role="log" aria-live="polite">
			{turns.map((turn) => (
				<div className="message" key={turn.id}>
					<div className="message-question">{turn.question}</div>
					<div className={'message-answer' + (turn.streaming ? ' streaming' : '')}>
						{turn.answer || (turn.streaming ? '' : ' ')}
					</div>
					{turn.citations.length > 0 && !turn.streaming && (
						<div className="citations">
							{turn.citations.map((c, i) => {
								const key = `${turn.id}::${i}`;
								const open = expandedCitation === key;
								return (
									<div key={key}>
										<button
											className="citation"
											onClick={() => setExpandedCitation(open ? null : key)}
											aria-expanded={open}
										>
											<span className="citation-num">[{i + 1}]</span>
											<span className="citation-path" title={c.source}>
												{basename(c.source)}
											</span>
										</button>
										{open && (
											<div
												className="citation-snippet"
												style={{
													marginTop: 6,
													padding: 10,
													fontSize: 12,
													fontFamily: 'var(--font-mono)',
													background: 'var(--subtle-surface)',
													border: '1px solid var(--quiet-border)',
													borderRadius: 4,
													color: 'var(--ink-soft)',
													maxWidth: 560,
													whiteSpace: 'pre-wrap',
												}}
											>
												<div style={{ marginBottom: 6, color: 'var(--ink)' }}>{c.source}</div>
												{c.text}
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>
			))}
		</div>
	);
}

// Unused but kept for callers that want to render a citation list without
// the surrounding conversation UI.
export function CitationList({ citations }: { citations: Citation[] }) {
	return (
		<div className="citations">
			{citations.map((c, i) => (
				<div className="citation" key={i}>
					<span className="citation-num">[{i + 1}]</span>
					<span className="citation-path">{basename(c.source)}</span>
				</div>
			))}
		</div>
	);
}
