import { useEffect, useState, useCallback } from 'react';
import type { MaskedConfig, ModelsResponse, SourcesResponse, Theme, FontChoice } from './types.js';

const STORAGE_THEME = 'grotto.theme';
const STORAGE_FONT = 'grotto.font';

function readStored<T>(key: string, fallback: T): T {
	try {
		const v = localStorage.getItem(key);
		return v ? (JSON.parse(v) as T) : fallback;
	} catch {
		return fallback;
	}
}

function writeStored(key: string, value: unknown): void {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// localStorage may be disabled (private mode); silently degrade.
	}
}

export function useTheme(): [Theme, (t: Theme) => void] {
	const [theme, setThemeState] = useState<Theme>(() => {
		if (typeof document !== 'undefined') {
			const v = document.documentElement.getAttribute('data-theme');
			if (v === 'light' || v === 'dark') return v;
		}
		return readStored<Theme>(STORAGE_THEME, 'light');
	});

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme);
		writeStored(STORAGE_THEME, theme);
	}, [theme]);

	return [theme, setThemeState];
}

export function useFont(): [FontChoice, (f: FontChoice) => void] {
	const [font, setFontState] = useState<FontChoice>(() => {
		if (typeof document !== 'undefined') {
			const v = document.documentElement.getAttribute('data-font');
			if (v) return v as FontChoice;
		}
		return readStored<FontChoice>(STORAGE_FONT, 'inter');
	});

	useEffect(() => {
		document.documentElement.setAttribute('data-font', font);
		writeStored(STORAGE_FONT, font);
	}, [font]);

	return [font, setFontState];
}

export function useConfig() {
	const [config, setConfig] = useState<MaskedConfig | null>(null);
	const [error, setError] = useState<string | null>(null);
	const refresh = useCallback(() => {
		fetch('/api/config')
			.then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
			.then(setConfig)
			.catch((e) => setError(e instanceof Error ? e.message : String(e)));
	}, []);
	useEffect(() => {
		refresh();
	}, [refresh]);
	return { config, error, refresh };
}

export function useSources() {
	const [sources, setSources] = useState<SourcesResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const refresh = useCallback(() => {
		fetch('/api/sources')
			.then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
			.then(setSources)
			.catch((e) => setError(e instanceof Error ? e.message : String(e)));
	}, []);
	useEffect(() => {
		refresh();
	}, [refresh]);
	return { sources, error, refresh };
}

export function useModels() {
	const [models, setModels] = useState<ModelsResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const refresh = useCallback(() => {
		fetch('/api/llm/models')
			.then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
			.then(setModels)
			.catch((e) => setError(e instanceof Error ? e.message : String(e)));
	}, []);
	useEffect(() => {
		refresh();
	}, [refresh]);
	return { models, error, refresh };
}

/**
 * Patch the LLM model + baseUrl on the server. Returns the new masked
 * config on success, or an error string.
 */
export async function updateLlm(patch: {
	model?: string;
	baseUrl?: string | null;
}): Promise<{ ok: true; config: MaskedConfig } | { ok: false; error: string }> {
	const res = await fetch('/api/config/llm', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(patch),
	});
	const data = (await res.json().catch(() => ({}))) as
		| { error?: string; config?: MaskedConfig }
		| Record<string, unknown>;
	if (!res.ok) {
		return { ok: false, error: (data as { error?: string }).error ?? `HTTP ${res.status}` };
	}
	return { ok: true, config: (data as { config: MaskedConfig }).config };
}
