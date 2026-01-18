import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatEnergy,
  formatSpeed,
  formatRange,
  formatTime,
  formatPower,
  formatCRate
} from '$lib/utils/formatters';

describe('Formatters', () => {
  describe('formatNumber', () => {
    it('returns integer as string without decimals', () => {
      expect(formatNumber(100)).toBe('100');
    });

    it('returns float with default 1 decimal', () => {
      expect(formatNumber(100.456)).toBe('100.5');
    });

    it('returns float with specified decimals', () => {
      expect(formatNumber(100.456789, 2)).toBe('100.46');
    });

    it('handles zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('handles negative numbers', () => {
      expect(formatNumber(-42.5)).toBe('-42.5');
    });
  });

  describe('formatCurrency', () => {
    it('formats with default $ symbol', () => {
      expect(formatCurrency(42.5)).toBe('$42.50');
    });

    it('formats with custom currency symbol', () => {
      expect(formatCurrency(42.5, '€')).toBe('€42.50');
    });

    it('rounds to 2 decimals', () => {
      expect(formatCurrency(42.567)).toBe('$42.57');
    });
  });

  describe('formatPercentage', () => {
    it('multiplies by 100 and adds percent', () => {
      expect(formatPercentage(0.75)).toBe('75%');
    });

    it('rounds to nearest integer', () => {
      expect(formatPercentage(0.756)).toBe('76%');
    });

    it('handles zero', () => {
      expect(formatPercentage(0)).toBe('0%');
    });

    it('handles values > 1', () => {
      expect(formatPercentage(1.5)).toBe('150%');
    });
  });

  describe('formatEnergy', () => {
    it('formats watt-hours', () => {
      expect(formatEnergy(748)).toBe('748 Wh');
    });

    it('rounds to nearest integer', () => {
      expect(formatEnergy(748.7)).toBe('749 Wh');
    });

    it('handles large values', () => {
      expect(formatEnergy(3600)).toBe('3600 Wh');
    });
  });

  describe('formatSpeed', () => {
    it('formats speed with 1 decimal', () => {
      expect(formatSpeed(42.5)).toBe('42.5');
    });

    it('uses default 1 decimal', () => {
      expect(formatSpeed(42.567)).toBe('42.6');
    });
  });

  describe('formatRange', () => {
    it('formats range with 1 decimal', () => {
      expect(formatRange(85.7)).toBe('85.7');
    });

    it('uses default 1 decimal', () => {
      expect(formatRange(85.74)).toBe('85.7');
    });
  });

  describe('formatTime', () => {
    it('formats time with 1 decimal', () => {
      expect(formatTime(3.5)).toBe('3.5');
    });

    it('uses default 1 decimal', () => {
      expect(formatTime(3.56)).toBe('3.6');
    });
  });

  describe('formatPower', () => {
    it('formats watts with W unit', () => {
      expect(formatPower(1600)).toBe('1600 W');
    });

    it('rounds to nearest integer', () => {
      expect(formatPower(1600.7)).toBe('1601 W');
    });

    it('handles large values', () => {
      expect(formatPower(10000)).toBe('10000 W');
    });
  });

  describe('formatCRate', () => {
    it('formats C-rate with 2 decimals', () => {
      expect(formatCRate(2.5)).toBe('2.50');
    });

    it('uses default 2 decimals', () => {
      expect(formatCRate(2.567)).toBe('2.57');
    });

    it('handles low values', () => {
      expect(formatCRate(0.5)).toBe('0.50');
    });

    it('handles high values', () => {
      expect(formatCRate(5.25)).toBe('5.25');
    });
  });
});
