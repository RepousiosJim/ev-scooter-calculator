import { describe, it, expect } from 'vitest';
import { formatPrice, EMAIL_RE } from '$lib/utils/formatters';

describe('Formatters', () => {
	describe('formatPrice', () => {
		it('formats a price with $ prefix', () => {
			expect(formatPrice(1000)).toMatch(/^\$1.?000$/);
		});

		it('returns em dash for undefined price', () => {
			expect(formatPrice(undefined)).toBe('—');
		});

		it('returns em dash for zero price', () => {
			expect(formatPrice(0)).toBe('—');
		});

		it('formats large prices with locale number formatting', () => {
			expect(formatPrice(9999)).toMatch(/^\$9.?999$/);
		});
	});

	describe('EMAIL_RE', () => {
		it('matches valid email addresses', () => {
			expect(EMAIL_RE.test('user@example.com')).toBe(true);
			expect(EMAIL_RE.test('test.name+tag@domain.co.uk')).toBe(true);
		});

		it('rejects invalid email addresses', () => {
			expect(EMAIL_RE.test('notanemail')).toBe(false);
			expect(EMAIL_RE.test('@domain.com')).toBe(false);
			expect(EMAIL_RE.test('user@')).toBe(false);
		});
	});
});
