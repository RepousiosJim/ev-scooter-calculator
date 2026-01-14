export interface ValidationRule {
  min?: number;
  max?: number;
  message: string;
}

export const validationRules: Record<string, ValidationRule> = {
  voltage: { min: 24, max: 96, message: 'Recommended: 24-96V' },
  capacity: { min: 5, message: 'Recommended: 5+ Ah' },
  motors: { min: 1, max: 4, message: 'Recommended: 1-4 motors' },
  watts: { min: 250, message: 'Recommended: 250+ W' },
  controller: { min: 30, max: 100, message: 'Recommended: 30-100A' },
  weight: { min: 50, message: 'Recommended: 50+ kg' },
  wheel: { min: 8, max: 13, message: 'Recommended: 8-13 inches' },
  rpm: { min: 300, max: 8000, message: 'Recommended: 300-8000 RPM' },
  charger: { min: 2, max: 10, message: 'Recommended: 2-10A' },
  regen: { min: 0, max: 0.15, message: 'Recommended: 0-15%' },
  cost: { min: 0.05, message: 'Recommended: $0.05+ /kWh' },
  slope: { min: 0, max: 30, message: 'Recommended: 0-30%' },
  soh: { min: 0.7, max: 1, message: 'Recommended: 70-100%' }
};

export function validateField(
  field: string,
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

export function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
