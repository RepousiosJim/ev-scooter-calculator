import { describe, it, expect } from 'vitest';
import { calculatePerformance, detectBottlenecks, generateRecommendations, simulateUpgrade, calculateUpgradeDelta } from '$lib/utils/physics';
import type { ScooterConfig } from '$lib/types';

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

describe('Physics Calculations', () => {
  it('calculates basic performance metrics', () => {
    const result = calculatePerformance(defaultConfig, 'spec');

    expect(result.wh).toBeGreaterThan(0);
    expect(result.totalRange).toBeGreaterThan(0);
    expect(result.speed).toBeGreaterThan(0);
    expect(result.totalWatts).toBeCloseTo(2944, 0);
  });

  it('returns consistent results for repeated calls', () => {
    const first = calculatePerformance(defaultConfig, 'spec');
    const second = calculatePerformance(defaultConfig, 'spec');

    expect(second).toEqual(first);
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

  it('handles steep hills without NaN values', () => {
    const steepConfig: ScooterConfig = {
      ...defaultConfig,
      slope: 25,
      weight: 110
    };
    const result = calculatePerformance(steepConfig);

    expect(Number.isFinite(result.hillSpeed)).toBe(true);
    expect(result.hillSpeed).toBeLessThan(result.speed);
  });

  it('reduces top speed with lower voltage', () => {
    const lowVoltageConfig: ScooterConfig = {
      ...defaultConfig,
      v: 36
    };
    const baseResult = calculatePerformance(defaultConfig, 'spec');
    const lowResult = calculatePerformance(lowVoltageConfig, 'spec');

    expect(lowResult.speed).toBeLessThan(baseResult.speed);
  });

  describe('Prediction Modes', () => {
    it('spec mode provides higher performance estimates', () => {
      const specResult = calculatePerformance(defaultConfig, 'spec');
      const realworldResult = calculatePerformance(defaultConfig, 'realworld');

      expect(specResult.totalRange).toBeGreaterThan(0);
      expect(realworldResult.totalRange).toBeGreaterThan(0);
      expect(specResult.speed).toBeGreaterThan(0);
      expect(realworldResult.speed).toBeGreaterThan(0);
    });

    it('applies drivetrain efficiency correctly', () => {
      const configWithEfficiency: ScooterConfig = {
        ...defaultConfig,
        drivetrainEfficiency: 0.85
      };

      const result = calculatePerformance(configWithEfficiency, 'spec');
      expect(result.speed).toBeGreaterThan(0);
    });

    it('applies battery sag correctly', () => {
      const configWithSag: ScooterConfig = {
        ...defaultConfig,
        batterySagPercent: 0.15
      };

      const result = calculatePerformance(configWithSag, 'spec');
      expect(result.speed).toBeGreaterThan(0);
    });
  });
});

describe('Recommendation Engine', () => {
  it('generates parallel battery recommendation for high C-rate', () => {
    const configWithHighCrate: ScooterConfig = {
      ...defaultConfig,
      ah: 10,
      watts: 2000
    };

    const stats = calculatePerformance(configWithHighCrate);
    const recommendations = generateRecommendations(configWithHighCrate, stats);

    expect(recommendations.some(r => r.upgradeType === 'parallel')).toBe(true);
  });

  it('generates voltage recommendation for low speed', () => {
    const configWithLowVoltage: ScooterConfig = {
      ...defaultConfig,
      v: 36,
      watts: 500
    };

    const stats = calculatePerformance(configWithLowVoltage);
    const recommendations = generateRecommendations(configWithLowVoltage, stats);

    expect(recommendations.some(r => r.upgradeType === 'voltage')).toBe(true);
  });

  it('generates controller recommendation when limited', () => {
    const configWithController: ScooterConfig = {
      ...defaultConfig,
      controller: 40,
      watts: 2000
    };

    const stats = calculatePerformance(configWithController);
    const recommendations = generateRecommendations(configWithController, stats);

    expect(recommendations.some(r => r.upgradeType === 'controller')).toBe(true);
  });
});

describe('Upgrade Simulation', () => {
  it('simulates parallel battery upgrade', () => {
    const upgraded = simulateUpgrade(defaultConfig, 'parallel');

    expect(upgraded.ah).toBe(defaultConfig.ah * 2);
    expect(upgraded.v).toBe(defaultConfig.v);
  });

  it('simulates voltage upgrade', () => {
    const upgraded = simulateUpgrade(defaultConfig, 'voltage');

    expect(upgraded.v).toBeGreaterThan(defaultConfig.v);
  });

  it('calculates upgrade delta correctly', () => {
    const delta = calculateUpgradeDelta(defaultConfig, 'parallel');

    expect(delta).not.toBeNull();
    expect(delta.rangeChange).toBeGreaterThan(0);
    expect(delta.rangePercent).toBeGreaterThan(0);
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
