import type { ScooterConfig, PerformanceStats, PredictionMode } from '$lib/types';
import {
	NOMINAL_VOLTAGE, // used in calculateMaxSpeed fallback
	GRAVITY_M_S2,
	AIR_DENSITY_KG_M3,
	ROLLING_RESISTANCE_COEFFICIENT,
	DEFAULT_SCOOTER_WEIGHT_FACTOR,
	MIN_SCOOTER_WEIGHT_KG,
	REGEN_GAIN_FACTOR,
	CHARGER_EFFICIENCY_FACTOR,
	ACCEL_SCORE_POWER_TO_WEIGHT_THRESHOLD,
	INCH_TO_METERS,
	SECONDS_PER_MINUTE,
	METERS_PER_KILOMETER,
	DEFAULT_MOTOR_EFFICIENCY,
	BASE_SPEED_AT_NOMINAL_VOLTAGE,
	MODE_EFFICIENCY_FACTOR_SPEC,
	MODE_EFFICIENCY_FACTOR_REALWORLD,
	MIN_SAG_PERCENT_SPEC,
	MIN_SAG_PERCENT_REALWORLD,
} from '$lib/constants/physics';
import { PERFORMANCE_CACHE_LIMIT } from '$lib/constants/cache';
import { LRUCache } from './cache';
import { hashCacheKey } from './cache-key-hash';

/**
 * Calculate estimated scooter weight based on battery energy capacity.
 * Uses a linear estimation: base weight + (energy * weight factor).
 */
function estimateScooterWeight(energyWh: number): number {
	return energyWh * DEFAULT_SCOOTER_WEIGHT_FACTOR + MIN_SCOOTER_WEIGHT_KG;
}

export function calculateTemperatureFactor(ambientTemp: number): number {
	// Cold degradation: below 20°C → linear from 1.0 at 20°C down to 0.6 at -20°C
	if (ambientTemp <= -20) return 0.6;
	if (ambientTemp < 20) {
		const normalizedTemp = (ambientTemp + 20) / 40; // 0 at -20°C, 1 at 20°C
		return 0.6 + normalizedTemp * 0.4;
	}

	// Heat degradation: above 45°C → linear from 1.0 at 45°C down to 0.93 at 60°C
	// Li-ion cells experience increased internal resistance and accelerated degradation above 45°C.
	if (ambientTemp >= 60) return 0.93;
	if (ambientTemp > 45) {
		const normalizedTemp = (ambientTemp - 45) / 15; // 0 at 45°C, 1 at 60°C
		return 1.0 - normalizedTemp * 0.07;
	}

	return 1.0; // Optimal range: 20–45°C
}

const performanceCache = new LRUCache<number, PerformanceStats>(PERFORMANCE_CACHE_LIMIT);

const ZERO_STATS: PerformanceStats = Object.freeze({
	wh: 0,
	totalRange: 0,
	speed: 0,
	hillSpeed: 0,
	totalWatts: 0,
	chargeTime: 0,
	costPer100km: 0,
	accelScore: 0,
	amps: 0,
	cRate: 0,
});

export function calculatePerformance(config: ScooterConfig, mode: PredictionMode = 'spec'): PerformanceStats {
	// Guard against invalid inputs that would produce NaN/Infinity
	if (config.v <= 0 || config.ah <= 0 || config.style <= 0 || config.weight <= 0) {
		return ZERO_STATS;
	}

	const cacheKey = hashCacheKey(config, mode);
	const cached = performanceCache.get(cacheKey);
	if (cached) return cached;

	const drivetrainEfficiency = config.drivetrainEfficiency ?? 0.9;
	const batterySagPercent = config.batterySagPercent ?? 0.08;

	const modeEfficiencyFactor = mode === 'realworld' ? MODE_EFFICIENCY_FACTOR_REALWORLD : MODE_EFFICIENCY_FACTOR_SPEC;
	const effectiveDrivetrainEfficiency = drivetrainEfficiency * modeEfficiencyFactor;

	const minSagPercent = mode === 'realworld' ? MIN_SAG_PERCENT_REALWORLD : MIN_SAG_PERCENT_SPEC;
	const effectiveSagPercent = Math.max(batterySagPercent, minSagPercent);

	const temperatureFactor = calculateTemperatureFactor(config.ambientTemp);

	const effectiveAh = config.ah * config.soh * temperatureFactor;
	const wh = config.v * effectiveAh;

	// Cache scooter weight calculation to avoid multiple calls
	const calculatedScooterWeight = estimateScooterWeight(wh);
	const effectiveScooterWeight = config.scooterWeight ?? calculatedScooterWeight;

	const effectiveVoltage = config.v * (1 - effectiveSagPercent);

	// Motor rated watts are at the scooter's own nominal voltage; only apply sag and temperature
	const totalWatts = config.motors * config.watts * (1 - effectiveSagPercent) * temperatureFactor;

	const maxSpeed = calculateMaxSpeed(config, effectiveDrivetrainEfficiency);

	const CdA =
		config.dragCoefficient && config.frontalArea ? config.dragCoefficient * config.frontalArea : config.ridePosition;

	const speed = calculateEquilibriumSpeed(
		totalWatts,
		CdA,
		config.weight,
		effectiveScooterWeight,
		maxSpeed,
		0,
		config.rollingResistance
	);

	const hillSpeed = calculateEquilibriumSpeed(
		totalWatts,
		CdA,
		config.weight,
		effectiveScooterWeight,
		maxSpeed,
		config.slope,
		config.rollingResistance
	);

	const baseRange = wh / config.style;
	// Regen varies with terrain: flat routes ~15%, hilly routes up to 25%
	// slope 0% → terrainMultiplier 1.0, slope 10%+ → terrainMultiplier 1.7
	const terrainMultiplier = 1.0 + Math.min(config.slope, 10) * 0.07;
	const regenGain = baseRange * (config.regen * REGEN_GAIN_FACTOR * terrainMultiplier);
	const totalRange = baseRange + regenGain;

	const chargerWatts = config.charger * config.v;
	const chargeTime = chargerWatts > 0 ? (wh / chargerWatts) * CHARGER_EFFICIENCY_FACTOR : 0;

	const costPerCharge = (wh / 1000) * config.cost;
	const costPer100km = (100 / totalRange) * costPerCharge;

	const totalWeight = effectiveScooterWeight + config.weight;
	const powerToWeight = totalWatts / totalWeight;
	const accelScore = Math.min(100, (powerToWeight / ACCEL_SCORE_POWER_TO_WEIGHT_THRESHOLD) * 100);

	const amps = totalWatts / effectiveVoltage;
	// Use effectiveAh (adjusted for SoH + temperature) so C-rate reflects actual cell stress
	const cRate = amps / effectiveAh;

	const result = {
		wh,
		totalRange,
		speed,
		hillSpeed,
		totalWatts,
		chargeTime,
		costPer100km,
		accelScore,
		amps,
		cRate,
	};

	performanceCache.set(cacheKey, result);

	return result;
}

function calculateMaxSpeed(config: ScooterConfig, efficiency: number = 1.0): number {
	if (config.motorKv) {
		const circumferenceM = config.wheel * INCH_TO_METERS * Math.PI;
		const motorRpm = config.motorKv * config.v;
		return ((motorRpm * circumferenceM * SECONDS_PER_MINUTE) / METERS_PER_KILOMETER) * efficiency;
	}
	if (config.rpm) {
		const circumferenceM = config.wheel * INCH_TO_METERS * Math.PI;
		return ((config.rpm * circumferenceM * SECONDS_PER_MINUTE) / METERS_PER_KILOMETER) * DEFAULT_MOTOR_EFFICIENCY;
	}
	return (config.v / NOMINAL_VOLTAGE) * BASE_SPEED_AT_NOMINAL_VOLTAGE;
}

export interface RideModeImpact {
	rangeDelta: number;
	rangePercent: number;
	speedDelta: number;
	speedPercent: number;
	powerDelta: number;
	powerPercent: number;
}

export function calculateRideModeImpact(
	config: ScooterConfig,
	targetStyle: number,
	targetRegen: number,
	mode: PredictionMode = 'spec'
): RideModeImpact {
	const currentStats = calculatePerformance(config, mode);

	const modifiedConfig: ScooterConfig = {
		...config,
		style: targetStyle,
		regen: targetRegen,
	};

	const modifiedStats = calculatePerformance(modifiedConfig, mode);

	const safePercent = (current: number, modified: number) => {
		if (current === 0) return 0;
		return (modified / current - 1) * 100;
	};

	return {
		rangeDelta: modifiedStats.totalRange - currentStats.totalRange,
		rangePercent: safePercent(currentStats.totalRange, modifiedStats.totalRange),
		speedDelta: modifiedStats.speed - currentStats.speed,
		speedPercent: safePercent(currentStats.speed, modifiedStats.speed),
		powerDelta: modifiedStats.totalWatts - currentStats.totalWatts,
		powerPercent: safePercent(currentStats.totalWatts, modifiedStats.totalWatts),
	};
}

function calculateEquilibriumSpeed(
	totalWatts: number,
	CdA: number,
	riderWeight: number,
	scooterWeight: number,
	maxMechanicalSpeedKmh: number,
	slopePercent: number,
	rollingResistance?: number
): number {
	const totalWeight = riderWeight + scooterWeight;
	const slopeRad = Math.atan(slopePercent / 100);

	const F_gravity = totalWeight * GRAVITY_M_S2 * Math.sin(slopeRad);

	const Cr = rollingResistance ?? ROLLING_RESISTANCE_COEFFICIENT;
	const F_rolling = Cr * totalWeight * GRAVITY_M_S2 * Math.cos(slopeRad);

	const F_constant = F_gravity + F_rolling;

	let low = 0;
	// Upper bound in m/s: mechanical top speed + 10 m/s (≈36 km/h) margin
	let high = maxMechanicalSpeedKmh / 3.6 + 10;

	for (let i = 0; i < 20; i++) {
		const mid = (low + high) / 2;
		if (mid <= 0) {
			low = mid;
			continue;
		}

		const P_aero = 0.5 * AIR_DENSITY_KG_M3 * Math.pow(mid, 3) * CdA;
		const P_linear = F_constant * mid;

		const P_needed = P_aero + P_linear;

		if (P_needed < totalWatts) {
			low = mid;
		} else {
			high = mid;
		}
	}

	const speedKmh = ((low + high) / 2) * 3.6;
	return Math.min(speedKmh, maxMechanicalSpeedKmh);
}
