import { uiState } from '$lib/stores/ui.svelte';

const KM_TO_MILES = 0.621371;
const KG_TO_LBS = 2.20462;

export type UnitSystem = 'metric' | 'imperial';

export function isImperial(): boolean {
  return uiState.unitSystem === 'imperial';
}

/** Convert km to display value (km or miles) */
export function distanceVal(km: number): number {
  return isImperial() ? km * KM_TO_MILES : km;
}

/** Convert km/h to display value (km/h or mph) */
export function speedVal(kmh: number): number {
  return isImperial() ? kmh * KM_TO_MILES : kmh;
}

/** Convert kg to display value (kg or lbs) */
export function weightVal(kg: number): number {
  return isImperial() ? kg * KG_TO_LBS : kg;
}

/** Get distance unit label */
export function distanceUnit(): string {
  return isImperial() ? 'mi' : 'km';
}

/** Get speed unit label */
export function speedUnit(): string {
  return isImperial() ? 'mph' : 'km/h';
}

/** Get weight unit label */
export function weightUnit(): string {
  return isImperial() ? 'lbs' : 'kg';
}

/** Get cost-per-distance label */
export function costDistanceLabel(): string {
  return isImperial() ? 'per 100mi' : 'per 100km';
}

/** Convert cost per 100km to cost per 100mi */
export function costPer100Val(costPer100km: number): number {
  // cost per 100 miles = cost per 100km * (100mi / 100km) = costPer100km / KM_TO_MILES
  return isImperial() ? costPer100km / KM_TO_MILES : costPer100km;
}
