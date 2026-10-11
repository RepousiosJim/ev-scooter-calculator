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
import { resolvePresetKey } from '$lib/data/preset-aliases';
import { rideModePresets } from '$lib/data/ride-modes';
import { terrainModePresets } from '$lib/data/terrain-modes';
import type { TerrainMode } from '$lib/types';
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
import { consumptionWhPerKm } from '$lib/utils/scoring';

const baseConfig = normalizeConfig(defaultConfig, defaultConfig);

type ShareConfigKey = Exclude<keyof ScooterConfig, 'id' | 'name'>;

// Positional: share links encode values in this order, so only ever APPEND new
// keys — reordering or removing entries breaks existing links.
export const configKeys: ShareConfigKey[] = [
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
	'rpm',
	'speedCap',
	'speedFactor',
	'powerLimit',
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

export function encodeConfig(config: ScooterConfig) {
	if (!canUseBase64()) return null;
	const values = configKeys.map((key) => {
		const value = config[key];
		return typeof value === 'number' && Number.isFinite(value) ? value : null;
	});
	return toBase64Url(JSON.stringify(values));
}

export function decodeConfig(encoded: string) {
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
export { toastState, showToast } from './toast.svelte';

type UpgradeType = 'parallel' | 'voltage' | 'controller' | 'motor' | 'tires';
type PerformanceGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'F';

/**
 * Main calculator state.
 *
 * Derived values use `$derived` so each is computed once per change and shared
 * by every reader. (Plain getters on a `$state` object recompute on every read —
 * `stats` alone was being recalculated ~11 times per update.)
 */
class CalculatorStore {
	config = $state<ScooterConfig>({ ...baseConfig });
	predictionMode = $state<PredictionMode>('spec');
	simulatedConfig = $state<ScooterConfig | null>(null);
	activeUpgrade = $state<UpgradeType | null>(null);
	/** Null when the current config doesn't correspond to a ride mode (e.g. after loading a preset). */
	rideMode = $state<RideMode | null>(null);
	terrainMode = $state<TerrainMode>('urban');
	activePresetKey = $state<string>('custom');

	activePresetName = $derived.by(() => {
		if (this.activePresetKey === 'custom') return 'Custom Configuration';
		return presetMetadata[this.activePresetKey]?.name || 'Unknown Model';
	});

	specStats = $derived(calculatePerformance(this.config, 'spec'));
	realworldStats = $derived(calculatePerformance(this.config, 'realworld'));
	stats = $derived<PerformanceStats>(this.predictionMode === 'realworld' ? this.realworldStats : this.specStats);

	simStats = $derived<PerformanceStats | null>(
		this.simulatedConfig ? calculatePerformance(this.simulatedConfig, this.predictionMode) : null
	);

	bottlenecks = $derived<Bottleneck[]>(detectBottlenecks(this.stats, this.config));

	recommendations = $derived<Recommendation[]>(
		generateRecommendations(this.config, this.specStats, this.realworldStats)
	);

	incompatibleUpgrades = $derived.by<Recommendation[]>(() => {
		const recommendedTypes = new Set(this.recommendations.map((r) => r.upgradeType));
		return getAllUpgrades(this.config, this.specStats, this.realworldStats).filter(
			(u) => !recommendedTypes.has(u.upgradeType)
		);
	});

	upgradeDelta = $derived<UpgradeDelta | null>(
		this.activeUpgrade ? calculateUpgradeDelta(this.config, this.activeUpgrade) : null
	);

	performanceGrade = $derived.by<PerformanceGrade>(() => {
		const s = this.stats;
		const accel = s.accelScore; // 0-100

		// Strain penalty: Penalize C-rates above 2.5C
		const strainPenalty = Math.max(0, (s.cRate - 2.5) * 15);

		// Efficiency bonus: reward low actual Wh/km (standard is ~25-30)
		const efficiencyBonus = Math.max(0, (30 - consumptionWhPerKm(s)) * 0.5);

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
	});
}

export const calculatorState = new CalculatorStore();

/**
 * The ride mode whose speed/power limits the config currently has. No limits
 * (the scooter as specified, e.g. a freshly loaded preset) is Turbo.
 */
function matchRideMode(config: ScooterConfig): RideMode | null {
	const speedFactor = config.speedFactor ?? 1;
	const powerLimit = config.powerLimit ?? 1;
	for (const preset of Object.values(rideModePresets)) {
		if (preset.speedFactor === speedFactor && preset.powerLimit === powerLimit) return preset.id;
	}
	return null;
}

calculatorState.rideMode = matchRideMode(calculatorState.config);

// Actions
export function applyConfig(config: Partial<ScooterConfig>) {
	calculatorState.config = normalizeConfig(config, baseConfig);
	calculatorState.rideMode = matchRideMode(calculatorState.config);
}

export function loadPreset(requestedKey: string) {
	const presetKey = resolvePresetKey(requestedKey);
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
	if (key === 'speedFactor' || key === 'powerLimit') {
		calculatorState.rideMode = matchRideMode(calculatorState.config);
	}
}

export function applyRideMode(mode: RideMode) {
	const preset = rideModePresets[mode];
	if (preset) {
		// Full power is represented by no limit, so presets/share links stay clean.
		calculatorState.config.speedFactor = preset.speedFactor < 1 ? preset.speedFactor : undefined;
		calculatorState.config.powerLimit = preset.powerLimit < 1 ? preset.powerLimit : undefined;
		calculatorState.config.regen = preset.regen;
		calculatorState.rideMode = mode;
	}
}

export function applyTerrainMode(mode: TerrainMode) {
	const preset = terrainModePresets[mode];
	if (preset) {
		calculatorState.config.slope = preset.slope;
		calculatorState.terrainMode = mode;
	}
}

export function simulateUpgrade(type: UpgradeType) {
	const current = { ...calculatorState.config };
	const newConfig = simulateUpgradePhysics(current, type);

	calculatorState.simulatedConfig = newConfig;
	calculatorState.activeUpgrade = type;
}

export function clearSimulation() {
	calculatorState.simulatedConfig = null;
	calculatorState.activeUpgrade = null;
}
