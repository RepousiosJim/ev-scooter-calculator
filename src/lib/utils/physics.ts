import type { ScooterConfig, PerformanceStats, Bottleneck, Recommendation, UpgradeDelta, PredictionMode } from '$lib/types';
import * as PHYSICS_CONSTANTS from '$lib/constants/physics';
import * as CACHE_CONSTANTS from '$lib/constants/cache';

const NOMINAL_VOLTAGE = 52;
const PERFORMANCE_CACHE_LIMIT = 200;
const performanceCache = new Map<string, PerformanceStats>();

function getPerformanceCacheKey(config: ScooterConfig, mode: PredictionMode): string {
  const entries = Object.keys(config)
    .sort()
    .map((key) => {
      const value = config[key as keyof ScooterConfig];
      return `${key}:${typeof value === 'number' && Number.isFinite(value) ? value : ''}`;
    })
    .join('|');

  return `${mode}|${entries}`;
}

// LRU Cache implementation for better cache utilization
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Re-insert to mark as recently used
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first entry)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

const performanceCache = new LRUCache<string, PerformanceStats>(CACHE_CONSTANTS.PERFORMANCE_CACHE_LIMIT);

export function calculateTemperatureFactor(ambientTemp: number): number {
  if (ambientTemp >= 20) return 1.0;
  if (ambientTemp <= -20) return 0.6;

  const tempRange = 40;
  const normalizedTemp = (ambientTemp + 20) / tempRange;
  const tempFactor = 0.6 + (normalizedTemp * 0.4);

  return tempFactor;
}

function getPerformanceCacheKey(config: ScooterConfig, mode: PredictionMode): string {
  const entries = Object.keys(config)
    .sort()
    .map((key) => {
      const value = config[key as keyof ScooterConfig];
      if (value === undefined) return `${key}:undefined`;
      if (value === null) return `${key}:null`;
      if (typeof value === 'number' && !Number.isFinite(value)) return `${key}:${String(value)}`;
      if (typeof value === 'number') return `${key}:${value}`;
      if (typeof value === 'string') return `${key}:"${value}"`;
      if (typeof value === 'boolean') return `${key}:${value}`;
      return `${key}:${JSON.stringify(value)}`;
    })
    .join('|');

  return `${mode}|${entries}`;
}

export function calculatePerformance(config: ScooterConfig, mode: PredictionMode = 'spec'): PerformanceStats {
  const cacheKey = getPerformanceCacheKey(config, mode);
  const cached = performanceCache.get(cacheKey);
  if (cached) return cached;

  // Apply mode-specific corrections
  const drivetrainEfficiency = config.drivetrainEfficiency ?? 0.9;
  const batterySagPercent = config.batterySagPercent ?? 0.08;

  // Real-world mode applies additional corrections
  const modeEfficiencyFactor = mode === 'realworld' ? 0.85 : 1.0;
  const effectiveDrivetrainEfficiency = drivetrainEfficiency * modeEfficiencyFactor;

  const minSagPercent = mode === 'realworld' ? 0.05 : 0;
  const effectiveSagPercent = Math.max(batterySagPercent, minSagPercent);

  // Calculate temperature factor (affects battery capacity and power)
  const temperatureFactor = calculateTemperatureFactor(config.ambientTemp);

  // 1. Apply battery health and temperature to capacity
  const effectiveAh = config.ah * config.soh * temperatureFactor;
  const wh = config.v * effectiveAh;
  const voltageFactor = config.v / NOMINAL_VOLTAGE;

  // Apply sag to effective voltage
  const effectiveVoltage = config.v * (1 - effectiveSagPercent);
  const effectiveVoltageFactor = effectiveVoltage / NOMINAL_VOLTAGE;

  // 2. Calculate total power (apply temperature factor once to power only)
  const totalWatts = config.motors * config.watts * effectiveVoltageFactor * temperatureFactor;

  // 3. Calculate maximum speed based on motorKv or voltage
  const maxSpeed = calculateMaxSpeed(config, effectiveDrivetrainEfficiency);

  // 4. Apply aerodynamic drag to find equilibrium speed (optimized O(1))
  // 4. Apply aerodynamic drag and rolling resistance to find equilibrium speed
  const CdA = (config.dragCoefficient && config.frontalArea)
    ? config.dragCoefficient * config.frontalArea
    : config.ridePosition;

  const speed = calculateEquilibriumSpeed(
    totalWatts,
    CdA,
    config.weight,
    config.scooterWeight ?? ((wh * 0.06) + 15),
    maxSpeed,
    0,
    config.rollingResistance
  );

  // 5. Calculate hill climb speed
  const hillSpeed = calculateEquilibriumSpeed(
    totalWatts,
    CdA,
    config.weight,
    config.scooterWeight ?? ((wh * 0.06) + 15),
    maxSpeed,
    config.slope,
    config.rollingResistance
  );

  // 6. Calculate range (with regen)
  const baseRange = wh / config.style;
  const regenGain = baseRange * (config.regen * 0.2);
  const totalRange = baseRange + regenGain;

  // 7. Calculate charging time
  const chargerWatts = config.charger * config.v;
  const chargeTime = chargerWatts > 0 ? (wh / chargerWatts) * 1.2 : 0;

  // 8. Calculate cost
  const costPerCharge = (wh / 1000) * config.cost;
  const costPer100km = (100 / totalRange) * costPerCharge;

  // 9. Calculate acceleration score (power to weight)
  const scooterWeight = config.scooterWeight ?? ((wh * 0.06) + 15);
  const totalWeight = scooterWeight + config.weight;
  const powerToWeight = totalWatts / totalWeight;
  const accelScore = Math.min(100, (powerToWeight / 25) * 100);

  // 10. Calculate current draw and C-rate
  const amps = totalWatts / config.v;
  const cRate = amps / config.ah;

  const result = {
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

  if (performanceCache.size >= CACHE_CONSTANTS.PERFORMANCE_CACHE_LIMIT) {
    performanceCache.clear();
  }
  performanceCache.set(cacheKey, result);

  return result;
}

function calculateMaxSpeed(config: ScooterConfig, efficiency: number = 1.0): number {
  if (config.motorKv) {
    const circumferenceM = (config.wheel * 0.0254) * Math.PI;
    const motorRpm = config.motorKv * config.v;
    return (motorRpm * circumferenceM * 60) / 1000 * efficiency;
  }
  if (config.rpm) {
    const circumferenceM = (config.wheel * 0.0254) * Math.PI;
    return (config.rpm * circumferenceM * 60) / 1000 * 0.85;
  }
  return (config.v / NOMINAL_VOLTAGE) * 75;
}





export function detectBottlenecks(
  stats: PerformanceStats,
  config: ScooterConfig
): Bottleneck[] {
  const bottlenecks: Bottleneck[] = [];

  // Calibrated C-rate thresholds based on battery chemistry
  if (stats.cRate > 3.0) {
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

  // Gear ratio limitation (calibrated for BLDC motors)
  if (stats.speed < 45 && config.v > 48 && stats.accelScore < 50) {
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

export function generateRecommendations(config: ScooterConfig, stats: PerformanceStats): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const currentSpec = calculatePerformance(config, 'spec');
  const currentRealworld = calculatePerformance(config, 'realworld');

  // Parallel battery recommendation
  if (stats.cRate > 2.0 || stats.totalRange < 50) {
    const parallelConfig: ScooterConfig = { ...config, ah: config.ah * 2 };
    const parallelSpec = calculatePerformance(parallelConfig, 'spec');
    const parallelRealworld = calculatePerformance(parallelConfig, 'realworld');

    recommendations.push({
      upgradeType: 'parallel',
      title: 'Add Parallel Battery',
      reason: stats.cRate > 2.0
        ? `Battery C-rate (${stats.cRate.toFixed(1)}C) exceeds safe limits, causing voltage sag.`
        : `Range (${stats.totalRange.toFixed(0)} km) is limited by battery capacity.`,
      whatChanges: 'Doubles battery capacity, halves C-rate, significantly reduces voltage sag.',
      expectedGains: {
        spec: `+${((parallelSpec.totalRange / currentSpec.totalRange - 1) * 100).toFixed(0)}% range, ${(parallelSpec.cRate / currentSpec.cRate).toFixed(2)}x lower C-rate`,
        realworld: `+${((parallelRealworld.totalRange / currentRealworld.totalRange - 1) * 100).toFixed(0)}% range, ${(parallelRealworld.cRate / currentRealworld.cRate).toFixed(2)}x lower C-rate`
      },
      tradeoffs: 'Increases weight by ~8-12kg. Requires battery enclosure modification.',
      confidence: 'high',
      estimatedCost: '$300-600',
      difficulty: 'moderate'
    });
  }

  // Voltage boost recommendation
  if (stats.speed < 50 && config.v < 72 && stats.accelScore < 60) {
    const voltageConfig: ScooterConfig = { ...config, v: Math.round(config.v * 1.2) };
    const voltageSpec = calculatePerformance(voltageConfig, 'spec');
    const voltageRealworld = calculatePerformance(voltageConfig, 'realworld');

    recommendations.push({
      upgradeType: 'voltage',
      title: 'Voltage Boost (+20%)',
      reason: `Top speed (${stats.speed.toFixed(0)} km/h) and acceleration (${stats.accelScore.toFixed(0)}/100) are limited by voltage.`,
      whatChanges: 'Increases motor RPM and torque for higher top speed and better acceleration.',
      expectedGains: {
        spec: `+${((voltageSpec.speed / currentSpec.speed - 1) * 100).toFixed(0)}% top speed, +${(voltageSpec.accelScore - currentSpec.accelScore).toFixed(0)} accel`,
        realworld: `+${((voltageRealworld.speed / currentRealworld.speed - 1) * 100).toFixed(0)}% top speed, +${(voltageRealworld.accelScore - currentRealworld.accelScore).toFixed(0)} accel`
      },
      tradeoffs: 'Requires new controller (matched to voltage). Check motor voltage rating.',
      confidence: 'medium',
      estimatedCost: '$200-500',
      difficulty: 'hard'
    });
  }

  // Controller upgrade recommendation
  if (config.controller && config.controller < (stats.totalWatts / config.v) * 0.8) {
    const controllerSpec = calculatePerformance({ ...config, controller: undefined }, 'spec');
    const controllerRealworld = calculatePerformance({ ...config, controller: undefined }, 'realworld');

    recommendations.push({
      upgradeType: 'controller',
      title: 'High-Amp Controller',
      reason: `Current ${config.controller}A controller limits motor output to ${(config.controller * config.v).toFixed(0)}W vs ${stats.totalWatts.toFixed(0)}W potential.`,
      whatChanges: 'Allows motors to reach full power output for better acceleration and hill climbing.',
      expectedGains: {
        spec: `+${(((config.motors * config.watts * (config.v / NOMINAL_VOLTAGE)) - (config.controller * config.v)) / (config.controller * config.v) * 100).toFixed(0)}% power output`,
        realworld: 'Improved acceleration and hill climbing in real-world conditions'
      },
      tradeoffs: 'May require thicker gauge wiring. Check motor thermal limits.',
      confidence: 'high',
      estimatedCost: '$150-300',
      difficulty: 'moderate'
    });
  }

  // Motor upgrade recommendation
  if (stats.accelScore < 40 && config.motors === 1) {
    const motorConfig: ScooterConfig = { ...config, motors: 2, watts: config.watts * 1.5 };
    const motorSpec = calculatePerformance(motorConfig, 'spec');
    const motorRealworld = calculatePerformance(motorConfig, 'realworld');

    recommendations.push({
      upgradeType: 'motor',
      title: 'Dual High-Power Motors',
      reason: `Single ${config.watts}W motor provides weak acceleration (${stats.accelScore.toFixed(0)}/100).`,
      whatChanges: 'Adds second motor with higher wattage for dual-drive traction.',
      expectedGains: {
        spec: `+${(motorSpec.accelScore - currentSpec.accelScore).toFixed(0)} acceleration score, better hill climbing`,
        realworld: `+${(motorRealworld.accelScore - currentRealworld.accelScore).toFixed(0)} acceleration score, improved traction`
      },
      tradeoffs: 'Higher power consumption reduces range. May require controller upgrade.',
      confidence: 'medium',
      estimatedCost: '$400-800',
      difficulty: 'hard'
    });
  }

  // Tires/gearing recommendation
  if (config.ridePosition > 0.55) {
    recommendations.push({
      upgradeType: 'tires',
      title: 'Low-Rolling Tires',
      reason: 'Current setup likely uses standard street tires with higher rolling resistance.',
      whatChanges: 'Switch to low-rolling-resistance tires or larger diameter wheels.',
      expectedGains: {
        spec: '+5-10% range, smoother ride quality',
        realworld: '+5-10% real-world range, reduced energy waste'
      },
      tradeoffs: 'Low-profile tires may have reduced comfort and off-road capability.',
      confidence: 'low',
      estimatedCost: '$80-150',
      difficulty: 'easy'
    });
  }

  return recommendations;
}

export function getAllUpgrades(config: ScooterConfig, stats: PerformanceStats): Recommendation[] {
  const allPossible: Recommendation[] = [];
  const currentSpec = calculatePerformance(config, 'spec');
  const currentRealworld = calculatePerformance(config, 'realworld');

  const upgradeTypes: Recommendation['upgradeType'][] = ['parallel', 'voltage', 'controller', 'motor', 'tires'];

  upgradeTypes.forEach(type => {
    let title = '';
    let reason = 'Experimental/Not currently recommended for this model.';
    let whatChanges = '';
    let expectedGains = { spec: '', realworld: '' };
    let tradeoffs = '';
    let confidence: Recommendation['confidence'] = 'low';
    let estimatedCost = '';
    let difficulty: Recommendation['difficulty'] = 'hard';

    const upgradedConfig = simulateUpgrade(config, type);
    const upgradedSpec = calculatePerformance(upgradedConfig, 'spec');
    const upgradedRealworld = calculatePerformance(upgradedConfig, 'realworld');

    switch (type) {
      case 'parallel':
        title = 'Add Parallel Battery';
        whatChanges = 'Doubles battery capacity, halves C-rate, significantly reduces voltage sag.';
        expectedGains = {
          spec: `+${((upgradedSpec.totalRange / currentSpec.totalRange - 1) * 100).toFixed(0)}% range`,
          realworld: `+${((upgradedRealworld.totalRange / currentRealworld.totalRange - 1) * 100).toFixed(0)}% range`
        };
        tradeoffs = 'Increases weight by ~8-12kg.';
        estimatedCost = '$300-600';
        difficulty = 'moderate';
        break;
      case 'voltage':
        title = 'Voltage Boost (+20%)';
        whatChanges = 'Increases motor RPM and torque for higher top speed.';
        expectedGains = {
          spec: `+${((upgradedSpec.speed / currentSpec.speed - 1) * 100).toFixed(0)}% top speed`,
          realworld: `+${((upgradedRealworld.speed / currentRealworld.speed - 1) * 100).toFixed(0)}% top speed`
        };
        tradeoffs = 'Requires new controller and charger.';
        estimatedCost = '$200-500';
        difficulty = 'hard';
        break;
      case 'controller':
        title = 'High-Amp Controller';
        whatChanges = 'Allows motors to reach higher peak power output.';
        expectedGains = {
          spec: `+${((upgradedSpec.totalWatts / currentSpec.totalWatts - 1) * 100).toFixed(0)}% peak power`,
          realworld: 'Better acceleration'
        };
        tradeoffs = 'Higher battery stress. Check thermal limits.';
        estimatedCost = '$150-300';
        difficulty = 'moderate';
        break;
      case 'motor':
        title = 'Dual High-Power Motors';
        whatChanges = 'Adds/Upgrades motors for dual-drive traction.';
        expectedGains = {
          spec: `+${(upgradedSpec.accelScore - currentSpec.accelScore).toFixed(0)} accel score`,
          realworld: 'Improved hill climbing'
        };
        tradeoffs = 'Higher consumption. Needs dual controllers.';
        estimatedCost = '$400-800';
        difficulty = 'hard';
        break;
      case 'tires':
        title = 'Low-Rolling Tires';
        whatChanges = 'Switch to high-performance low-resistance tires.';
        expectedGains = {
          spec: '+5-10% range',
          realworld: '+5-10% range'
        };
        tradeoffs = 'Reduced off-road grip.';
        estimatedCost = '$80-150';
        difficulty = 'easy';
        break;
    }

    allPossible.push({
      upgradeType: type,
      title,
      reason,
      whatChanges,
      expectedGains,
      tradeoffs,
      confidence,
      estimatedCost,
      difficulty
    });
  });

  return allPossible;
}

export function simulateUpgrade(
  config: ScooterConfig,
  upgradeType: 'parallel' | 'voltage' | 'controller' | 'motor' | 'tires'
): ScooterConfig {
  const newConfig: ScooterConfig = { ...config };

  switch (upgradeType) {
    case 'parallel':
      newConfig.ah *= 2;
      break;
    case 'voltage':
      newConfig.v = Math.round(newConfig.v * 1.2);
      break;
    case 'controller':
      newConfig.controller = undefined;
      break;
    case 'motor':
      if (newConfig.motors === 1) {
        newConfig.motors = 2;
      }
      newConfig.watts = Math.round(newConfig.watts * 1.5);
      break;
    case 'tires':
      if (newConfig.wheel < 11) {
        newConfig.wheel = Math.min(newConfig.wheel + 1, 11);
      }
      break;
  }

  return newConfig;
}

export function calculateUpgradeDelta(
  config: ScooterConfig,
  upgradeType: 'parallel' | 'voltage' | 'controller' | 'motor' | 'tires'
): UpgradeDelta {
  const currentSpec = calculatePerformance(config, 'spec');
  const currentRealworld = calculatePerformance(config, 'realworld');

  const upgradedConfig = simulateUpgrade(config, upgradeType);
  const upgradedSpec = calculatePerformance(upgradedConfig, 'spec');
  const upgradedRealworld = calculatePerformance(upgradedConfig, 'realworld');

  const safePercent = (current: number, upgraded: number) => {
    if (current === 0) return 0;
    return (upgraded / current - 1) * 100;
  };

  return {
    mode: 'spec',
    whChange: upgradedSpec.wh - currentSpec.wh,
    rangeChange: upgradedSpec.totalRange - currentSpec.totalRange,
    speedChange: upgradedSpec.speed - currentSpec.speed,
    hillSpeedChange: upgradedSpec.hillSpeed - currentSpec.hillSpeed,
    powerChange: upgradedSpec.totalWatts - currentSpec.totalWatts,
    chargeTimeChange: upgradedSpec.chargeTime - currentSpec.chargeTime,
    costChange: upgradedSpec.costPer100km - currentSpec.costPer100km,
    accelChange: upgradedSpec.accelScore - currentSpec.accelScore,
    ampsChange: upgradedSpec.amps - currentSpec.amps,
    cRateChange: upgradedSpec.cRate - currentSpec.cRate,
    whPercent: safePercent(currentSpec.wh, upgradedSpec.wh),
    rangePercent: safePercent(currentSpec.totalRange, upgradedSpec.totalRange),
    speedPercent: safePercent(currentSpec.speed, upgradedSpec.speed),
    hillSpeedPercent: safePercent(currentSpec.hillSpeed, upgradedSpec.hillSpeed),
    powerPercent: safePercent(currentSpec.totalWatts, upgradedSpec.totalWatts),
    chargeTimePercent: safePercent(currentSpec.chargeTime, upgradedSpec.chargeTime),
    costPercent: safePercent(currentSpec.costPer100km, upgradedSpec.costPer100km),
    accelPercent: safePercent(currentSpec.accelScore, upgradedSpec.accelScore),
    ampsPercent: safePercent(currentSpec.amps, upgradedSpec.amps),
    cRatePercent: safePercent(currentSpec.cRate, upgradedSpec.cRate)
  };
}

export interface RideModeImpact {
  rangeDelta: number;
  rangePercent: number;
  speedDelta: number;
  speedPercent: number;
  powerDelta: number;
  powerPercent: number;
}

export function calculateRideModeImpact(
  config: ScooterConfig,
  targetStyle: number,
  targetRegen: number,
  mode: PredictionMode = 'spec'
): RideModeImpact {
  const currentStats = calculatePerformance(config, mode);

  const modifiedConfig: ScooterConfig = {
    ...config,
    style: targetStyle,
    regen: targetRegen
  };

  const modifiedStats = calculatePerformance(modifiedConfig, mode);

  const safePercent = (current: number, modified: number) => {
    if (current === 0) return 0;
    return (modified / current - 1) * 100;
  };

  return {
    rangeDelta: modifiedStats.totalRange - currentStats.totalRange,
    rangePercent: safePercent(currentStats.totalRange, modifiedStats.totalRange),
    speedDelta: modifiedStats.speed - currentStats.speed,
    speedPercent: safePercent(currentStats.speed, modifiedStats.speed),
    powerDelta: modifiedStats.totalWatts - currentStats.totalWatts,
    powerPercent: safePercent(currentStats.totalWatts, modifiedStats.totalWatts)
  };
}

function calculateEquilibriumSpeed(
  totalWatts: number,
  CdA: number,
  riderWeight: number,
  scooterWeight: number,
  maxMechanicalSpeedKmh: number,
  slopePercent: number,
  rollingResistance?: number
): number {
  const totalWeight = riderWeight + scooterWeight;
  const slopeRad = Math.atan(slopePercent / 100);

  // Force Gravity parallel to slope (component acting against motion)
  const F_gravity = totalWeight * PHYSICS_CONSTANTS.GRAVITY_M_S2 * Math.sin(slopeRad);

  // Force Rolling Resistance (approx F_normal ≈ mg * cos(theta))
  const Cr = rollingResistance ?? PHYSICS_CONSTANTS.ROLLING_RESISTANCE_COEFFICIENT;
  const F_rolling = Cr * totalWeight * PHYSICS_CONSTANTS.GRAVITY_M_S2 * Math.cos(slopeRad);

  const F_constant = F_gravity + F_rolling;

  // Power(v) = 0.5 * ρ * CdA * v^3 + F_constant * v
  // Solving for v where Power(v) = totalWatts

  // Binary search for v (m/s)
  let low = 0;
  let high = (maxMechanicalSpeedKmh / 3.6) + 10;

  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    if (mid <= 0) { low = mid; continue; }

    // P_drag = 0.5 * rho * CdA * v^3
    const P_aero = 0.5 * PHYSICS_CONSTANTS.AIR_DENSITY_KG_M3 * Math.pow(mid, 3) * CdA;
    // P_rolling_gravity = F_constant * v
    const P_linear = F_constant * mid;

    const P_needed = P_aero + P_linear;

    if (P_needed < totalWatts) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const speedKmh = ((low + high) / 2) * 3.6;
  return Math.min(speedKmh, maxMechanicalSpeedKmh);
}
