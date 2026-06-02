import { useEffect, useState, useCallback } from 'react';
import type { MaskedConfig, SourcesResponse, Theme, FontChoice } from './types.js';

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
	useEffect(() => {
		fetch('/api/config')
			.then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
			.then(setConfig)
			.catch((e) => setError(e instanceof Error ? e.message : String(e)));
	}, []);
	return { config, error };
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
