import type { ScooterConfig, PredictionMode } from '$lib/types';

/**
 * Fast integer hash for cache key construction using Djb2 algorithm.
 * Eliminates string allocation overhead from template literal concatenation.
 *
 * Djb2 is a proven, simple hash that distributes well across integer ranges.
 * For 200-entry cache with typically unique configs, collision rate is negligible.
 */
export function hashCacheKey(config: ScooterConfig, mode: PredictionMode): number {
	let hash = 5381; // Djb2 magic constant

	// Hash mode string (contributes most variation between 'spec' and 'realworld')
	hash = hashString(mode, hash);

	// Hash config fields in order (same 23 fields as original string key)
	hash = hashNumber(config.v, hash);
	hash = hashNumber(config.ah, hash);
	hash = hashNumber(config.motors, hash);
	hash = hashNumber(config.watts, hash);
	hash = hashNumber(config.controller ?? 0, hash);
	hash = hashNumber(config.style, hash);
	hash = hashNumber(config.weight, hash);
	hash = hashNumber(config.wheel, hash);
	hash = hashNumber(config.rpm ?? 0, hash);
	hash = hashNumber(config.motorKv ?? 0, hash);
	hash = hashNumber(config.scooterWeight ?? 0, hash);
	hash = hashNumber(config.drivetrainEfficiency ?? 0.9, hash);
	hash = hashNumber(config.batterySagPercent ?? 0.08, hash);
	hash = hashNumber(config.charger, hash);
	hash = hashNumber(config.regen, hash);
	hash = hashNumber(config.cost, hash);
	hash = hashNumber(config.slope, hash);
	hash = hashNumber(config.ridePosition, hash);
	hash = hashNumber(config.dragCoefficient ?? 0.7, hash);
	hash = hashNumber(config.frontalArea ?? 0.5, hash);
	hash = hashNumber(config.rollingResistance ?? 0.015, hash);
	hash = hashNumber(config.soh, hash);
	hash = hashNumber(config.ambientTemp, hash);

	// Return as unsigned 32-bit integer
	return hash >>> 0;
}

function hashString(str: string, hash: number): number {
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash = hash & hash; // Coerce to 32-bit signed, then bitwise ops force to int32
	}
	return hash;
}

function hashNumber(num: number, hash: number): number {
	// Scale floating point to integer to preserve decimal precision
	const bits = Math.floor(num * 1000) & 0xffffffff;
	hash = (hash << 5) - hash + bits;
	return hash & hash;
}
