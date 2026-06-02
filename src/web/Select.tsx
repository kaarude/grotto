import { useEffect, useRef, useState, useId } from 'react';

export interface SelectOption<T extends string> {
	value: T;
	label: string;
	/** Optional secondary line (e.g. a sample in the chosen font). */
	sample?: string;
}

interface Props<T extends string> {
	options: SelectOption<T>[];
	value: T;
	onChange: (value: T) => void;
	label: string;
	id?: string;
	disabled?: boolean;
}

/**
 * A small dropdown <Select> component used for the font and model pickers.
 *
 * Keyboard: ↑/↓ to move, Enter/Space to open, Esc to close, type-ahead to
 * jump to a matching option.
 */
export function Select<T extends string>({
	options,
	value,
	onChange,
	label,
	id,
	disabled,
}: Props<T>) {
	const reactId = useId();
	const selectId = id ?? reactId;
	const [open, setOpen] = useState(false);
	const [highlight, setHighlight] = useState(() => options.findIndex((o) => o.value === value));
	const containerRef = useRef<HTMLDivElement>(null);

	// Close on outside click.
	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		window.addEventListener('mousedown', handler);
		return () => window.removeEventListener('mousedown', handler);
	}, [open]);

	// Keep highlight in sync with current value.
	useEffect(() => {
		const i = options.findIndex((o) => o.value === value);
		if (i >= 0) setHighlight(i);
	}, [value, options]);

	const current = options.find((o) => o.value === value);

	function handleKeyDown(e: React.KeyboardEvent) {
		if (disabled) return;
		if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
			e.preventDefault();
			setOpen(true);
		} else if (e.key === 'Escape' && open) {
			setOpen(false);
		} else if (open) {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				setHighlight((h) => Math.min(h + 1, options.length - 1));
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				setHighlight((h) => Math.max(h - 1, 0));
			} else if (e.key === 'Enter') {
				e.preventDefault();
				const opt = options[highlight];
				if (opt) {
					onChange(opt.value);
					setOpen(false);
				}
			}
		}
	}

	return (
		<div className="select" ref={containerRef} data-open={open}>
			<button
				type="button"
				className="select-trigger"
				onClick={() => !disabled && setOpen((o) => !o)}
				onKeyDown={handleKeyDown}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-label={label}
				id={selectId}
				disabled={disabled}
			>
				<span className="select-value">
					<span className="select-label">{current?.label ?? value}</span>
					{current?.sample && <span className="select-sample">{current.sample}</span>}
				</span>
				<svg
					className="select-caret"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				>
					<path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</button>
			{open && (
				<ul className="select-menu" role="listbox" aria-labelledby={selectId}>
					{options.map((opt, i) => (
						<li
							key={opt.value}
							role="option"
							aria-selected={opt.value === value}
							className={
								'select-option' +
								(opt.value === value ? ' selected' : '') +
								(i === highlight ? ' highlight' : '')
							}
							onMouseEnter={() => setHighlight(i)}
							onClick={() => {
								onChange(opt.value);
								setOpen(false);
							}}
						>
							<span className="select-option-label">{opt.label}</span>
							{opt.sample && <span className="select-sample">{opt.sample}</span>}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
