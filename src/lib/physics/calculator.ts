import type { ScooterConfig, PerformanceStats, PredictionMode, RideModePreset } from '$lib/types';
import {
	NOMINAL_VOLTAGE, // used in calculateMaxSpeed fallback
	GRAVITY_M_S2,
	AIR_DENSITY_KG_M3,
	ROLLING_RESISTANCE_COEFFICIENT,
	DEFAULT_SCOOTER_WEIGHT_FACTOR,
	MIN_SCOOTER_WEIGHT_KG,
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
	CHARGE_WALL_EFFICIENCY,
	REF_RIDER_KG,
	CRUISE_FRACTION_OF_TOP_SPEED,
	CRUISE_MIN_KMH,
	CRUISE_MAX_KMH,
	REGEN_FLAT_BRAKING_SHARE,
	IDLE_BASE_W,
	IDLE_PER_MOTOR_FRACTION_OF_RATED,
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

const performanceCache = new LRUCache<string, PerformanceStats>(PERFORMANCE_CACHE_LIMIT);

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
	// Guard against invalid inputs that would produce NaN/Infinity. `!(x > 0)` also
	// rejects NaN and undefined, which a plain `x <= 0` lets through.
	const requiredPositive = [
		config.v,
		config.ah,
		config.style,
		config.weight,
		config.soh,
		config.motors,
		config.watts,
		config.wheel,
	];
	if (requiredPositive.some((x) => !(x > 0) || !Number.isFinite(x)) || !Number.isFinite(config.ambientTemp)) {
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

	// Motor rated watts are output (shaft) power at the scooter's own nominal
	// voltage — drivetrain efficiency is already baked in, so only apply sag and
	// temperature.
	const uncappedWatts = config.motors * config.watts * (1 - effectiveSagPercent) * temperatureFactor;

	// Controller ratings are battery-side current limits: amps × sagged voltage is
	// the electrical input it allows, and drivetrain efficiency converts that to
	// output power.
	const controllerCapWatts = config.controller
		? config.controller * effectiveVoltage * effectiveDrivetrainEfficiency
		: Infinity;
	const controllerLimited = controllerCapWatts < uncappedWatts;
	const fullWatts = Math.min(uncappedWatts, controllerCapWatts);
	// Ride-mode current limit (e.g. Eco) scales the power the controller delivers.
	const totalWatts = fullWatts * (config.powerLimit ?? 1);

	const maxSpeed = calculateMaxSpeed(config, effectiveSagPercent, modeEfficiencyFactor);

	const CdA =
		config.dragCoefficient && config.frontalArea ? config.dragCoefficient * config.frontalArea : config.ridePosition;

	const flatSpeedAt = (watts: number) =>
		calculateEquilibriumSpeed(watts, CdA, config.weight, effectiveScooterWeight, maxSpeed, 0, config.rollingResistance);

	// Intrinsic top speed: full power, firmware/regulatory cap, no ride-mode limits.
	const fullSpeed = Math.min(flatSpeedAt(fullWatts), config.speedCap ?? Infinity);
	// Ride-mode speed limit is relative to the scooter's own top speed, so Eco on a
	// 25 km/h commuter and on a 100 km/h hyperscooter both mean "about 60%".
	const speedLimit = fullSpeed * (config.speedFactor ?? 1);

	const speed = Math.min(flatSpeedAt(totalWatts), speedLimit);

	const hillSpeed = Math.min(
		calculateEquilibriumSpeed(
			totalWatts,
			CdA,
			config.weight,
			effectiveScooterWeight,
			maxSpeed,
			config.slope,
			config.rollingResistance
		),
		speedLimit
	);

	// Consumption: scale the calibrated base consumption (`style`, Wh/km at the
	// reference conditions) by how much harder the physics says this ride is.
	const consumptionInputs = {
		CdA,
		scooterMass: effectiveScooterWeight,
		rollingResistance: config.rollingResistance ?? ROLLING_RESISTANCE_COEFFICIENT,
		drivetrainEfficiency,
		motors: config.motors,
		ratedWatts: config.watts,
	};
	const actualWhKm = physicsWhPerKm({
		...consumptionInputs,
		// Real-world mode's extra losses apply to the actual ride, not the reference.
		drivetrainEfficiency: effectiveDrivetrainEfficiency,
		riderMass: config.weight,
		slopePercent: config.slope,
		regen: config.regen,
		cruiseKmh: cruiseSpeed(speed, config.speedFactor ?? 1),
	});
	// Reference: same scooter, 80 kg rider, flat, no regen, full power, and the
	// default tyre rolling resistance (so a tyre change shows up in the ratio).
	const referenceWhKm = physicsWhPerKm({
		...consumptionInputs,
		rollingResistance: ROLLING_RESISTANCE_COEFFICIENT,
		riderMass: REF_RIDER_KG,
		slopePercent: 0,
		regen: 0,
		cruiseKmh: cruiseSpeed(fullSpeed, 1),
	});
	const consumptionRatio = referenceWhKm > 0 && actualWhKm > 0 ? actualWhKm / referenceWhKm : 1;
	const whPerKm = config.style * consumptionRatio;
	const totalRange = wh / whPerKm;

	const chargerWatts = config.charger * config.v;
	const chargeTime = chargerWatts > 0 ? (wh / chargerWatts) * CHARGER_EFFICIENCY_FACTOR : 0;

	// Pay for wall energy, not battery energy: charging loses ~12%.
	const costPerCharge = (wh / 1000 / CHARGE_WALL_EFFICIENCY) * config.cost;
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
		uncappedWatts,
		controllerLimited,
		referencePhysicsWhPerKm: referenceWhKm,
	};

	performanceCache.set(cacheKey, result);

	return result;
}

/**
 * Typical cruise speed (km/h): a fraction of top speed, capped at a realistic
 * everyday cruise. A ride-mode speed factor lowers the cap too, so Eco slows
 * the cruise even on scooters whose top speed is far above the cap.
 */
function cruiseSpeed(topSpeedKmh: number, speedFactor: number): number {
	const cap = CRUISE_MAX_KMH * speedFactor;
	return Math.max(CRUISE_MIN_KMH, Math.min(cap, CRUISE_FRACTION_OF_TOP_SPEED * topSpeedKmh));
}

interface ConsumptionInputs {
	CdA: number;
	riderMass: number;
	scooterMass: number;
	rollingResistance: number;
	drivetrainEfficiency: number;
	motors: number;
	ratedWatts: number;
	slopePercent: number;
	regen: number;
	cruiseKmh: number;
}

/**
 * Physics estimate of battery energy per km (Wh/km) at a steady cruise.
 *
 * Forces are in N; 1 N over 1 km = 1000 J = 1/3.6 Wh. On a grade the route is
 * treated as out-and-back: half the distance climbs, half descends, and on the
 * descent gravity pays the rolling/aero load first — so gentle grades cost
 * little, and regen only recovers the surplus on steeper descents. On the flat,
 * regen recovers a small braking share. No-load losses (W) divided by cruise
 * speed (km/h) give Wh/km directly.
 *
 * Used only as a ratio against a reference ride, never as an absolute figure.
 */
export function physicsWhPerKm(i: ConsumptionInputs): number {
	const v = i.cruiseKmh / 3.6; // m/s
	const m = i.riderMass + i.scooterMass;
	const theta = Math.atan(i.slopePercent / 100);
	const resistive = i.rollingResistance * m * GRAVITY_M_S2 * Math.cos(theta) + 0.5 * AIR_DENSITY_KG_M3 * i.CdA * v * v;
	const grade = m * GRAVITY_M_S2 * Math.sin(theta);
	const eta = i.drivetrainEfficiency;

	let force: number;
	if (grade === 0) {
		force = (resistive / eta) * (1 - i.regen * REGEN_FLAT_BRAKING_SHARE * eta);
	} else {
		const climb = (resistive + grade) / eta;
		const descent = resistive >= grade ? (resistive - grade) / eta : -i.regen * eta * (grade - resistive);
		force = (climb + descent) / 2;
	}

	const idleWatts = IDLE_BASE_W + IDLE_PER_MOTOR_FRACTION_OF_RATED * i.ratedWatts * i.motors;
	return force / 3.6 + idleWatts / i.cruiseKmh;
}

function calculateMaxSpeed(config: ScooterConfig, sagPercent: number, modeFactor: number): number {
	if (config.motorKv) {
		// No-load RPM scales with the voltage the motor actually sees (after sag);
		// drivetrain efficiency is a power loss, not an RPM loss. The real-world
		// mode factor is kept as a general derate.
		const circumferenceM = config.wheel * INCH_TO_METERS * Math.PI;
		const motorRpm = config.motorKv * config.v * (1 - sagPercent);
		return ((motorRpm * circumferenceM * SECONDS_PER_MINUTE) / METERS_PER_KILOMETER) * modeFactor;
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
	target: Pick<RideModePreset, 'speedFactor' | 'powerLimit' | 'regen'>,
	mode: PredictionMode = 'spec'
): RideModeImpact {
	const currentStats = calculatePerformance(config, mode);

	const modifiedConfig: ScooterConfig = {
		...config,
		speedFactor: target.speedFactor,
		powerLimit: target.powerLimit,
		regen: target.regen,
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
