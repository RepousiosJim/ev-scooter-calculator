import { describe, it, expect } from 'vitest';
import * as Formulas from '$lib/utils/formulas';

describe('Physics Formulas', () => {
  describe('Temperature Formulas', () => {
    it('calculates temperature factor correctly at optimal temperature', () => {
      expect(Formulas.calculateTemperatureFactor(20)).toBe(1.0);
      expect(Formulas.calculateTemperatureFactor(25)).toBe(1.0);
    });

    it('calculates temperature factor correctly at freezing', () => {
      expect(Formulas.calculateTemperatureFactor(-20)).toBe(0.6);
    });

    it('calculates temperature factor correctly at mid-range', () => {
      expect(Formulas.calculateTemperatureFactor(0)).toBe(0.8);
    });
  });

  describe('Energy Formulas', () => {
    it('calculates battery energy correctly', () => {
      expect(Formulas.calculateBatteryEnergy(52, 16, 1.0, 1.0)).toBe(832);
      expect(Formulas.calculateBatteryEnergy(52, 16, 0.8, 0.6)).toBeCloseTo(399.36, 2);
    });
  });

  describe('Speed Formulas', () => {
    it('calculates theoretical max speed correctly', () => {
      const result = Formulas.calculateTheoreticalMaxSpeed(150, 72, 10, 0.92);
      expect(result).toBeCloseTo(475.7, 0.5);
    });

    it('calculates drag-limited speed correctly', () => {
      const result = Formulas.calculateDragLimitedSpeed(3000, 0.6, 1.225, 15, 100);
      expect(result).toBeCloseTo(72.4, 0.5);
    });
  });

  describe('Power Formulas', () => {
    it('calculates total power correctly', () => {
      expect(Formulas.calculateTotalPower(2, 1600, 1.0, 1.0)).toBe(3200);
      expect(Formulas.calculateTotalPower(2, 1600, 1.0, 0.7)).toBe(2240);
    });
  });

  describe('Range Formulas', () => {
    it('calculates base range correctly', () => {
      expect(Formulas.calculateBaseRange(832, 30)).toBeCloseTo(27.73, 1);
    });

    it('calculates regen gain correctly', () => {
      expect(Formulas.calculateRegenGain(100, 0.85)).toBe(17);
    });
  });

  describe('Metrics Formulas', () => {
    it('calculates power-to-weight ratio correctly', () => {
      expect(Formulas.calculatePowerToWeightRatio(3200, 100)).toBe(32);
    });

    it('calculates acceleration score correctly', () => {
      expect(Formulas.calculateAccelerationScore(25)).toBe(100);
      expect(Formulas.calculateAccelerationScore(12.5)).toBe(50);
    });

    it('calculates C-rate correctly', () => {
      expect(Formulas.calculateCRate(160, 16)).toBe(10);
    });
  });

  describe('Weight Formulas', () => {
    it('estimates scooter weight correctly', () => {
      expect(Formulas.estimateScooterWeight(832)).toBeCloseTo(64.92, 1);
    });
  });
});
