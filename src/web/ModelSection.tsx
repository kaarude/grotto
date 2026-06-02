import { useEffect, useState } from 'react';
import { useModels, updateLlm } from './hooks.js';
import type { MaskedConfig } from './types.js';
import { Select, type SelectOption } from './Select.js';

interface Props {
	config: MaskedConfig;
	onConfigChange: (next: MaskedConfig) => void;
}

export function ModelSection({ config, onConfigChange }: Props) {
	const { models, refresh: refreshModels } = useModels();
	const [model, setModel] = useState(config.llm.model);
	const [baseUrl, setBaseUrl] = useState(config.llm.baseUrl ?? '');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [dirty, setDirty] = useState(false);

	// Sync local state when the parent's config changes (e.g. after a save).
	useEffect(() => {
		setModel(config.llm.model);
		setBaseUrl(config.llm.baseUrl ?? '');
		setDirty(false);
	}, [config.llm.model, config.llm.baseUrl]);

	// Mark dirty when local state diverges from the saved config.
	useEffect(() => {
		const urlChanged = (baseUrl || undefined) !== (config.llm.baseUrl ?? undefined);
		setDirty(model !== config.llm.model || urlChanged);
	}, [model, baseUrl, config.llm.model, config.llm.baseUrl]);

	const options: SelectOption<string>[] = (models?.models ?? [config.llm.model]).map((m) => ({
		value: m,
		label: m,
		sample: m === config.llm.model ? 'current' : undefined,
	}));

	async function save() {
		setError(null);
		setSaving(true);
		const result = await updateLlm({
			model,
			baseUrl: baseUrl.trim() ? baseUrl.trim() : null,
		});
		setSaving(false);
		if (!result.ok) {
			setError(result.error);
			return;
		}
		onConfigChange(result.config);
	}

	function reset() {
		setModel(config.llm.model);
		setBaseUrl(config.llm.baseUrl ?? '');
	}

	return (
		<div className="sheet-section">
			<h3>Model</h3>
			<div className="model-row">
				<Select
					label="Model"
					options={options}
					value={models?.models.includes(model) ? model : (options[0]?.value ?? model)}
					onChange={(v) => setModel(v)}
				/>
			</div>
			<div className="model-row">
				<label className="field-label" htmlFor="llm-baseurl">
					Base URL
				</label>
				<input
					id="llm-baseurl"
					className="field-input"
					type="text"
					value={baseUrl}
					onChange={(e) => setBaseUrl(e.target.value)}
					placeholder="https://api.openai.com/v1"
					spellCheck={false}
				/>
				<p className="field-hint">
					Leave empty for OpenAI. Set for OpenRouter, Groq, Together, LM Studio, or any
					OpenAI-compatible endpoint.
				</p>
			</div>
			{models && (
				<p className="field-hint">
					{models.models.length} model{models.models.length === 1 ? '' : 's'} from{' '}
					{models.source === 'provider' ? 'provider' : 'curated fallback'}
					{models.source === 'fallback' && (
						<>
							{' \u00b7 '}
							<button className="link-btn" onClick={refreshModels}>
								retry
							</button>
						</>
					)}
				</p>
			)}
			{error && <p className="field-error">{error}</p>}
			{dirty && (
				<div className="model-actions">
					<button className="ghost-btn" onClick={reset} disabled={saving}>
						Cancel
					</button>
					<button className="primary-btn" onClick={save} disabled={saving}>
						{saving ? 'Saving\u2026' : 'Save'}
					</button>
				</div>
			)}
		</div>
	);
}
