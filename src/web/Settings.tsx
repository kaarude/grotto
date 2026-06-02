import { useEffect, useState } from 'react';
import { useConfig, useSources, useTheme, useFont, useModels } from './hooks.js';
import { FONT_CHOICES, type MaskedConfig, type SourcesResponse, type FontChoice } from './types.js';
import { Select } from './Select.js';
import { ModelSection } from './ModelSection.js';

interface Props {
	open: boolean;
	onClose: () => void;
}

export function Settings({ open, onClose }: Props) {
	const { config, error: configError, refresh: refreshConfig } = useConfig();
	const { sources, error: sourcesError, refresh: refreshSources } = useSources();
	const [theme, setTheme] = useTheme();
	const [font, setFont] = useFont();
	const { refresh: refreshModels } = useModels();

	// Refresh everything whenever the sheet is opened. Cheap and ensures
	// the user sees fresh state if they ran `grotto add` in another terminal.
	useEffect(() => {
		if (open) {
			refreshConfig();
			refreshSources();
			refreshModels();
		}
	}, [open, refreshConfig, refreshSources, refreshModels]);

	// Close on Escape.
	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, [open, onClose]);

	const fontOptions = FONT_CHOICES.map((f) => ({
		value: f.value,
		label: f.label,
		sample: f.sample,
	}));

	return (
		<>
			<div
				className={'sheet-backdrop' + (open ? ' open' : '')}
				onClick={onClose}
				aria-hidden="true"
			/>
			<aside className={'sheet' + (open ? ' open' : '')} aria-label="Settings" aria-hidden={!open}>
				<h2>Settings</h2>

				<div className="sheet-section">
					<h3>Font</h3>
					<Select<FontChoice> label="Font" options={fontOptions} value={font} onChange={setFont} />
				</div>

				<div className="sheet-section">
					<h3>Theme</h3>
					<div className="theme-options">
						{(['light', 'dark'] as const).map((t) => (
							<button
								key={t}
								className={'theme-option' + (theme === t ? ' active' : '')}
								onClick={() => setTheme(t)}
							>
								{t === 'light' ? 'Light' : 'Dark'}
							</button>
						))}
					</div>
				</div>

				{config && (
					<ModelSection
						config={config}
						onConfigChange={(next) => {
							// After the server updates, refresh our view of the config.
							refreshConfig();
							void next;
						}}
					/>
				)}

				<div className="sheet-section">
					<h3>Configuration</h3>
					{configError && <p>Could not load config: {configError}</p>}
					{config && <ConfigSummary config={config} />}
				</div>

				<div className="sheet-section">
					<h3>Indexed notes</h3>
					{sourcesError && <p>Could not load sources: {sourcesError}</p>}
					{sources && <SourcesSummary sources={sources} />}
				</div>
			</aside>
		</>
	);
}

function ConfigSummary({ config }: { config: MaskedConfig }) {
	return (
		<div className="config">
			<div>
				<strong>Embedder</strong> {config.embed.provider} / {config.embed.model}
			</div>
			<div>
				<strong>LLM</strong> {config.llm.provider} / {config.llm.model}
			</div>
			<div>
				<strong>topK</strong> {config.chat.topK} · <strong>temperature</strong>{' '}
				{config.chat.temperature}
			</div>
			<div>
				<strong>Notes paths</strong>
			</div>
			{config.notes.paths.map((p) => (
				<div key={p} style={{ paddingLeft: 12 }}>
					· {p}
				</div>
			))}
		</div>
	);
}

function SourcesSummary({ sources }: { sources: SourcesResponse }) {
	if (sources.total === 0) {
		return (
			<div className="config">
				No notes indexed yet. Run <code>grotto add</code> in your terminal.
			</div>
		);
	}
	return (
		<div className="config">
			<div>
				<strong>{sources.total}</strong> chunks across <strong>{sources.sources.length}</strong>{' '}
				file{sources.sources.length === 1 ? '' : 's'}
			</div>
			{sources.sources.slice(0, 8).map((s) => (
				<div key={s.source} style={{ paddingLeft: 12 }}>
					· {s.source.split('/').pop()} ({s.chunks} · .{s.ext})
				</div>
			))}
			{sources.sources.length > 8 && (
				<div style={{ paddingLeft: 12, color: 'var(--ink-soft)' }}>
					…and {sources.sources.length - 8} more
				</div>
			)}
		</div>
	);
}
