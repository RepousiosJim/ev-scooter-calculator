import { describe, it, expect } from 'vitest';

import { formatDelta, hasSignificantChange, formatValue } from '$lib/utils/comparison';

describe('formatDelta', () => {
	it('returns positive absolute and percent when upgraded > current', () => {
		const result = formatDelta(100, 120);
		expect(result.absolute).toBe(20);
		expect(result.percent).toBeCloseTo(20, 5);
		expect(result.direction).toBe('up');
	});

	it('returns negative absolute and percent when upgraded < current', () => {
		const result = formatDelta(100, 80);
		expect(result.absolute).toBe(-20);
		expect(result.percent).toBeCloseTo(-20, 5);
		expect(result.direction).toBe('down');
	});

	it('returns neutral direction when values are equal', () => {
		const result = formatDelta(100, 100);
		expect(result.absolute).toBe(0);
		expect(result.percent).toBe(0);
		expect(result.direction).toBe('neutral');
	});

	it('returns neutral direction when percent change is below 0.01 threshold', () => {
		// 0.005% change — below 0.01 threshold
		const result = formatDelta(10000, 10001);
		expect(result.direction).toBe('neutral');
	});

	it('returns up direction when percent change is above 0.01 threshold', () => {
		const result = formatDelta(100, 100.1); // 0.1% change
		expect(result.direction).toBe('up');
	});

	it('returns 0 percent when current is 0', () => {
		const result = formatDelta(0, 50);
		expect(result.percent).toBe(0);
		expect(result.absolute).toBe(50);
		expect(result.direction).toBe('neutral');
	});

	it('calculates percent correctly for a doubling', () => {
		const result = formatDelta(50, 100);
		expect(result.percent).toBeCloseTo(100, 5);
		expect(result.direction).toBe('up');
	});

	it('calculates percent correctly for a halving', () => {
		const result = formatDelta(100, 50);
		expect(result.percent).toBeCloseTo(-50, 5);
		expect(result.direction).toBe('down');
	});
});

describe('hasSignificantChange', () => {
	it('returns true when percent change exceeds default threshold (1%)', () => {
		// |110/100 - 1| * 100 = 10% > 1% (threshold * 100 = 1)
		expect(hasSignificantChange(100, 110)).toBe(true);
	});

	it('returns false when percent change is below default threshold (1%)', () => {
		// |100.5/100 - 1| * 100 = 0.5% < 1%
		expect(hasSignificantChange(100, 100.5)).toBe(false);
	});

	it('returns false when values are equal', () => {
		expect(hasSignificantChange(100, 100)).toBe(false);
	});

	it('returns false when current is 0', () => {
		expect(hasSignificantChange(0, 100)).toBe(false);
	});

	it('respects a custom threshold', () => {
		// threshold=0.05 → threshold*100 = 5%
		// 106/100 - 1 = 6% > 5% → true
		expect(hasSignificantChange(100, 106, 0.05)).toBe(true);
		// 103/100 - 1 = 3% < 5% → false
		expect(hasSignificantChange(100, 103, 0.05)).toBe(false);
	});

	it('handles a decrease correctly', () => {
		// |80/100 - 1| * 100 = 20% > 1% → true
		expect(hasSignificantChange(100, 80)).toBe(true);
	});
});

describe('formatValue', () => {
	it('returns integer without decimal point when value is a whole number', () => {
		expect(formatValue(42)).toBe('42');
		expect(formatValue(0)).toBe('0');
		expect(formatValue(100)).toBe('100');
	});

	it('returns decimal value with default 1 decimal place', () => {
		expect(formatValue(3.14)).toBe('3.1');
		expect(formatValue(2.7)).toBe('2.7');
	});

	it('respects custom decimal places', () => {
		expect(formatValue(3.14159, 2)).toBe('3.14');
		expect(formatValue(3.14159, 3)).toBe('3.142');
		expect(formatValue(3.14159, 0)).toBe('3');
	});

	it('returns integer as string without decimals even with custom decimals arg', () => {
		// Number.isInteger(5) → true, returns '5' regardless of decimals
		expect(formatValue(5, 3)).toBe('5');
	});

	it('handles negative values', () => {
		expect(formatValue(-10)).toBe('-10');
		expect(formatValue(-3.5)).toBe('-3.5');
	});

	it('handles zero', () => {
		expect(formatValue(0)).toBe('0');
		expect(formatValue(0.0)).toBe('0');
	});
});
