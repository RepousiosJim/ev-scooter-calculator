import { describe, it, expect, beforeAll } from 'vitest';
import { calculatePerformance } from '$lib/utils/physics';
import { defaultConfig } from '$lib/data/presets';

describe('Calculation Performance', () => {
  beforeAll(() => {
    // Warm up the cache
    calculatePerformance(defaultConfig, 'spec');
  });

  it('completes 100 calculations within 100ms', () => {
    const start = performance.now();
    
    for (let i = 0; i < 100; i++) {
      calculatePerformance(defaultConfig, 'spec');
    }
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('completes 1000 calculations within 1000ms', () => {
    const start = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      calculatePerformance(defaultConfig, 'spec');
    }
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000);
  });

  it('cache hit is significantly faster than cache miss', () => {
    const cacheHitTime = measureTime(() => calculatePerformance(defaultConfig, 'spec'));
    const cacheMissTime = measureTime(() => calculatePerformance({ ...defaultConfig, v: 48 }, 'spec'));
    
    // Cache hit should be significantly faster than cache miss
    expect(cacheHitTime).toBeLessThan(cacheMissTime);
  });

  it('optimized calculations complete within 1ms', () => {
    const start = performance.now();
    
    for (let i = 0; i < 10; i++) {
      calculatePerformance(defaultConfig, 'spec');
    }
    
    const duration = performance.now() - start;
    const avgDuration = duration / 10;
    
    // Average should be under 1ms after cache is warmed up
    expect(avgDuration).toBeLessThan(1);
  });

  it('handles high-speed configurations efficiently', () => {
    const highSpeedConfig = {
      ...defaultConfig,
      v: 72,
      ah: 40,
      motors: 2,
      watts: 2000
    };

    const start = performance.now();
    for (let i = 0; i < 50; i++) {
      calculatePerformance(highSpeedConfig, 'spec');
    }
    const duration = performance.now() - start;
    
    // Should complete within reasonable time even for high-power configs
    expect(duration).toBeLessThan(50);
  });

  it('different configs maintain consistent performance', () => {
    const configs = [
      defaultConfig,
      { ...defaultConfig, v: 36 },
      { ...defaultConfig, v: 48 },
      { ...defaultConfig, v: 60 },
      { ...defaultConfig, v: 72 }
    ];

    const times = configs.map(config => 
      measureTime(() => calculatePerformance(config, 'spec'))
    );

    // All calculations should complete within 5ms
    times.forEach(time => {
      expect(time).toBeLessThan(5);
    });
  });

  it('realworld mode has similar performance to spec mode', () => {
    const specTime = measureTime(() => calculatePerformance(defaultConfig, 'spec'));
    const realworldTime = measureTime(() => calculatePerformance(defaultConfig, 'realworld'));
    
    // Both modes should have similar performance characteristics
    expect(Math.abs(specTime - realworldTime)).toBeLessThan(2);
  });
});

function measureTime(fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}
