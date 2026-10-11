import type { ScooterConfig, PredictionMode } from '$lib/types';

/**
 * Exact cache key for a (config, mode) pair.
 *
 * Every field that affects `calculatePerformance` is included at full
 * precision, and `undefined` is kept distinct from any default value — the
 * calculator treats a missing drag coefficient differently from an explicit
 * 0.7 (it falls back to `ridePosition`), so the two must not share a key.
 * A string key also rules out hash collisions returning another config's stats.
 */
export function hashCacheKey(config: ScooterConfig, mode: PredictionMode): string {
	return [
		mode,
		config.v,
		config.ah,
		config.motors,
		config.watts,
		config.controller,
		config.style,
		config.weight,
		config.wheel,
		config.rpm,
		config.motorKv,
		config.scooterWeight,
		config.drivetrainEfficiency,
		config.batterySagPercent,
		config.charger,
		config.regen,
		config.cost,
		config.slope,
		config.ridePosition,
		config.dragCoefficient,
		config.frontalArea,
		config.rollingResistance,
		config.soh,
		config.ambientTemp,
		config.speedCap,
		config.speedFactor,
		config.powerLimit,
	]
		.map((value) => (value === undefined ? '' : String(value)))
		.join('|');
}
