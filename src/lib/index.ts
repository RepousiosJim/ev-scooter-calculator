/**
 * EV Scooter Calculator - Public API
 *
 * This module exports the public API surface for the EV Scooter Calculator.
 * All imports should use the `$lib` alias.
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
	// Core types
	ScooterConfig,
	PerformanceStats,
	Bottleneck,
	ScooterPreset,
	Profile,
	UpgradeDelta,
	Recommendation,
	PresetMetadata,
	RideMode,
	RideModePreset,
	PredictionMode,
	DeltaDirection,
} from './types';

// ============================================================================
// STORES
// ============================================================================

export {
	// Calculator store
	calculatorState,
	toastState,

	// Calculator actions
	applyConfig,
	loadPreset,
	createShareLink,
	loadConfigFromUrl,
	updateConfig,
	setPredictionMode,
	applyRideMode,
	simulateUpgrade,
	clearSimulation,
	resetConfig,
	showToast,
	clearToast,
	clearAllToasts,
} from './stores/calculator.svelte';

export {
	// UI store
	uiState,

	// UI actions
	toggleAdvanced,
	toggleCompareMode,
	setActiveTab,
	setActiveTabWithLoading,
} from './stores/ui.svelte';

// ============================================================================
// PHYSICS ENGINE
// ============================================================================

export {
	calculatePerformance,
	calculateTemperatureFactor,
	calculateRideModeImpact,
	detectBottlenecks,
	generateRecommendations,
	calculateUpgradeDelta,
	getAllUpgrades,
} from './physics';

export type { RideModeImpact } from './physics';

// ============================================================================
// UTILITIES
// ============================================================================

// Validators
export { normalizeConfig, normalizeConfigValue, validateField, type ConfigNumericKey } from './utils/validators';

// Scoring
export { computeScore, getGrade, getGradeInfo, type Grade, type GradeInfo } from './utils/scoring';

// ============================================================================
// CONSTANTS
// ============================================================================

export {
	// Physics constants
	NOMINAL_VOLTAGE,
	ROLLING_RESISTANCE_COEFFICIENT,
	AIR_DENSITY_KG_M3,
	GRAVITY_M_S2,
	DEFAULT_MOTOR_EFFICIENCY,
	MODE_EFFICIENCY_FACTOR_SPEC,
	MODE_EFFICIENCY_FACTOR_REALWORLD,

	// Conversion factors
	INCH_TO_METERS,
	SECONDS_PER_MINUTE,
	METERS_PER_KILOMETER,
} from './constants/physics';

// ============================================================================
// DATA
// ============================================================================

export { defaultConfig, presets, presetMetadata } from './data/presets';

export { rideModePresets } from './data/ride-modes';

// ============================================================================
// UI COMPONENTS - ATOMS
// ============================================================================

export { Button, Input, Slider, Select, Toggle, Badge, Icon } from './components/ui/atoms';

// ============================================================================
// UI COMPONENTS - MOLECULES
// ============================================================================

export { FormField } from './components/ui/molecules';

// ============================================================================
// UI COMPONENTS - ORGANISMS
// ============================================================================

export { MobileNavigation } from './components/ui/organisms';
