import type { ScooterConfig, PerformanceStats, Bottleneck, Recommendation, PredictionMode, UpgradeDelta } from '$lib/types';
import { defaultConfig, presets, presetMetadata } from '$lib/data/presets';
import { calculatePerformance, detectBottlenecks, generateRecommendations, simulateUpgrade as simulateUpgradePhysics, calculateUpgradeDelta } from '$lib/utils/physics';
import { normalizeConfig, normalizeConfigValue, type ConfigNumericKey } from '$lib/utils/validators';

const baseConfig = normalizeConfig(defaultConfig, defaultConfig);

// Main calculator state
export const calculatorState = $state({
  config: { ...baseConfig },

  // UI state
  showAdvanced: false,
  compareMode: false,
  predictionMode: 'spec' as PredictionMode,
  simulatedConfig: null as ScooterConfig | null,
  activeUpgrade: null as 'parallel' | 'voltage' | 'controller' | 'motor' | 'tires' | null,

  // Computed values
  get stats(): PerformanceStats {
    return calculatePerformance(this.config, this.predictionMode);
  },

  get simStats(): PerformanceStats | null {
    if (!this.simulatedConfig) return null;
    return calculatePerformance(this.simulatedConfig, this.predictionMode);
  },

  get bottlenecks(): Bottleneck[] {
    return detectBottlenecks(this.stats, this.config);
  },

  get recommendations(): Recommendation[] {
    return generateRecommendations(this.config, this.stats);
  },

  get upgradeDelta(): UpgradeDelta | null {
    if (!this.activeUpgrade) return null;
    return calculateUpgradeDelta(this.config, this.activeUpgrade);
  }
});

// Actions
export function applyConfig(config: Partial<ScooterConfig>) {
  calculatorState.config = normalizeConfig(config, baseConfig);
}

export function loadPreset(presetKey: string) {
  const preset = presets[presetKey];
  if (preset) {
    applyConfig(preset);
  }
}

export function updateConfig<K extends ConfigNumericKey>(
  key: K,
  value: number | undefined
) {
  const normalizedValue = normalizeConfigValue(key, value, calculatorState.config[key]);
  calculatorState.config[key] = normalizedValue as ScooterConfig[K];
}

export function setPredictionMode(mode: PredictionMode) {
  calculatorState.predictionMode = mode;
}

export function simulateUpgrade(type: 'parallel' | 'voltage' | 'controller' | 'motor' | 'tires') {
  const current = { ...calculatorState.config };
  const newConfig = simulateUpgradePhysics(current, type);

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
