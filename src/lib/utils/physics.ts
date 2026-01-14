import type { ScooterConfig, PerformanceStats, Bottleneck } from '$lib/types';

// Physical constants
export const AIR_DENSITY = 1.225; // kg/m³
export const GRAVITY = 9.81;      // m/s²
export const ROLLING_RESISTANCE = 15; // W
const NOMINAL_VOLTAGE = 52;

export function calculatePerformance(config: ScooterConfig): PerformanceStats {
  // 1. Apply battery health
  const effectiveAh = config.ah * config.soh;
  const wh = config.v * effectiveAh;
  const voltageFactor = config.v / NOMINAL_VOLTAGE;
  const totalWatts = config.motors * config.watts * voltageFactor;

  // 2. Calculate maximum speed based on RPM or voltage
  const maxSpeed = calculateMaxSpeed(config);

  // 3. Apply aerodynamic drag to find equilibrium speed
  const speed = calculateDragLimitedSpeed(
    totalWatts,
    config.ridePosition,
    maxSpeed
  );

  // 4. Calculate hill climb speed
  const hillSpeed = calculateHillSpeed(
    totalWatts,
    config.ridePosition,
    wh,
    config.weight,
    speed,
    config.slope
  );

  // 5. Calculate range (with regen)
  const baseRange = wh / config.style;
  const regenGain = baseRange * (config.regen * 0.2);
  const totalRange = baseRange + regenGain;

  // 6. Calculate charging time
  const chargerWatts = config.charger * config.v;
  const chargeTime = chargerWatts > 0 ? (wh / chargerWatts) * 1.2 : 0;

  // 7. Calculate cost
  const costPerCharge = (wh / 1000) * config.cost;
  const costPer100km = (100 / totalRange) * costPerCharge;

  // 8. Calculate acceleration score (power to weight)
  const scooterWeight = (wh * 0.06) + 15;
  const totalWeight = scooterWeight + config.weight;
  const powerToWeight = totalWatts / totalWeight;
  const accelScore = Math.min(100, (powerToWeight / 25) * 100);

  // 9. Calculate current draw and C-rate
  const amps = totalWatts / config.v;
  const cRate = amps / config.ah;

  return {
    wh,
    totalRange,
    speed,
    hillSpeed,
    totalWatts,
    chargeTime,
    costPer100km,
    accelScore,
    amps,
    cRate
  };
}

function calculateMaxSpeed(config: ScooterConfig): number {
  if (config.rpm) {
    const circumferenceM = (config.wheel * 0.0254) * Math.PI;
    return (config.rpm * circumferenceM * 60) / 1000 * 0.85;
  }
  return (config.v / NOMINAL_VOLTAGE) * 75;
}

function calculateDragLimitedSpeed(
  totalWatts: number,
  ridePosition: number,
  maxSpeed: number
): number {
  let speed = 0;

  for (let v = 0; v <= maxSpeed; v += 0.5) {
    const speedMps = v / 3.6;
    const powerDrag = 0.5 * AIR_DENSITY * Math.pow(speedMps, 3) * ridePosition;
    const totalPowerNeeded = powerDrag + ROLLING_RESISTANCE;

    if (totalPowerNeeded <= totalWatts) {
      speed = v;
    }
  }

  return speed;
}

function calculateHillSpeed(
  totalWatts: number,
  ridePosition: number,
  wh: number,
  riderWeight: number,
  maxSpeed: number,
  slopePercent: number
): number {
  if (slopePercent <= 0) return maxSpeed;

  const angleRad = Math.atan(slopePercent / 100);
  const scooterWeight = (wh * 0.06) + 15;
  const totalWeight = scooterWeight + riderWeight;
  const gravityForce = totalWeight * GRAVITY * Math.sin(angleRad);

  let hillSpeed = 0;

  for (let v = 0; v <= maxSpeed; v += 0.1) {
    const speedMps = v / 3.6;
    const powerDrag = 0.5 * AIR_DENSITY * Math.pow(speedMps, 3) * ridePosition;
    const powerGravity = gravityForce * speedMps;
    const totalPowerNeeded = powerDrag + ROLLING_RESISTANCE + powerGravity;

    if (totalPowerNeeded <= totalWatts) {
      hillSpeed = v;
    }
  }

  return hillSpeed;
}

export function detectBottlenecks(
  stats: PerformanceStats,
  config: ScooterConfig
): Bottleneck[] {
  const bottlenecks: Bottleneck[] = [];

  // High C-rate warning
  if (stats.cRate > 2.5) {
    bottlenecks.push({
      type: 'SAG_WARNING',
      message: 'Battery discharge is too high. Expect voltage sag and reduced performance.',
      upgrade: 'parallel'
    });
  }

  // Controller limit detection
  if (config.controller && config.controller < (stats.totalWatts / config.v)) {
    bottlenecks.push({
      type: 'CONTROLLER_LIMIT',
      message: 'Controller amp limit is restricting motor power output.',
      upgrade: 'controller'
    });
  }

  // Gear ratio limitation
  if (stats.speed < 45 && config.v > 48) {
    bottlenecks.push({
      type: 'GEAR_RATIO_LIMIT',
      message: 'Low speed suggests gear ratio limitation, not voltage.',
      upgrade: 'voltage'
    });
  }

  // Hill climb limitation
  if (stats.hillSpeed < 10 && config.slope > 5) {
    bottlenecks.push({
      type: 'HILL_CLIMB_LIMIT',
      message: 'Poor hill climbing performance. More power or gearing needed.',
      upgrade: 'voltage'
    });
  }

  return bottlenecks;
}
