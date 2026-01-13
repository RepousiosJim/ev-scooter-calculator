import { describe, it, expect } from 'vitest';
import { calculatePerformance, detectBottlenecks } from '$lib/utils/physics';
import type { ScooterConfig } from '$lib/types';

describe('Physics Calculations', () => {
  const defaultConfig: ScooterConfig = {
    v: 52,
    ah: 16,
    motors: 2,
    watts: 1600,
    style: 30,
    weight: 80,
    wheel: 10,
    charger: 3,
    regen: 0.05,
    cost: 0.20,
    slope: 0,
    ridePosition: 0.6,
    soh: 1
  };

  it('calculates basic performance metrics', () => {
    const result = calculatePerformance(defaultConfig);

    expect(result.wh).toBeGreaterThan(0);
    expect(result.totalRange).toBeGreaterThan(0);
    expect(result.speed).toBeGreaterThan(0);
    expect(result.totalWatts).toBe(3200);
  });

  it('applies battery health correctly', () => {
    const config = { ...defaultConfig, soh: 0.8 };
    const result = calculatePerformance(config);

    expect(result.wh).toBe(defaultConfig.v * defaultConfig.ah * 0.8);
  });

  it('calculates hill climb speed', () => {
    const config = { ...defaultConfig, slope: 10 };
    const result = calculatePerformance(config);

    expect(result.hillSpeed).toBeLessThan(result.speed);
    expect(result.hillSpeed).toBeGreaterThan(0);
  });

  it('applies drag coefficient for different riding positions', () => {
    const uprightConfig = { ...defaultConfig, ridePosition: 0.6 };
    const tuckConfig = { ...defaultConfig, ridePosition: 0.4 };

    const uprightResult = calculatePerformance(uprightConfig);
    const tuckResult = calculatePerformance(tuckConfig);

    expect(tuckResult.speed).toBeGreaterThan(uprightResult.speed);
  });

  it('calculates acceleration score based on power-to-weight', () => {
    const lightConfig = { ...defaultConfig, weight: 60 };
    const heavyConfig = { ...defaultConfig, weight: 120 };

    const lightResult = calculatePerformance(lightConfig);
    const heavyResult = calculatePerformance(heavyConfig);

    expect(lightResult.accelScore).toBeGreaterThan(heavyResult.accelScore);
  });

  it('calculates C-rate correctly', () => {
    const result = calculatePerformance(defaultConfig);

    expect(result.cRate).toBe(result.amps / defaultConfig.ah);
    expect(result.cRate).toBeGreaterThan(0);
  });
});

describe('Bottleneck Detection', () => {
  it('detects high C-rate bottleneck', () => {
    const config: ScooterConfig = {
      v: 36,
      ah: 10,
      motors: 2,
      watts: 3000,
      style: 30,
      weight: 80,
      wheel: 10,
      charger: 3,
      regen: 0.05,
      cost: 0.20,
      slope: 0,
      ridePosition: 0.6,
      soh: 1
    };

    const stats = calculatePerformance(config);
    const bottlenecks = detectBottlenecks(stats, config);

    expect(bottlenecks.some(b => b.type === 'SAG_WARNING')).toBe(true);
  });

  it('detects controller limit bottleneck', () => {
    const config: ScooterConfig = {
      v: 52,
      ah: 16,
      motors: 2,
      watts: 2000,
      style: 30,
      weight: 80,
      wheel: 10,
      charger: 3,
      regen: 0.05,
      cost: 0.20,
      slope: 0,
      ridePosition: 0.6,
      soh: 1,
      controller: 50
    };

    const stats = calculatePerformance(config);
    const bottlenecks = detectBottlenecks(stats, config);

    expect(bottlenecks.some(b => b.type === 'CONTROLLER_LIMIT')).toBe(true);
  });

  it('detects hill climb bottleneck', () => {
    const config: ScooterConfig = {
      v: 36,
      ah: 10,
      motors: 1,
      watts: 500,
      style: 30,
      weight: 100,
      wheel: 8,
      charger: 2,
      regen: 0.05,
      cost: 0.20,
      slope: 15,
      ridePosition: 0.6,
      soh: 1
    };

    const stats = calculatePerformance(config);
    const bottlenecks = detectBottlenecks(stats, config);

    expect(bottlenecks.some(b => b.type === 'HILL_CLIMB_LIMIT')).toBe(true);
  });
});
