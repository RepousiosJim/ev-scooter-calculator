// Formula functions for EV Scooter Calculator
import { PHYSICS } from './formula-constants';

// Energy Formulas
export function calculateBatteryEnergy(
  voltage: number,
  capacityAh: number,
  stateOfHealth: number,
  temperatureFactor: number
): number {
  return voltage * capacityAh * stateOfHealth * temperatureFactor;
}

export function calculateTemperatureFactor(ambientTemp: number): number {
  // Linear interpolation: -20°C → 60%, 20°C+ → 100%
  if (ambientTemp >= PHYSICS.TEMPERATURE.OPTIMAL_TEMP) return PHYSICS.TEMPERATURE.OPTIMAL_FACTOR;
  if (ambientTemp <= PHYSICS.TEMPERATURE.FREEZING_TEMP) return PHYSICS.TEMPERATURE.FREEZING_FACTOR;
  const tempRange = PHYSICS.TEMPERATURE.OPTIMAL_TEMP - PHYSICS.TEMPERATURE.FREEZING_TEMP;
  const normalizedTemp = (ambientTemp - PHYSICS.TEMPERATURE.FREEZING_TEMP) / tempRange;
  return PHYSICS.TEMPERATURE.FREEZING_FACTOR + (normalizedTemp * (PHYSICS.TEMPERATURE.OPTIMAL_FACTOR - PHYSICS.TEMPERATURE.FREEZING_FACTOR));
}

// Speed Formulas
export function calculateTheoreticalMaxSpeed(
  motorKv: number,
  voltage: number,
  wheelDiameterInches: number,
  efficiency: number
): number {
  const circumference = (wheelDiameterInches * PHYSICS.INCH_TO_METER) * Math.PI;
  const motorRpm = motorKv * voltage;
  return (motorRpm * circumference * 60) / 1000 * efficiency;
}

export function calculateDragLimitedSpeed(
  totalPower: number,
  ridePosition: number,
  airDensity: number,
  rollingResistance: number,
  maxSpeed: number
): number {
  const powerAvailable = totalPower - rollingResistance;
  if (powerAvailable <= 0) return 0;
  const speedMps = Math.cbrt((2 * powerAvailable) / (airDensity * ridePosition));
  const speedKmh = speedMps * 3.6;
  return Math.min(speedKmh, maxSpeed);
}

// Power Formulas
export function calculateTotalPower(
  motors: number,
  wattsPerMotor: number,
  voltageFactor: number,
  temperatureFactor: number
): number {
  return motors * wattsPerMotor * voltageFactor * temperatureFactor;
}

// Range Formulas
export function calculateBaseRange(energyWh: number, consumptionRate: number): number {
  return energyWh / consumptionRate;
}

export function calculateRegenGain(baseRange: number, regenEfficiency: number): number {
  return baseRange * regenEfficiency * 0.2;
}

// Metrics Formulas
export function calculatePowerToWeightRatio(totalPower: number, totalWeight: number): number {
  return totalPower / totalWeight;
}

export function calculateAccelerationScore(powerToWeightRatio: number): number {
  return Math.min(100, (powerToWeightRatio / PHYSICS.BASE_ACCEL_RATIO) * 100);
}

export function calculateCRate(peakCurrent: number, capacityAh: number): number {
  return peakCurrent / capacityAh;
}

// Weight Estimation
export function estimateScooterWeight(energyWh: number): number {
  return (energyWh * PHYSICS.WEIGHT.KG_PER_WH) + PHYSICS.WEIGHT.MIN_SCOOTER;
}
