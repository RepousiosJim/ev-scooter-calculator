import { describe, it, expect } from 'vitest';
import { validateField, normalizeConfig, normalizeConfigValue } from '$lib/utils/validators';
import { defaultConfig } from '$lib/data/presets';

describe('Validators', () => {
  it('validates voltage within range', () => {
    const result = validateField('v', 52);
    expect(result.isValid).toBe(true);
  });

  it('rejects voltage below minimum', () => {
    const result = validateField('v', 20);
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('24-96V');
  });

  it('rejects voltage above maximum', () => {
    const result = validateField('v', 150);
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('24-96V');
  });

  it('validates battery capacity', () => {
    const result = validateField('ah', 16);
    expect(result.isValid).toBe(true);
  });

  it('rejects battery capacity below minimum', () => {
    const result = validateField('ah', 3);
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('5+ Ah');
  });

  it('validates motor count', () => {
    const result = validateField('motors', 2);
    expect(result.isValid).toBe(true);
  });

  it('validates power per motor', () => {
    const result = validateField('watts', 1600);
    expect(result.isValid).toBe(true);
  });

  it('clamps values to allowed range', () => {
    const clamped = normalizeConfigValue('v', 200, 52);
    expect(clamped).toBe(96); // max value
  });

  it('clamps values to minimum', () => {
    const clamped = normalizeConfigValue('v', 10, 52);
    expect(clamped).toBe(24); // min value
  });

  it('preserves optional fields when undefined', () => {
    const normalized = normalizeConfig({ v: 52 }, defaultConfig);
    expect(normalized.controller).toBeUndefined();
  });

  it('normalizes full config object', () => {
    const input = {
      v: 48,
      ah: 20,
      motors: 1,
      watts: 500,
      style: 30,
      weight: 75,
      wheel: 10,
      charger: 3,
      regen: 0.05,
      cost: 0.20,
      slope: 0,
      ridePosition: 0.6,
      soh: 1,
      ambientTemp: 20
    };

    const normalized = normalizeConfig(input, defaultConfig);
    expect(normalized.v).toBe(48);
    expect(normalized.ah).toBe(20);
    expect(normalized.motors).toBe(1);
    expect(normalized.watts).toBe(500);
  });

  it('handles NaN values by using fallback', () => {
    const clamped = normalizeConfigValue('v', NaN, 52);
    expect(clamped).toBe(52); // uses fallback
  });

  it('handles Infinity values by using fallback', () => {
    const clamped = normalizeConfigValue('v', Infinity, 52);
    expect(clamped).toBe(52); // uses fallback
  });

  it('validates temperature range', () => {
    const resultLow = validateField('ambientTemp', -10);
    expect(resultLow.isValid).toBe(true);

    const resultHigh = validateField('ambientTemp', 30);
    expect(resultHigh.isValid).toBe(true);
  });

  it('rejects temperature outside range', () => {
    const result = validateField('ambientTemp', -30);
    const result2 = validateField('ambientTemp', 60);
    
    // These should be invalid as they're outside -20 to 50
    expect(result.isValid).toBe(false);
    expect(result2.isValid).toBe(false);
  });

  it('preserves id and name fields', () => {
    const input = {
      id: 12345,
      name: 'Custom Scooter'
    };

    const normalized = normalizeConfig(input, defaultConfig);
    expect(normalized.id).toBe(12345);
    expect(normalized.name).toBe('Custom Scooter');
  });
});
