import { describe, it, expect } from 'vitest';
import { calculatorState, loadPreset, simulateUpgrade, applyRideMode, updateConfig } from '$lib/stores/calculator.svelte';
import { defaultConfig } from '$lib/data/presets';

describe('Calculator Integration', () => {
  it('loads preset and updates all calculations', () => {
    loadPreset('m365_2025');

    expect(calculatorState.config.v).toBe(52);
    expect(calculatorState.stats.totalRange).toBeGreaterThan(0);
    expect(calculatorState.stats.speed).toBeGreaterThan(0);
    expect(calculatorState.stats.totalWatts).toBeGreaterThan(0);
  });

  it('applies ride mode and updates config', () => {
    loadPreset('custom');
    const initialStyle = calculatorState.config.style;

    applyRideMode('eco');

    expect(calculatorState.config.style).toBeLessThan(initialStyle);
    expect(calculatorState.rideMode).toBe('eco');
    expect(calculatorState.config.regen).toBeGreaterThan(0);
  });

  it('applies sport ride mode correctly', () => {
    loadPreset('custom');

    applyRideMode('sport');

    expect(calculatorState.rideMode).toBe('sport');
    expect(calculatorState.config.style).toBe(32);
  });

  it('simulates upgrade and calculates deltas', () => {
    loadPreset('m365_2025');
    simulateUpgrade('parallel');

    expect(calculatorState.simulatedConfig?.ah).toBe(32); // 16 * 2
    expect(calculatorState.upgradeDelta?.rangeChange).toBeGreaterThan(0);
    expect(calculatorState.upgradeDelta?.cRateChange).toBeLessThan(0);
  });

  it('simulates voltage upgrade correctly', () => {
    loadPreset('m365_2025');
    const initialVoltage = calculatorState.config.v;

    simulateUpgrade('voltage');

    expect(calculatorState.simulatedConfig?.v).toBeGreaterThan(initialVoltage);
    expect(calculatorState.upgradeDelta?.speedChange).toBeGreaterThan(0);
  });

  it('updates configuration values', () => {
    loadPreset('custom');

    updateConfig('v', 72);
    expect(calculatorState.config.v).toBe(72);

    updateConfig('ah', 30);
    expect(calculatorState.config.ah).toBe(30);
  });

  it('calculates acceleration score correctly', () => {
    updateConfig('watts', 3000);
    updateConfig('weight', 60);

    expect(calculatorState.stats.accelScore).toBeGreaterThan(60);
  });

  it('detects bottlenecks for high C-rate', () => {
    updateConfig('v', 36);
    updateConfig('ah', 10);
    updateConfig('motors', 2);
    updateConfig('watts', 3000);

    expect(calculatorState.bottlenecks.length).toBeGreaterThan(0);
    expect(calculatorState.bottlenecks.some(b => b.type === 'SAG_WARNING')).toBe(true);
  });

  it('generates recommendations based on configuration', () => {
    updateConfig('v', 36);
    updateConfig('ah', 10);
    updateConfig('motors', 1);
    updateConfig('watts', 300);

    expect(calculatorState.recommendations.length).toBeGreaterThan(0);
  });

  it('switches prediction mode between spec and realworld', () => {
    calculatorState.predictionMode = 'spec';
    const specRange = calculatorState.stats.totalRange;

    calculatorState.predictionMode = 'realworld';
    const realworldRange = calculatorState.stats.totalRange;

    // Realworld mode typically shows different range (may be lower or similar)
    expect(realworldRange).toBeLessThanOrEqual(specRange);
  });

  it('toggles advanced settings', () => {
    expect(calculatorState.showAdvanced).toBe(false);

    calculatorState.showAdvanced = true;
    expect(calculatorState.showAdvanced).toBe(true);
  });

  it('calculates hill speed correctly', () => {
    updateConfig('slope', 10);

    const hillSpeed = calculatorState.stats.hillSpeed;
    const flatSpeed = calculatorState.stats.speed;

    // Hill speed should be lower than flat speed
    expect(hillSpeed).toBeLessThan(flatSpeed);
    expect(hillSpeed).toBeGreaterThan(0);
  });

  it('applies temperature factor to calculations', () => {
    updateConfig('ambientTemp', -10);
    const coldRange = calculatorState.stats.totalRange;

    updateConfig('ambientTemp', 25);
    const warmRange = calculatorState.stats.totalRange;

    // Warmer temperature should give more range
    expect(warmRange).toBeGreaterThan(coldRange);
  });

  it('applies battery health to calculations', () => {
    updateConfig('soh', 1.0);
    const healthyRange = calculatorState.stats.totalRange;

    updateConfig('soh', 0.6);
    const degradedRange = calculatorState.stats.totalRange;

    // Degraded battery should give less range
    expect(degradedRange).toBeLessThan(healthyRange);
  });

  it('calculates cost per 100km', () => {
    updateConfig('cost', 0.20);
    const cost = calculatorState.stats.costPer100km;

    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(10); // Shouldn't be excessive
  });

  it('calculates charging time', () => {
    updateConfig('v', 52);
    updateConfig('ah', 20);
    updateConfig('charger', 5);

    const chargeTime = calculatorState.stats.chargeTime;

    expect(chargeTime).toBeGreaterThan(0);
    expect(chargeTime).toBeLessThan(10); // Shouldn't take > 10 hours
  });
});
