import type { ScooterConfig } from '$lib/types';
import { calculatePerformance } from './calculator';
import { CLAIM_RIDER_KG, CLAIM_CRUISE_KMH, CRUISE_FRACTION_OF_TOP_SPEED } from '$lib/constants/physics';

/**
 * The conditions manufacturers quote range under: a light rider on flat ground at
 * a low constant speed (typically Eco mode), with the scooter's own regen.
 * Expressed as a config so the normal engine evaluates it.
 */
export function claimConditions(config: ScooterConfig): ScooterConfig {
	const unrestricted: ScooterConfig = { ...config, speedFactor: undefined, powerLimit: undefined };
	const topSpeed = calculatePerformance(unrestricted, 'spec').speed;
	// Ride-mode speed factor that puts the cruise speed (a fixed fraction of top
	// speed) at the claim cruise speed.
	const speedFactor = topSpeed > 0 ? Math.min(1, CLAIM_CRUISE_KMH / (CRUISE_FRACTION_OF_TOP_SPEED * topSpeed)) : 1;
	return { ...unrestricted, weight: CLAIM_RIDER_KG, slope: 0, speedFactor };
}

/**
 * Base consumption (`style`, Wh/km at reference conditions) that makes the
 * engine reproduce `claimedRangeKm` under claim conditions. Range is exactly
 * proportional to 1/style, so this is closed-form.
 */
export function calibrateStyle(config: ScooterConfig, claimedRangeKm: number): number {
	const rangeAtUnitStyle = calculatePerformance({ ...claimConditions(config), style: 1 }, 'spec').totalRange;
	return rangeAtUnitStyle / claimedRangeKm;
}
