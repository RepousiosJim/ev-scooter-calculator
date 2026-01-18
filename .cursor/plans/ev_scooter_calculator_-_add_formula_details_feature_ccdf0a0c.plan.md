---
name: EV Scooter Calculator - Add Formula Details Feature
overview: Implement a comprehensive Formula Details feature that adds a dedicated button next to the existing save setup button, displaying all physics calculations with actual values and formula explanations in a toggleable panel.
todos:
  - id: sprint1-critical-fixes
    content: "Sprint 1: Implement critical fixes - physics optimization, constants consolidation, temperature factor fix, error logging"
    status: pending
  - id: sprint2-perf-tests
    content: "Sprint 2: Performance improvements and test coverage - LRU cache, store optimization, fix skipped tests, add unit tests"
    status: pending
  - id: sprint3-arch-security
    content: "Sprint 3: Architecture decoupling and security - physics/domain separation, file validation, URL sanitization, integration tests"
    status: pending
  - id: sprint4-features-docs
    content: "Sprint 4: Feature enhancements and documentation - upgrade simulation, ride mode UI, type cleanup, architecture docs"
    status: pending
  - id: sprint5-formula-details
    content: "Sprint 5: Add Formula Details feature - formula system, panel component, store integration, real-time updates"
    status: pending
---

# EV Scooter Calculator - Add Formula Details Feature

## Overview

Add a new "Formula Details" feature that displays all physics calculations with real-time values and formula explanations. This provides transparency into how performance metrics are computed.

## Architecture Decision

**Component Location**: The Formula Details panel should be placed in `src/lib/components/calculator/ResultDisplay.svelte` (next to performance summary cards).

**User Flow**:

1. User sees main calculator interface
2. Clicks "Formula Details" button (new, on right side of Save button)
3. Panel opens showing all calculations with:

   - Formula used (mathematical representation)
   - Input values (e.g., "Total Power = 3200W")
   - Intermediate results (e.g., "Speed MPS = 22.2 m/s")
   - Final results (e.g., "Top Speed = 79.5 km/h")

4. User can toggle panel visibility (hidden by default or always visible)
5. Values update in real-time as user changes inputs

---

## Phase 1: Data Structure & Store Updates

### 1.1 Create Formula Trace Interface

**File**: `src/lib/types.ts`

Add new type to track formula calculations:

```typescript
export interface FormulaTrace {
  category: 'energy' | 'speed' | 'power' | 'range' | 'charging' | 'cost' | 'metrics';
  name: string; // Human-readable name
  formula: string; // Mathematical formula (LaTeX-style or text)
  inputs: FormulaInput[]; // Input values used in calculation
  intermediates: FormulaIntermediate[]; // Intermediate calculation steps
  result: {
    value: number;
    unit: string;
    label: string;
  };
  timestamp: number;
}

export interface FormulaInput {
  name: string;
  value: number;
  unit: string;
}

export interface FormulaIntermediate {
  name: string;
  value: number;
  unit: string;
  description?: string;
}
```

### 1.2 Add Formula State to Calculator Store

**File**: `src/lib/stores/calculator.svelte.ts`

Add formula-related state:

```typescript
const calculatorState = $state({
  // ... existing state
  
  // Formula Details state
  showFormulas: false, // Panel visibility toggle
  formulas: FormulaTrace[], // All formula calculations
  
  // Save Setup state (for future enhancement)
  savedSetups: SavedSetup[],
  activeSetupId: string | null
});
```

### 1.3 Create Formula Generator Function

**File**: `src/lib/utils/formulaGenerator.ts` (NEW)

Create utility that generates formula traces for each calculation:

```typescript
import type { FormulaTrace, ScooterConfig, PerformanceStats } from '$lib/types';
import * as PHYSICS from '$lib/constants/physics';

export function generateFormulaTraces(
  config: ScooterConfig,
  stats: PerformanceStats
): FormulaTrace[] {
  const traces: FormulaTrace[] = [];
  
  // 1. Energy & Power Traces
  traces.push(generateEnergyTrace(config, stats));
  traces.push(generatePowerTrace(config, stats));
  
  // 2. Speed Traces
  traces.push(generateDragSpeedTrace(config, stats));
  traces.push(generateHillSpeedTrace(config, stats));
  
  // 3. Range Traces
  traces.push(generateRangeTrace(config, stats));
  
  // 4. Charging Trace
  traces.push(generateChargingTrace(config, stats));
  
  // 5. Cost Trace
  traces.push(generateCostTrace(config, stats));
  
  // 6. Metrics Traces
  traces.push(generateAccelerationTrace(config, stats));
  traces.push(generateCRateTrace(config, stats));
  
  return traces;
}

// Individual trace generators with actual values
function generateEnergyTrace(config: ScooterConfig, stats: PerformanceStats): FormulaTrace {
  return {
    category: 'energy',
    name: 'Battery Energy',
    formula: 'E = V × Ah × SoH × TempFactor',
    inputs: [
      { name: 'Voltage', value: config.v, unit: 'V' },
      { name: 'Capacity', value: config.ah, unit: 'Ah' },
      { name: 'Battery Health', value: config.soh * 100, unit: '%' },
      { name: 'Temperature Factor', value: stats.wh / (config.v * config.ah), unit: 'factor' }
    ],
    intermediates: [
      { name: 'Temperature Factor', value: Math.min(1.0, Math.max(0.6, 0.6 + ((config.ambientTemp + 20) / 40 * 0.4)), unit: 'factor' },
      { name: 'Effective Capacity', value: config.ah * config.soh * Math.min(1.0, Math.max(0.6, 0.6 + ((config.ambientTemp + 20) / 40 * 0.4)), unit: 'Ah' }
    ],
    result: {
      value: stats.wh,
      unit: 'Wh',
      label: 'Total Energy'
    },
    timestamp: Date.now()
  };
}

function generatePowerTrace(config: ScooterConfig, stats: PerformanceStats): FormulaTrace {
  return {
    category: 'power',
    name: 'Total Power',
    formula: 'P = Motors × Watts × VoltageFactor × TempFactor',
    inputs: [
      { name: 'Motor Count', value: config.motors, unit: 'x' },
      { name: 'Power per Motor', value: config.watts, unit: 'W' },
      { name: 'Voltage Factor', value: config.v / 52, unit: 'ratio' },
      { name: 'Temperature Factor', value: Math.min(1.0, Math.max(0.6, 0.6 + ((config.ambientTemp + 20) / 40 * 0.4)), unit: 'factor' }
    ],
    intermediates: [
      { name: 'Effective Voltage', value: config.v * (1 - 0.08), unit: 'V', description: 'After 8% sag' },
      { name: 'Total Power', value: stats.totalWatts, unit: 'W' }
    ],
    result: {
      value: stats.totalWatts,
      unit: 'W',
      label: 'Peak Power Output'
    },
    timestamp: Date.now()
  };
}

// Add similar functions for speed, range, charging, cost, metrics...
```

---

## Phase 2: UI Components

### 2.1 Create Formula Details Panel Component

**File**: `src/lib/components/calculator/FormulaDetailsPanel.svelte` (NEW)

Panel component showing all formula traces:

```svelte
<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';
  import type { FormulaTrace } from '$lib/types';
  
  const formulas = $derived(() => calculatorState.formulas);
  const showFormulas = $derived(() => calculatorState.showFormulas);
  
  const groupedFormulas = $derived(() => {
    const groups = {
      energy: formulas.filter(f => f.category === 'energy'),
      speed: formulas.filter(f => f.category === 'speed'),
      power: formulas.filter(f => f.category === 'power'),
      range: formulas.filter(f => f.category === 'range'),
      charging: formulas.filter(f => f.category === 'charging'),
      cost: formulas.filter(f => f.category === 'cost'),
      metrics: formulas.filter(f => f.category === 'metrics')
    };
    return groups;
  });
</script>

<div class="bg-bgCard rounded-xl p-6 border border-white/10">
  {#if showFormulas}
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold text-textMain">Formula Details</h2>
      <button 
        type="button"
        onclick={() => calculatorState.showFormulas = false}
        aria-label="Close formula details"
        class="text-textMuted hover:text-textMain"
      >
        Close
      </button>
    </div>
    
    <!-- Formula Categories as Accordions -->
    {#each Object.entries(groupedFormulas) as [category, formulaList]}
      <div class="mb-4">
        <h3 class="text-lg font-semibold text-textMain mb-2 capitalize">{category}</h3>
        
        {#each formulaList as formula}
          <div class="bg-bgInput/50 rounded-lg p-4 mb-3 border border-white/5">
            <!-- Formula -->
            <div class="text-sm text-textMain/80 mb-2">
              <code class="bg-black/30 px-2 py-1 rounded text-primary block overflow-x-auto">
                {formula.formula}
              </code>
            </div>
            
            <!-- Inputs -->
            {#if formula.inputs.length > 0}
              <div class="text-xs text-textMuted mb-2 font-semibold">Inputs</div>
              <div class="grid grid-cols-2 gap-2">
                {#each formula.inputs as input}
                  <div class="flex justify-between text-sm">
                    <span>{input.name}</span>
                    <span class="font-mono">{input.value.toFixed(2)} {input.unit}</span>
                  </div>
                {/each}
              </div>
            {/if}
            
            <!-- Intermediates -->
            {#if formula.intermediates.length > 0}
              <div class="text-xs text-textMuted mb-2 font-semibold">Calculations</div>
              <div class="space-y-1">
                {#each formula.intermediates as intermediate}
                  <div class="flex justify-between text-sm">
                    <span>{intermediate.name}</span>
                    <span class="font-mono">{intermediate.value.toFixed(2)} {intermediate.unit}</span>
                  </div>
                  {#if intermediate.description}
                    <div class="text-xs text-textMuted/70 italic">{intermediate.description}</div>
                  {/if}
                {/each}
              </div>
            {/if}
            
            <!-- Result -->
            <div class="mt-3 pt-3 border-t border-white/10">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold">{formula.result.label}</span>
                <span class="text-xl font-bold text-primary">{formula.result.value.toFixed(2)} {formula.result.unit}</span>
              </div>
            </div>
          </div>
        {/each}
      {/each}
  </div>
</div>
```

### 2.2 Update Result Display Component

**File**: `src/lib/components/calculator/ResultDisplay.svelte`

Add "Formula Details" button next to existing elements:

```svelte
<div class="flex gap-2">
  <!-- Existing Save Button -->
  <button
    onclick={saveConfiguration}
    class="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-colors"
  >
    Save Setup
  </button>
  
  <!-- NEW Formula Details Button -->
  <button
    onclick={() => calculatorState.showFormulas = !calculatorState.showFormulas}
    class="px-4 py-2 bg-bgInput border border-white/20 hover:border-white/40 hover:bg-bgInput/80 text-textMain rounded-lg font-semibold transition-colors"
    aria-label="Show formula details"
    aria-pressed={calculatorState.showFormulas}
  >
    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5m0 1-3 9 4m2 2-4m2 0l2-2.5 6m-1" />
    </svg>
    Formula Details
  </button>
</div>

<!-- NEW: Add Formula Details Panel after the results cards -->
{#if calculatorState.showFormulas}
  <FormulaDetailsPanel />
{/if}
```

---

## Phase 3: Store Integration

### 3.1 Update Main Calculator Store

**File**: `src/lib/stores/calculator.svelte.ts`

Add formula generation to derived properties:

```typescript
import { generateFormulaTraces } from '$lib/utils/formulaGenerator';

const formulas = $derived.by(() => {
  return generateFormulaTraces(calculatorState.config, calculatorState.stats);
});

const calculatorState = $state({
  // ... existing config
  
  formulas,
  showFormulas: false,
  
  // ... existing state
});
```

### 3.2 Add Toggle Actions

Add actions for showing/hiding panel:

```typescript
export function toggleFormulas(): void {
  calculatorState.showFormulas = !calculatorState.showFormulas;
}

export function showFormulas(): void {
  calculatorState.showFormulas = true;
}

export function hideFormulas(): void {
  calculatorState.showFormulas = false;
}
```

---

## Phase 4: Formula System Implementation

### 4.1 Implement Core Physics Formulas

**File**: `src/lib/utils/formulas.ts` (NEW)

Create dedicated formula functions matching current physics.ts logic:

```typescript
export * as Formulas from './formula-constants';

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
  if (ambientTemp >= 20) return 1.0;
  if (ambientTemp <= -20) return 0.6;
  const tempRange = 40;
  const normalizedTemp = (ambientTemp + 20) / tempRange;
  return 0.6 + (normalizedTemp * 0.4);
}

// Speed Formulas
export function calculateTheoreticalMaxSpeed(
  motorKv: number,
  voltage: number,
  wheelDiameterInches: number,
  efficiency: number
): number {
  const circumference = (wheelDiameterInches * 0.0254) * Math.PI;
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
  return Math.min(100, (powerToWeightRatio / 25) * 100);
}

export function calculateCRate(peakCurrent: number, capacityAh: number): number {
  return peakCurrent / capacityAh;
}

// Weight Estimation
export function estimateScooterWeight(energyWh: number): number {
  return (energyWh * 0.06) + 15;
}
```

### 4.2 Add Formula Constants

**File**: `src/lib/utils/formula-constants.ts` (NEW)

Centralize all physics constants:

```typescript
export const PHYSICS = {
  // Physical Constants
  AIR_DENSITY: 1.225,        // kg/m³
  GRAVITY: 9.81,             // m/s²
  INCH_TO_METER: 0.0254,   // Conversion factor
  
  // Scooter-Specific Constants
  FRONTAL_AREA: 0.6,          // m² (estimated)
  NOMINAL_VOLTAGE: 52,       // V
  BASE_ACCEL_RATIO: 25,        // W/kg for 100% score
  
  // Drag Coefficients
  DRAG: {
    UPRIGHT: 0.6,      // Sitting
    LEANING: 0.4,      // Forward
    TUCKED: 0.5,       // Crouched
  },
  
  // Efficiency Factors
  EFFICIENCY: {
    DRIVETRAIN: 0.92,     // Belt drive
    CHAIN_DRIVE: 0.95,     // Chain drive
    DIRECT_DRIVE: 0.98,     // Hub motor
  },
  
  // Battery Factors
  BATTERY: {
    CELL_VOLTAGE: 3.7,      // Nominal Li-ion cell voltage
    CHARGING_EFFICIENCY: 0.85, // Charging efficiency
    DISCHARGE_EFFICIENCY: 0.95,  // Discharge efficiency
    MIN_SOH: 0.5,          // Minimum state of health
    MAX_SOH: 1.0,          // Maximum state of health
  },
  
  // Temperature Factors
  TEMPERATURE: {
    FREEZING_TEMP: -20,    // °C
    COLD_TEMP: 0,          // °C
    MILD_TEMP: 10,          // °C
    OPTIMAL_TEMP: 20,       // °C
    HOT_TEMP: 30,          // °C
    FREEZING_FACTOR: 0.6,  // 60% efficiency
    COLD_FACTOR: 0.7,        // 85% efficiency
    OPTIMAL_FACTOR: 1.0    // 100% efficiency
  },
  
  // Regen Factors
  REGEN: {
    BASE_FACTOR: 0.2,    // Conservative regen recovery
    MAX_FACTOR: 0.3      // Aggressive regen recovery
  },
  
  // Charging Factors
  CHARGING: {
    EFFICIENCY: 0.85,     // Battery charging efficiency
    OVERHEAD: 1.2,        // 20% overhead for charger losses
  },
  
  // Weight Factors
  WEIGHT: {
    KG_PER_WH: 0.06,      // Estimated scooter kg per Wh
    MIN_SCOOTER: 15,     // kg (base weight)
  RIDER_MIN: 50,         // kg
    RIDER_MAX: 150,        // kg
  }
};
```

### 4.3 Create Formula Trace Generator

**File**: `src/lib/utils/formulaGenerator.ts` (NEW)

Generates formula traces using the dedicated formulas:

```typescript
import * as Formulas from './formula-constants';
import type { FormulaTrace, ScooterConfig, PerformanceStats } from '$lib/types';

export function generateFormulaTraces(
  config: ScooterConfig,
  stats: PerformanceStats
): FormulaTrace[] {
  const traces: FormulaTrace[] = [];
  
  // Temperature calculation (shown in multiple places)
  const tempFactor = Formulas.calculateTemperatureFactor(config.ambientTemp);
  traces.push({
    category: 'energy',
    name: 'Temperature Factor',
    formula: 'TempFactor = 0.6 + ((Temp + 20) / 40 × 0.4)',
    inputs: [
      { name: 'Ambient Temperature', value: config.ambientTemp, unit: '°C' }
    ],
    intermediates: [
      { name: 'Normalized Temp', value: (config.ambientTemp + 20) / 40, unit: 'ratio' }
    ],
    result: {
      value: tempFactor,
      unit: 'factor',
      label: 'Temperature Efficiency'
    },
    timestamp: Date.now()
  });
  
  // Energy calculation
  traces.push(generateEnergyTrace(config, stats));
  
  // Power calculation (show voltage factor, temperature factor)
  traces.push(generatePowerTrace(config, stats));
  
  // Speed calculations
  traces.push(generateDragSpeedTrace(config, stats));
  traces.push(generateHillSpeedTrace(config, stats));
  
  // Range calculation
  traces.push(generateRangeTrace(config, stats));
  
  // Charging calculation
  traces.push(generateChargingTrace(config, stats));
  
  // Cost calculation
  traces.push(generateCostTrace(config, stats));
  
  // Metrics calculations
  traces.push(generateAccelerationTrace(config, stats));
  traces.push(generateCRateTrace(config, stats));
  
  return traces;
}
```

---

## Phase 5: Integration & Testing

### 5.1 Update physics.ts to use formula system

**File**: `src/lib/utils/physics.ts`

Refactor calculatePerformance to use formula functions:

```typescript
import * as Formulas from './formula-constants';

export function calculatePerformance(config: ScooterConfig, mode: PredictionMode = 'spec'): PerformanceStats {
  // Use formula functions instead of inline calculations
  const temperatureFactor = Formulas.calculateTemperatureFactor(config.ambientTemp);
  
  const effectiveAh = config.ah * config.soh * temperatureFactor;
  const wh = Formulas.calculateBatteryEnergy(config.v, effectiveAh, config.soh, temperatureFactor);
  const maxSpeed = Formulas.calculateTheoreticalMaxSpeed(
    config.motorKv ?? 0,
    config.v,
    config.wheel,
    0.92
  );
  
  const totalWatts = Formulas.calculateTotalPower(
    config.motors,
    config.watts,
    config.v / 52,
    temperatureFactor
  );
  
  // ... continue with other formula functions
}
```

### 5.2 Add Unit Tests for Formulas

**File**: `tests/unit/formulas.spec.ts` (NEW)

Comprehensive tests for all formula functions:

```typescript
describe('Physics Formulas', () => {
  it('calculates temperature factor correctly', () => {
    expect(Formulas.calculateTemperatureFactor(20)).toBe(1.0);
    expect(Formulas.calculateTemperatureFactor(0)).toBe(0.7);
    expect(Formulas.calculateTemperatureFactor(-20)).toBe(0.6);
  });
  
  it('calculates battery energy correctly', () => {
    expect(Formulas.calculateBatteryEnergy(52, 16, 1.0, 1.0)).toBe(832);
    expect(Formulas.calculateBatteryEnergy(52, 16, 0.8, 0.6)).toBe(399.36);
  });
  
  it('calculates theoretical max speed correctly', () => {
    const result = Formulas.calculateTheoreticalMaxSpeed(150, 72, 10, 0.92);
    expect(result).toBeCloseTo(79.5, 0.1);
  });
  
  it('calculates drag-limited speed correctly', () => {
    const result = Formulas.calculateDragLimitedSpeed(3000, 0.6, 1.225, 15, 100);
    expect(result).toBeCloseTo(79.5, 0.5);
  });
  
  it('calculates power-to-weight ratio correctly', () => {
    const result = Formulas.calculatePowerToWeightRatio(3200, 100);
    expect(result).toBe(32);
  });
});
```

### 5.3 E2E Tests

**File**: `tests/e2e/formula-details.spec.ts` (NEW)

Test formula panel functionality:

```typescript
test.describe('Formula Details Feature', () => {
  test('displays formula details panel when button clicked', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Formula Details');
    await expect(page.locator('.bg-bgCard').toBeVisible();
    await expect(page.locator('text=Formula Details')).toBeVisible();
  });
  
  test('hides formula details panel when button clicked again', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Formula Details');
    await expect(page.locator('.bg-bgCard')).toBeVisible();
    
    await page.click('text=Formula Details');
    await expect(page.locator('.bg-bgCard')).not.toBeVisible();
  });
  
  test('shows all formula categories', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Formula Details');
    
    await expect(page.locator('text=Energy')).toBeVisible();
    await expect(page.locator('text=Speed')).toBeVisible();
    await expect(page.locator('text=Power')).toBeVisible();
    await expect(page.locator('text=Range')).toBeVisible();
    await expect(page.locator('text=Charging')).toBeVisible();
    await expect(page.locator('text=Cost')).toBeVisible();
    await expect(page.locator('text=Metrics')).toBeVisible();
  });
  
  test('formula values update in real-time when inputs change', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Formula Details');
    
    const initialRange = await page.locator('text=Range').textContent();
    
    await page.getByLabel('Battery Capacity').fill('30');
    await page.waitForTimeout(500);
    
    const updatedRange = await page.locator('text=Range').textContent();
    expect(updatedRange).not.toEqual(initialRange);
  });
});
```

---

## Implementation Order

1. **Phase 1**: Data structures and types
2. **Phase 2**: Formula system and constants
3. **Phase 3**: Formula generator
4. **Phase 4**: UI components
5. **Phase 5**: Store integration
6. **Phase 6**: Testing

## Files to Create

- `src/lib/types.ts` - Add FormulaTrace, FormulaInput, FormulaIntermediate interfaces
- `src/lib/stores/calculator.svelte.ts` - Add formulas state and toggle actions
- `src/lib/utils/formula-constants.ts` - Centralize all physics constants
- `src/lib/utils/formulas.ts` - Dedicated formula functions
- `src/lib/utils/formulaGenerator.ts` - Generate formula traces from calculations
- `src/lib/components/calculator/FormulaDetailsPanel.svelte` - Main panel component
- Update `src/lib/components/calculator/ResultDisplay.svelte` - Add Formula Details button
- `tests/unit/formulas.spec.ts` - Formula function tests
- `tests/e2e/formula-details.spec.ts` - Feature E2E tests

## Features

- Real-time formula display with actual values
- Formula explanations in mathematical notation
- Categorized display (Energy, Speed, Power, Range, etc.)
- Toggle visibility (hidden by default)
- Accordion-style organization for each formula
- Input values, intermediate calculations, and final results shown
- Updates instantly as calculator inputs change

## Success Metrics

- Formula display accuracy: 100% (matches calculator exactly)
- Real-time updates: All formulas react to input changes
- Accessibility: Proper ARIA labels and keyboard navigation
- Performance: Minimal overhead from formula generation
- Code quality: Comprehensive unit tests for all formulas