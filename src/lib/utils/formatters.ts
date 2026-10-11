export function formatPrice(price?: number): string {
	if (!price) return '—';
	return '$' + price.toLocaleString('en-US');
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Signed percentage change from `base` to `next`, e.g. "+12%" or "-5%".
 * Returns "n/a" when the change is undefined (base ≤ 0 or a non-finite result),
 * instead of "+NaN%", "+Infinity%" or "+-5%".
 */
export function formatPercentChange(base: number, next: number, digits = 0): string {
	if (!(base > 0) || !Number.isFinite(next)) return 'n/a';
	const pct = (next / base - 1) * 100;
	if (!Number.isFinite(pct)) return 'n/a';
	const rounded = pct.toFixed(digits);
	// Avoid "-0%" for tiny negative changes that round to zero.
	if (Number(rounded) === 0) return `+${(0).toFixed(digits)}%`;
	return `${pct > 0 ? '+' : ''}${rounded}%`;
}

/** Signed absolute difference, e.g. "+7" or "-3"; "n/a" if non-finite. */
export function formatSignedDelta(base: number, next: number, digits = 0): string {
	const delta = next - base;
	if (!Number.isFinite(delta)) return 'n/a';
	const rounded = delta.toFixed(digits);
	if (Number(rounded) === 0) return `+${(0).toFixed(digits)}`;
	return `${delta > 0 ? '+' : ''}${rounded}`;
}
