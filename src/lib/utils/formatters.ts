export function formatNumber(value: number, decimals: number = 1): string {
	if (!Number.isFinite(value)) return '-';
	if (Number.isInteger(value)) {
		return value.toString();
	}
	return value.toFixed(decimals);
}

export function formatCurrency(value: number, currency: string = '$'): string {
	if (!Number.isFinite(value)) return `${currency}--`;
	return `${currency}${value.toFixed(2)}`;
}

export function formatPercentage(value: number): string {
	if (!Number.isFinite(value)) return '--%';
	return `${Math.round(value * 100)}%`;
}

export function formatEnergy(value: number): string {
	if (!Number.isFinite(value)) return '-- Wh';
	return `${Math.round(value)} Wh`;
}

export function formatSpeed(value: number): string {
	return formatNumber(value, 1);
}

export function formatRange(value: number): string {
	return formatNumber(value, 1);
}

export function formatTime(value: number): string {
	return formatNumber(value, 1);
}

export function formatPower(value: number): string {
	if (!Number.isFinite(value)) return '-- W';
	return `${Math.round(value)} W`;
}

export function formatCRate(value: number): string {
	return formatNumber(value, 2);
}

export function formatPrice(price?: number): string {
	if (!price) return '—';
	return '$' + price.toLocaleString();
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
