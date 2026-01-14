import type { ScooterConfig } from '$lib/types';

export interface ValidationRule {
  min?: number;
  max?: number;
  message: string;
}

export type ConfigNumericKey = Exclude<keyof ScooterConfig, 'id' | 'name'>;

export const validationRules: Record<ConfigNumericKey, ValidationRule> = {
  v: { min: 24, max: 96, message: 'Recommended: 24-96V' },
  ah: { min: 5, message: 'Recommended: 5+ Ah' },
  motors: { min: 1, max: 4, message: 'Recommended: 1-4 motors' },
  watts: { min: 250, message: 'Recommended: 250+ W' },
  controller: { min: 30, max: 100, message: 'Recommended: 30-100A' },
  style: { min: 20, max: 80, message: 'Recommended: 20-80 Wh/km' },
  weight: { min: 50, max: 150, message: 'Recommended: 50-150 kg' },
  wheel: { min: 8, max: 13, message: 'Recommended: 8-13 inches' },
  rpm: { min: 300, max: 8000, message: 'Recommended: 300-8000 RPM' },
  motorKv: { min: 20, max: 200, message: 'Recommended: 20-200 rpm/V' },
  scooterWeight: { min: 5, max: 100, message: 'Recommended: 5-100 kg' },
  drivetrainEfficiency: { min: 0.6, max: 0.95, message: 'Recommended: 60-95%' },
  batterySagPercent: { min: 0, max: 0.3, message: 'Recommended: 0-30%' },
  charger: { min: 2, max: 10, message: 'Recommended: 2-10A' },
  regen: { min: 0, max: 0.15, message: 'Recommended: 0-15%' },
  cost: { min: 0.05, message: 'Recommended: $0.05+ /kWh' },
  slope: { min: 0, max: 100, message: 'Recommended: 0-30%' },
  ridePosition: { min: 0.4, max: 0.6, message: 'Recommended: 0.4-0.6 drag coeff' },
  soh: { min: 0.5, max: 1, message: 'Recommended: 50-100%' }
};

const optionalConfigKeys = new Set<ConfigNumericKey>(['controller', 'rpm', 'motorKv', 'scooterWeight', 'drivetrainEfficiency', 'batterySagPercent']);

export function validateField(
  field: ConfigNumericKey,
  value: number
): { isValid: boolean; message?: string } {
  const rule = validationRules[field];
  if (!rule) return { isValid: true };

  const isBelowMin = rule.min !== undefined && value < rule.min;
  const isAboveMax = rule.max !== undefined && value > rule.max;

  if (isBelowMin || isAboveMax) {
    return { isValid: false, message: rule.message };
  }

  return { isValid: true };
}

export function normalizeConfigValue(
  field: ConfigNumericKey,
  value: number | undefined,
  fallback: number | undefined
): number | undefined {
  if (value === undefined || !Number.isFinite(value)) {
    return optionalConfigKeys.has(field) ? undefined : fallback ?? 0;
  }

  const rule = validationRules[field];
  if (!rule) return value;

  let normalized = value;

  if (rule.min !== undefined) {
    normalized = Math.max(rule.min, normalized);
  }

  if (rule.max !== undefined) {
    normalized = Math.min(rule.max, normalized);
  }

  return normalized;
}

export function normalizeConfig(
  config: Partial<ScooterConfig>,
  fallback: ScooterConfig
): ScooterConfig {
  const normalized: ScooterConfig = { ...fallback };

  const normalizedConfig = normalized as Record<ConfigNumericKey, number | undefined>;

  (Object.keys(validationRules) as ConfigNumericKey[]).forEach((key) => {
    const rawValue = config[key];
    const value = typeof rawValue === 'number' && Number.isFinite(rawValue)
      ? rawValue
      : undefined;

    const normalizedValue = normalizeConfigValue(key, value, fallback[key]);
    normalizedConfig[key] = normalizedValue;
  });

  if (typeof config.id === 'number') {
    normalized.id = config.id;
  }

  if (typeof config.name === 'string') {
    normalized.name = config.name;
  }

  return normalized;
}

export function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
