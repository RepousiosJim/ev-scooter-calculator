import type { DeltaDirection } from '$lib/types';

export function getDeltaColor(direction: DeltaDirection): string {
  switch (direction) {
    case 'up':
      return 'text-success';
    case 'down':
      return 'text-danger';
    default:
      return 'text-textMuted';
  }
}

export function getDeltaIcon(direction: DeltaDirection): string {
  switch (direction) {
    case 'up':
      return '📈';
    case 'down':
      return '📉';
    default:
      return '↔️';
  }
}

export function formatDelta(current: number, upgraded: number): {
  absolute: number;
  percent: number;
  direction: DeltaDirection;
} {
  const absolute = upgraded - current;
  const percent = current !== 0 ? (upgraded / current - 1) * 100 : 0;
  
  let direction: DeltaDirection = 'neutral';
  if (Math.abs(percent) > 0.01) {
    direction = percent > 0 ? 'up' : 'down';
  }
  
  return { absolute, percent, direction };
}

export function hasSignificantChange(
  current: number, 
  upgraded: number, 
  threshold: number = 0.01
): boolean {
  const percent = current !== 0 ? Math.abs(upgraded / current - 1) * 100 : 0;
  return percent > threshold * 100;
}

export function formatValue(value: number, decimals: number = 1): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(decimals);
}
