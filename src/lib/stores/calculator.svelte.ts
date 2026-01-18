import type { ScooterConfig, PerformanceStats, Bottleneck, Recommendation, PredictionMode, UpgradeDelta, RideMode, FormulaTrace } from '$lib/types';
import { defaultConfig, presets, presetMetadata } from '$lib/data/presets';
import { rideModePresets } from '$lib/data/ride-modes';
import { calculatePerformance, detectBottlenecks, generateRecommendations, simulateUpgrade as simulateUpgradePhysics, calculateUpgradeDelta } from '$lib/utils/physics';
import { generateFormulaTraces } from '$lib/utils/formulaGenerator';
import { normalizeConfig, normalizeConfigValue, type ConfigNumericKey } from '$lib/utils/validators';
import { exportConfiguration, importConfiguration } from '$lib/utils/configHandler';
import * as PHYSICS_CONSTANTS from '$lib/constants/physics';
import * as CACHE_CONSTANTS from '$lib/constants/cache';

const baseConfig = normalizeConfig(defaultConfig, defaultConfig);

type ShareConfigKey = Exclude<keyof ScooterConfig, 'id' | 'name'>;

const configKeys: ShareConfigKey[] = [
  'v',
  'ah',
  'motors',
  'watts',
  'controller',
  'style',
  'weight',
  'wheel',
  'motorKv',
  'scooterWeight',
  'drivetrainEfficiency',
  'batterySagPercent',
  'charger',
  'regen',
  'cost',
  'slope',
  'ridePosition',
  'soh',
  'ambientTemp'
];

function canUseBase64() {
  return typeof window !== 'undefined' && typeof btoa === 'function' && typeof atob === 'function';
}

function toBase64Url(value: string) {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const restored = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = restored.length % 4;
  const padded = padLength ? `${restored}${'='.repeat(4 - padLength)}` : restored;
  return atob(padded);
}

function encodeConfig(config: ScooterConfig) {
  if (!canUseBase64()) return null;
  const values = configKeys.map((key) => {
    const value = config[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  });
  return toBase64Url(JSON.stringify(values));
}

function decodeConfig(encoded: string) {
  if (!canUseBase64()) return null;
  try {
    const json = fromBase64Url(encoded);
    const values = JSON.parse(json);
    if (!Array.isArray(values)) return null;

    const config: Partial<Record<ShareConfigKey, number>> = {};
    configKeys.forEach((key, index) => {
      const value = values[index];
      if (typeof value === 'number' && Number.isFinite(value)) {
        config[key] = value;
      }
    });

    return config as Partial<ScooterConfig>;
  } catch (error) {
    return null;
  }
}

// Main calculator state
export const calculatorState = $state({
  config: { ...baseConfig },

  // UI state
  showAdvanced: false,
  compareMode: false,
  predictionMode: 'spec' as PredictionMode,
  activeTab: 'configuration' as 'configuration' | 'upgrades',
  simulatedConfig: null as ScooterConfig | null,
  activeUpgrade: null as 'parallel' | 'voltage' | 'controller' | 'motor' | 'tires' | null,
  rideMode: 'normal' as RideMode,

  // Formula details state
  formulas: [] as FormulaTrace[],
  showFormulas: false,

  // Computed values
  get stats(): PerformanceStats {
    return calculatePerformance(this.config, this.predictionMode);
  },

  get computedFormulas(): FormulaTrace[] {
    return generateFormulaTraces(this.config, this.stats);
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
  },

  setFormulas(formulas: FormulaTrace[]) {
    this.formulas = formulas;
  },

  setShowFormulas(show: boolean) {
    this.showFormulas = show;
  },

  regenerateFormulas() {
    this.formulas = generateFormulaTraces(this.config, this.stats);
  }
});

// Actions
export function applyConfig(config: Partial<ScooterConfig>) {
  calculatorState.config = normalizeConfig(config, baseConfig);
  calculatorState.regenerateFormulas();
}

export function loadPreset(presetKey: string) {
  const preset = presets[presetKey];
  if (preset) {
    // Preserve user's temperature setting when loading presets
    const currentTemp = calculatorState.config.ambientTemp;
    applyConfig(preset);
    calculatorState.config.ambientTemp = currentTemp;
  }
}

export function createShareLink(config: ScooterConfig) {
  if (typeof window === 'undefined') return null;
  const encoded = encodeConfig(config);
  if (!encoded) return null;
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('cfg', encoded);
  return url.toString();
}

export function loadConfigFromUrl() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('cfg');
  if (!encoded) return false;
  const decoded = decodeConfig(encoded);
  if (!decoded) return false;
  applyConfig(decoded);
  return true;
}

export { exportConfiguration, importConfiguration };

export function updateConfig<K extends ConfigNumericKey>(
  key: K,
  value: number | undefined
) {
  const normalizedValue = normalizeConfigValue(key, value, calculatorState.config[key]);
  calculatorState.config[key] = normalizedValue as ScooterConfig[K];
  calculatorState.regenerateFormulas();
}

export function setPredictionMode(mode: PredictionMode) {
  calculatorState.predictionMode = mode;
}

export function applyRideMode(mode: RideMode) {
  const preset = rideModePresets[mode];
  if (preset) {
    calculatorState.config.style = preset.style;
    calculatorState.config.regen = preset.regen;
    calculatorState.rideMode = mode;
  }
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

export function setActiveTab(tab: 'configuration' | 'upgrades') {
  calculatorState.activeTab = tab;
}
