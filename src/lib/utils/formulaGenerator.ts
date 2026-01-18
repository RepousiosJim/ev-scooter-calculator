// Formula trace generator for Formula Details feature
import type { FormulaTrace, ScooterConfig, PerformanceStats } from '$lib/types';
import * as Formulas from '$lib/utils/formulas';

export function generateFormulaTraces(config: ScooterConfig, stats: PerformanceStats): FormulaTrace[] {
  const traces: FormulaTrace[] = [];
  const timestamp = Date.now();
  const tempFactor = Formulas.calculateTemperatureFactor(config.ambientTemp);

  // Temperature Factor trace
  traces.push({
    category: 'metrics',
    name: 'Temperature Factor',
    formula: 'TempFactor = linear_interpolation(-20°C→0.6, 20°C+→1.0)',
    inputs: [
      { name: 'Ambient Temperature', value: config.ambientTemp, unit: '°C' }
    ],
    intermediates: [
      { name: 'Freezing Factor', value: 0.6, unit: 'factor', description: 'At -20°C' },
      { name: 'Optimal Factor', value: 1.0, unit: 'factor', description: 'At 20°C+' }
    ],
    result: { value: tempFactor, unit: 'factor', label: 'Temperature Factor' },
    timestamp
  });

  // Battery Energy trace
  const effectiveCapacity = config.ah * config.soh * tempFactor;
  traces.push({
    category: 'energy',
    name: 'Battery Energy',
    formula: 'E = V × Ah × SoH × TempFactor',
    inputs: [
      { name: 'Voltage', value: config.v, unit: 'V' },
      { name: 'Capacity', value: config.ah, unit: 'Ah' },
      { name: 'Battery Health', value: config.soh * 100, unit: '%' },
      { name: 'Temperature Factor', value: tempFactor, unit: 'factor' }
    ],
    intermediates: [
      { name: 'Effective Capacity', value: effectiveCapacity, unit: 'Ah', description: 'After SoH and temperature adjustment' }
    ],
    result: { value: stats.wh, unit: 'Wh', label: 'Total Energy' },
    timestamp
  });

  // Total Power trace
  const voltageFactor = config.v / 52;
  traces.push({
    category: 'power',
    name: 'Total Power',
    formula: 'P = Motors × Watts × VoltageFactor × TempFactor',
    inputs: [
      { name: 'Motor Count', value: config.motors, unit: 'motors' },
      { name: 'Power per Motor', value: config.watts, unit: 'W' },
      { name: 'Voltage Factor', value: voltageFactor, unit: 'factor' },
      { name: 'Temperature Factor', value: tempFactor, unit: 'factor' }
    ],
    intermediates: [
      { name: 'Base Power', value: config.motors * config.watts, unit: 'W', description: 'Before adjustments' }
    ],
    result: { value: stats.totalWatts, unit: 'W', label: 'Peak Power' },
    timestamp
  });

  // Drag Speed trace
  const airDensity = 1.225;
  const cda = config.ridePosition;
  const rollingResistance = config.style * stats.totalWatts;
  traces.push({
    category: 'speed',
    name: 'Drag Limited Speed',
    formula: 'v = ∛((2 × (P - Rolling) / (ρ × CdA))) × 3.6',
    inputs: [
      { name: 'Peak Power', value: stats.totalWatts, unit: 'W' },
      { name: 'Drag Coefficient (CdA)', value: cda, unit: 'm²' },
      { name: 'Air Density', value: airDensity, unit: 'kg/m³' },
      { name: 'Rolling Resistance', value: rollingResistance, unit: 'W' }
    ],
    intermediates: [
      { name: 'Available Power', value: stats.totalWatts - rollingResistance, unit: 'W', description: 'After rolling resistance' },
      { name: 'Speed Factor', value: Math.cbrt((2 * (stats.totalWatts - rollingResistance)) / (airDensity * cda)), unit: 'm/s' }
    ],
    result: { value: stats.speed, unit: 'km/h', label: 'Top Speed' },
    timestamp
  });

  // Hill Speed trace
  const grade = config.slope / 100;
  const totalWeight = (stats.wh * 0.06) + 15 + config.weight;
  const hillForce = stats.totalWatts * 0.7 / (totalWeight * 9.81);
  traces.push({
    category: 'speed',
    name: 'Hill Climb Speed',
    formula: 'v_hill = (P × η) / (m × g × grade)',
    inputs: [
      { name: 'Peak Power', value: stats.totalWatts, unit: 'W' },
      { name: 'Total Weight', value: totalWeight, unit: 'kg' },
      { name: 'Hill Grade', value: config.slope, unit: '%' }
    ],
    intermediates: [
      { name: 'Grade Factor', value: grade, unit: 'decimal' },
      { name: 'Climb Force', value: hillForce, unit: 'm/s', description: 'Maximum sustainable climb rate' }
    ],
    result: { value: stats.hillSpeed, unit: 'km/h', label: 'Hill Climb Speed' },
    timestamp
  });

  // Range trace
  const baseRange = stats.wh / config.style;
  const regenGain = baseRange * config.regen * 0.2;
  traces.push({
    category: 'range',
    name: 'Total Range',
    formula: 'Range = (E / Consumption) + (Range × Regen × 0.2)',
    inputs: [
      { name: 'Total Energy', value: stats.wh, unit: 'Wh' },
      { name: 'Consumption Rate', value: config.style, unit: 'Wh/km' },
      { name: 'Regeneration Efficiency', value: config.regen * 100, unit: '%' }
    ],
    intermediates: [
      { name: 'Base Range', value: baseRange, unit: 'km', description: 'Without regen' },
      { name: 'Regen Gain', value: regenGain, unit: 'km', description: 'From regenerative braking' }
    ],
    result: { value: stats.totalRange, unit: 'km', label: 'Total Range' },
    timestamp
  });

  // Charging trace
  const chargePower = config.v * config.charger;
  traces.push({
    category: 'charging',
    name: 'Charging Time',
    formula: 't = (V × Ah × SoH × TempFactor) / (V × Charger × Efficiency)',
    inputs: [
      { name: 'Battery Voltage', value: config.v, unit: 'V' },
      { name: 'Capacity', value: config.ah, unit: 'Ah' },
      { name: 'Charger Amperage', value: config.charger, unit: 'A' }
    ],
    intermediates: [
      { name: 'Charge Power', value: chargePower, unit: 'W', description: 'Charger output power' },
      { name: 'Usable Energy', value: stats.wh, unit: 'Wh', description: 'Energy available for charging' }
    ],
    result: { value: stats.chargeTime, unit: 'h', label: 'Charge Time' },
    timestamp
  });

  // Cost trace
  const energyCost = (stats.wh / 1000) * config.cost;
  traces.push({
    category: 'cost',
    name: 'Cost per Charge',
    formula: 'Cost = (Wh / 1000) × Rate',
    inputs: [
      { name: 'Total Energy', value: stats.wh, unit: 'Wh' },
      { name: 'Electricity Rate', value: config.cost, unit: '$/kWh' }
    ],
    intermediates: [
      { name: 'Energy in kWh', value: stats.wh / 1000, unit: 'kWh' }
    ],
    result: { value: energyCost, unit: '$', label: 'Cost per Charge' },
    timestamp
  });

  // Acceleration trace
  const powerToWeight = stats.totalWatts / totalWeight;
  traces.push({
    category: 'metrics',
    name: 'Acceleration Score',
    formula: 'Score = min(100, (P/m ÷ 25) × 100)',
    inputs: [
      { name: 'Power-to-Weight Ratio', value: powerToWeight, unit: 'W/kg' },
      { name: 'Total Weight', value: totalWeight, unit: 'kg' }
    ],
    intermediates: [
      { name: 'Base Ratio', value: powerToWeight / 25, unit: 'ratio' }
    ],
    result: { value: stats.accelScore, unit: 'score', label: 'Acceleration (0-100)' },
    timestamp
  });

  // C-Rate trace
  const peakCurrent = stats.totalWatts / config.v;
  traces.push({
    category: 'metrics',
    name: 'C-Rate',
    formula: 'C-Rate = PeakCurrent / Capacity',
    inputs: [
      { name: 'Peak Current', value: peakCurrent, unit: 'A' },
      { name: 'Battery Capacity', value: config.ah, unit: 'Ah' }
    ],
    intermediates: [
      { name: 'Effective Capacity', value: effectiveCapacity, unit: 'Ah', description: 'After SoH adjustment' }
    ],
    result: { value: stats.cRate, unit: 'C', label: 'Discharge Rate' },
    timestamp
  });

  return traces;
}
