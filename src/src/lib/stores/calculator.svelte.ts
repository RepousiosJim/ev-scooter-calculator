import type { ScooterConfig, PerformanceStats, Bottleneck } from '$lib/types';
import { presets } from '$lib/data/presets';
import { calculatePerformance, detectBottlenecks } from '$lib/utils/physics';

// Main calculator state
export const calculatorState = $state({
  config: { ...presets.custom } as ScooterConfig,

  // UI state
  showAdvanced: false,
  compareMode: false,
  simulatedConfig: null as ScooterConfig | null,
  activeUpgrade: null as 'parallel' | 'voltage' | 'controller' | null,

  // Computed values
  get stats(): PerformanceStats {
    return calculatePerformance(this.config);
  },

  get simStats(): PerformanceStats | null {
    if (!this.simulatedConfig) return null;
    return calculatePerformance(this.simulatedConfig);
  },

  get bottlenecks(): Bottleneck[] {
    return detectBottlenecks(this.stats, this.config);
  }
});

// Actions
export function loadPreset(presetKey: string) {
  const preset = presets[presetKey];
  if (preset) {
    calculatorState.config = { ...preset };
  }
}

export function updateConfig<K extends keyof ScooterConfig>(
  key: K,
  value: ScooterConfig[K]
) {
  calculatorState.config[key] = value;
}

export function simulateUpgrade(type: 'parallel' | 'voltage' | 'controller') {
  const current = { ...calculatorState.config };
  const newConfig: ScooterConfig = { ...current };

  if (type === 'parallel') {
    newConfig.ah *= 2;
  } else if (type === 'voltage') {
    newConfig.v *= 1.15;
  } else if (type === 'controller') {
    // Controller upgrade doesn't change config directly
    // It's simulated in calculations
  }

  calculatorState.simulatedConfig = newConfig;
  calculatorState.activeUpgrade = type;
}

export function clearSimulation() {
  calculatorState.simulatedConfig = null;
  calculatorState.activeUpgrade = null;
}

export function toggleCompareMode(enabled: boolean) {
  calculatorState.compareMode = enabled;
}
