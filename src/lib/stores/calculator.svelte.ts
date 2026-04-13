import type {
	ScooterConfig,
	PerformanceStats,
	Bottleneck,
	Recommendation,
	PredictionMode,
	UpgradeDelta,
	RideMode,
} from '$lib/types';
import { defaultConfig, presets, presetMetadata } from '$lib/data/presets';
import { rideModePresets } from '$lib/data/ride-modes';
import {
	calculatePerformance,
	detectBottlenecks,
	generateRecommendations,
	getAllUpgrades,
	simulateUpgrade as simulateUpgradePhysics,
	calculateUpgradeDelta,
} from '$lib/physics';
import { normalizeConfig, normalizeConfigValue, type ConfigNumericKey } from '$lib/utils/validators';
import { showToast as _showToast } from './toast.svelte';

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
	'ambientTemp',
	'dragCoefficient',
	'frontalArea',
	'rollingResistance',
];

function canUseBase64(): boolean {
	return typeof window !== 'undefined' && typeof btoa === 'function' && typeof atob === 'function';
}

function toBase64Url(value: string): string {
	try {
		return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
	} catch {
		return '';
	}
}

function fromBase64Url(value: string): string | null {
	try {
		const restored = value.replace(/-/g, '+').replace(/_/g, '/');
		const padLength = restored.length % 4;
		const padded = padLength ? `${restored}${'='.repeat(4 - padLength)}` : restored;
		return atob(padded);
	} catch {
		return null;
	}
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
		if (!json) return null;
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
	} catch (_error) {
		return null;
	}
}

// Re-export toast utilities for backwards compatibility
export { toastState, showToast, clearToast, clearAllToasts } from './toast.svelte';

// Main calculator state
export const calculatorState = $state({
	config: { ...baseConfig },

	predictionMode: 'spec' as PredictionMode,
	simulatedConfig: null as ScooterConfig | null,
	activeUpgrade: null as 'parallel' | 'voltage' | 'controller' | 'motor' | 'tires' | null,
	rideMode: 'normal' as RideMode,
	activePresetKey: 'custom' as string,

	// Computed values
	get activePresetName(): string {
		if (this.activePresetKey === 'custom') return 'Custom Configuration';
		return presetMetadata[this.activePresetKey]?.name || 'Unknown Model';
	},

	get performanceGrade(): 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'F' {
		const s = this.stats;
		const accel = s.accelScore; // 0-100

		// Strain penalty: Penalize C-rates above 2.5C
		const strainPenalty = Math.max(0, (s.cRate - 2.5) * 15);

		// Efficiency bonus: Reward low Wh/km (standard is ~25-30)
		const efficiencyBonus = Math.max(0, (30 - this.config.style) * 0.5);

		let score = accel - strainPenalty + efficiencyBonus;

		// Clamp score to 0-100 for grading
		score = Math.max(0, Math.min(100, score));

		if (score >= 95) return 'A+';
		if (score >= 88) return 'A';
		if (score >= 82) return 'A-';
		if (score >= 75) return 'B+';
		if (score >= 68) return 'B';
		if (score >= 60) return 'B-';
		if (score >= 52) return 'C+';
		if (score >= 45) return 'C';
		if (score >= 38) return 'C-';
		if (score >= 30) return 'D+';
		if (score >= 20) return 'D';
		return 'F';
	},

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

	get incompatibleUpgrades(): Recommendation[] {
		const recommendedTypes = new Set(this.recommendations.map((r) => r.upgradeType));
		return getAllUpgrades(this.config, this.stats).filter((u) => !recommendedTypes.has(u.upgradeType));
	},

	get upgradeDelta(): UpgradeDelta | null {
		if (!this.activeUpgrade) return null;
		return calculateUpgradeDelta(this.config, this.activeUpgrade);
	},
});

// Actions
export function applyConfig(config: Partial<ScooterConfig>) {
	calculatorState.config = normalizeConfig(config, baseConfig);
}

export function loadPreset(presetKey: string) {
	const preset = presets[presetKey];
	if (preset) {
		// Preserve user's temperature setting when loading presets
		const currentTemp = calculatorState.config.ambientTemp;
		applyConfig(preset);
		calculatorState.config.ambientTemp = currentTemp;
		calculatorState.activePresetKey = presetKey;

		const presetName = presetKey === 'custom' ? 'Manual Entry' : presetMetadata[presetKey]?.name || presetKey;
		_showToast(`Preset loaded: ${presetName}`, 'success');
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
	// Normalize decoded URL params through the same validation pipeline
	// as user input to prevent crafted URLs with out-of-range values
	applyConfig(normalizeConfig(decoded, baseConfig));
	return true;
}

export function updateConfig<K extends ConfigNumericKey>(key: K, value: number | undefined) {
	const normalizedValue = normalizeConfigValue(key, value, calculatorState.config[key]);
	calculatorState.config[key] = normalizedValue as ScooterConfig[K];
	calculatorState.activePresetKey = 'custom';
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

export function resetConfig() {
	applyConfig(baseConfig);
	calculatorState.activePresetKey = 'custom';
	_showToast('Configuration reset', 'info');
}
