export function formatNumber(value: number, decimals: number = 1): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(decimals);
}

export function formatCurrency(value: number, currency: string = '$'): string {
  return `${currency}${value.toFixed(2)}`;
}

export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatEnergy(value: number): string {
  return `${Math.round(value)} Wh`;
}

export function formatSpeed(value: number): string {
  return formatNumber(value, 1);
}

export function formatRange(value: number): string {
  return formatNumber(value, 1);
}

export function formatTime(value: number): string {
  return formatNumber(value, 1);
}

export function formatPower(value: number): string {
  return `${Math.round(value)} W`;
}

export function formatCRate(value: number): string {
  return formatNumber(value, 2);
}
