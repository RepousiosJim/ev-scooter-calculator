export const NOMINAL_VOLTAGE = 52;
export const AIR_DENSITY_KG_M3 = 1.225;
export const GRAVITY_M_S2 = 9.81;
export const ROLLING_RESISTANCE_COEFFICIENT = 0.02;
export const DEFAULT_SCOOTER_WEIGHT_FACTOR = 0.015;
export const MIN_SCOOTER_WEIGHT_KG = 15;
export const CHARGER_EFFICIENCY_FACTOR = 1.2;
export const ACCEL_SCORE_POWER_TO_WEIGHT_THRESHOLD = 25;

// Mode-specific constants
export const MODE_EFFICIENCY_FACTOR_SPEC = 1.0;
export const MODE_EFFICIENCY_FACTOR_REALWORLD = 0.85;
export const MIN_SAG_PERCENT_SPEC = 0;
export const MIN_SAG_PERCENT_REALWORLD = 0.05;

// Unit conversion constants
export const INCH_TO_METERS = 0.0254;
export const SECONDS_PER_MINUTE = 60;
export const METERS_PER_KILOMETER = 1000;

// Motor and speed constants
export const DEFAULT_MOTOR_EFFICIENCY = 0.85;
export const BASE_SPEED_AT_NOMINAL_VOLTAGE = 75; // km/h

// Battery discharge-rate thresholds (C-rate). Above CAUTION, a parallel pack is
// worth recommending; above CRITICAL, expect significant sag (bottleneck warning).
export const C_RATE_CAUTION = 2.0;
export const C_RATE_CRITICAL = 3.0;

// Fraction of wall energy that ends up in the battery (charger + charging losses).
export const CHARGE_WALL_EFFICIENCY = 0.88;

// ---------------------------------------------------------------------------
// Consumption model (Wh/km). A preset's `style` is its measured/calibrated
// consumption under REFERENCE conditions; physics only scales it by the ratio
// physWhKm(actual) / physWhKm(reference), because absolute physics omits
// acceleration, stop-go and iron losses (it under-predicts measured figures).
// ---------------------------------------------------------------------------
export const REF_RIDER_KG = 80;
/** Typical cruise speed as a fraction of top speed, clamped to [MIN, MAX]. */
export const CRUISE_FRACTION_OF_TOP_SPEED = 0.75;
export const CRUISE_MIN_KMH = 15;
export const CRUISE_MAX_KMH = 32;
/** Share of flat-road traction energy recoverable by regen braking at regen = 1 (measured gains are 1–5%). */
export const REGEN_FLAT_BRAKING_SHARE = 0.15;
/** No-load losses: controller/electronics base plus spinning hub iron losses per motor. */
export const IDLE_BASE_W = 5;
export const IDLE_PER_MOTOR_FRACTION_OF_RATED = 0.01;
/** Conditions manufacturers quote range under (light rider, low constant speed, flat). */
export const CLAIM_RIDER_KG = 75;
export const CLAIM_CRUISE_KMH = 15;
