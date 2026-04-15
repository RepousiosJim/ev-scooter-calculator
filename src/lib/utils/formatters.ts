export function formatPrice(price?: number): string {
	if (!price) return '—';
	return '$' + price.toLocaleString('en-US');
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
