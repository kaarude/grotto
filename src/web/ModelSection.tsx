import { useEffect, useMemo, useState } from 'react';
import { useModels, updateLlm } from './hooks.js';
import type { MaskedConfig } from './types.js';
import { Select, type SelectOption } from './Select.js';
import { LLM_PROVIDERS, getLlmProviderMeta } from './provider-data.js';

interface Props {
	config: MaskedConfig;
	onConfigChange: (next: MaskedConfig) => void;
}

export function ModelSection({ config, onConfigChange }: Props) {
	const { models, refresh: refreshModels } = useModels();

	const [provider, setProvider] = useState(config.llm.provider);
	const [model, setModel] = useState(config.llm.model);
	const [baseUrl, setBaseUrl] = useState(config.llm.baseUrl ?? '');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Provider metadata for the current selection. Falls back gracefully
	// if the user has a provider we don't ship a preset for (e.g. their
	// TOML was hand-edited).
	const providerMeta = useMemo(() => getLlmProviderMeta(provider), [provider]);

	// Whenever the parent's config changes (after a save, or on first load),
	// reset our local form state to match.
	useEffect(() => {
		setProvider(config.llm.provider);
		setModel(config.llm.model);
		setBaseUrl(config.llm.baseUrl ?? '');
	}, [config.llm.provider, config.llm.model, config.llm.baseUrl]);

	// Mark the form dirty when local state diverges from the saved config.
	const dirty = useMemo(() => {
		if (provider !== config.llm.provider) return true;
		if (model !== config.llm.model) return true;
		if ((baseUrl || undefined) !== (config.llm.baseUrl ?? undefined)) return true;
		return false;
	}, [provider, model, baseUrl, config.llm.provider, config.llm.model, config.llm.baseUrl]);

	// Build the provider picker options.
	const providerOptions: SelectOption<string>[] = LLM_PROVIDERS.map((p) => ({
		value: p.name,
		label: p.displayName,
		sample: p.hint,
	}));

	// Build the model picker options. We prefer the live list from
	// /api/llm/models (whatever the provider returned). If the user's
	// current model isn't in that list, we still show it so they can
	// keep using it.
	const modelOptions: SelectOption<string>[] = useMemo(() => {
		const fromProvider = models?.models ?? [];
		const fromPreset = providerMeta?.curatedModels ?? [];
		const seen = new Set<string>();
		const merged: string[] = [];
		for (const m of [model, ...fromProvider, ...fromPreset]) {
			if (m && !seen.has(m)) {
				seen.add(m);
				merged.push(m);
			}
		}
		return merged.map((m) => ({
			value: m,
			label: m,
			sample: m === config.llm.model ? 'current' : undefined,
		}));
	}, [models, providerMeta, model, config.llm.model]);

	async function save() {
		setError(null);
		setSaving(true);
		const result = await updateLlm({
			provider,
			model,
			baseUrl: baseUrl.trim() ? baseUrl.trim() : null,
		});
		setSaving(false);
		if (!result.ok) {
			setError(result.error);
			return;
		}
		onConfigChange(result.config);
		// The provider may have changed, so refresh the model list.
		refreshModels();
	}

	function reset() {
		setProvider(config.llm.provider);
		setModel(config.llm.model);
		setBaseUrl(config.llm.baseUrl ?? '');
		setError(null);
	}

	function handleProviderChange(newProvider: string) {
		setProvider(newProvider);
		// If the user is switching to a provider we have a preset for,
		// auto-fill the default base URL and pick the default model.
		// If the current model isn't in the new provider's curated
		// list, swap to the default — better than leaving them with a
		// model that doesn't exist on the new endpoint.
		const meta = getLlmProviderMeta(newProvider);
		if (meta) {
			if (baseUrl.trim() === '' || baseUrl === config.llm.baseUrl) {
				setBaseUrl(meta.defaultBaseUrl ?? '');
			}
			if (!meta.curatedModels.includes(model)) {
				setModel(meta.defaultModel);
			}
		}
	}

	return (
		<div className="sheet-section">
			<h3>Model</h3>

			<div className="model-row">
				<Select
					label="Provider"
					options={providerOptions}
					value={provider}
					onChange={handleProviderChange}
				/>
			</div>

			<div className="model-row">
				<Select
					label="Model"
					options={modelOptions}
					value={
						modelOptions.some((o) => o.value === model) ? model : (modelOptions[0]?.value ?? model)
					}
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
					placeholder={providerMeta?.defaultBaseUrl ?? 'https://api.openai.com/v1'}
					spellCheck={false}
				/>
				<p className="field-hint">
					{providerMeta?.requiresApiKey
						? 'API key is read from your environment (GROTTO_API_KEY or ' +
							`${provider.toUpperCase()}_API_KEY).`
						: 'Local provider — no API key required.'}
				</p>
			</div>

			{models && (
				<p className="field-hint">
					{models.models.length} model{models.models.length === 1 ? '' : 's'} from{' '}
					{models.source === 'provider' ? 'provider' : 'curated fallback'}
					{models.source === 'fallback' && (
						<>
							{' · '}
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
						{saving ? 'Saving…' : 'Save'}
					</button>
				</div>
			)}
		</div>
	);
}
