import { useSources, useConfig } from './hooks.js';
import { PLACEHOLDER_PROMPTS } from './types.js';

interface Props {
	onPickPrompt: (prompt: string) => void;
}

export function EmptyState({ onPickPrompt }: Props) {
	const { sources, error } = useSources();
	const { error: configError } = useConfig();
	const hasNotes = sources && sources.total > 0;

	return (
		<div className="empty">
			{configError ? (
				<p className="empty-message">
					No config found. Run <code>grotto init</code> in your terminal.
				</p>
			) : error ? (
				<p className="empty-message">Could not reach the grotto server: {error}</p>
			) : hasNotes ? (
				<p className="empty-message">
					{sources!.total} chunks from {sources!.sources.length} file
					{sources!.sources.length === 1 ? '' : 's'} ready.
				</p>
			) : (
				<p className="empty-message">
					No notes indexed yet. Run <code>grotto add</code>.
				</p>
			)}

			<div className="empty-prompts">
				{PLACEHOLDER_PROMPTS.map((p) => (
					<button key={p.label} className="empty-prompt" onClick={() => onPickPrompt(p.prompt)}>
						<span className="empty-prompt-label">{p.label}</span>
						<span className="empty-prompt-desc">{p.description}</span>
					</button>
				))}
			</div>
		</div>
	);
}
