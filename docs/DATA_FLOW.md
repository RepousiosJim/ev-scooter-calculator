# Data Flow Documentation

Complete data flow architecture for the EV Scooter Calculator.

---

## Overview

The application follows a **unidirectional data flow** pattern:

```
User Input → Component Event → Action Function → 
Normalization → State Update → $derived Recomputation → 
UI Re-render
```

---

## State Architecture

### Store Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Presets    │  │  Ride Modes  │  │  Constants   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    State Layer                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              calculatorState (Svelte 5)               │  │
│  │  ┌──────────────┐  ┌──────────────┐                  │  │
│  │  │    config    │  │    stats     │                  │  │
│  │  │  (mutable)   │  │  ($derived)   │                  │  │
│  │  └──────────────┘  └──────────────┘                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   UI Layer      │ │   Physics       │ │   Export        │
│  Components     │ │   Engine        │ │   Layer         │
│                 │ │                 │ │                 │
│ • Input forms   │ │ • Calculations  │ │ • URL sharing   │
│ • Visualizations│ │ • Bottlenecks   │ │ • Config files  │
│ • Comparisons   │ │ • Upgrades      │ │ • Analytics     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## Calculator State

### State Object Structure

```typescript
// src/lib/stores/calculator.svelte.ts
calculatorState = $state({
  // Domain State (User Input)
  config: ScooterConfig,           // Current configuration
  predictionMode: PredictionMode,  // 'spec' | 'realworld'
  rideMode: RideMode,              // 'eco' | 'normal' | 'sport' | 'turbo'
  activePresetKey: string,         // Selected preset ID
  
  // Simulation State
  simulatedConfig: ScooterConfig | null,
  activeUpgrade: UpgradeType | null,
  
  // UI State
  formulas: FormulaTrace[],
  
  // Computed Values ($derived)
  get stats(): PerformanceStats,
  get bottlenecks(): Bottleneck[],
  get recommendations(): Recommendation[],
  get simStats(): PerformanceStats | null,
  get upgradeDelta(): UpgradeDelta | null,
  get performanceGrade(): string,
});
```

### State Mutations

All state mutations go through **action functions**:

```typescript
// Configuration updates
updateConfig(key, value)      // Update single field
applyConfig(partialConfig)    // Batch update
resetConfig()                 // Reset to defaults

// Preset management
loadPreset(presetKey)         // Load preset

// Simulation
simulateUpgrade(type)         // Start simulation
clearSimulation()             // Clear simulation

// Mode changes
setPredictionMode(mode)       // Switch prediction mode
applyRideMode(mode)           // Apply ride mode preset

// Sharing
loadConfigFromUrl()           // Load from URL params
createShareLink(config)       // Generate share URL
```

---

## Data Flow Examples

### Example 1: Slider Input

```
User drags voltage slider
        │
        ▼
BasicConfig.svelte
├── oninput event triggered
├── Calls updateConfig('v', newValue)
│
        ▼
updateConfig() action
├── normalizeConfigValue('v', newValue, oldValue)
├── Clamps to valid range (24-96V)
├── Updates calculatorState.config.v
├── Sets activePresetKey = 'custom'
├── Calls regenerateFormulas()
│
        ▼
Reactive Update (Svelte 5)
├── calculatorState.config.v changes
├── All $derived getters recompute:
│   ├── stats (→ calculatePerformance())
│   ├── bottlenecks (→ detectBottlenecks())
│   ├── recommendations (→ generateRecommendations())
│   └── performanceGrade
│
        ▼
UI Re-renders
├── PerformanceSummary updates
├── PowerGraph recalculates
├── BottleneckPanel updates
└── EfficiencyPanel updates
```

### Example 2: Preset Selection

```
User selects "Segway Ninebot Max"
        │
        ▼
PresetSelector.svelte
├── Calls loadPreset('segway-ninebot-max')
│
        ▼
loadPreset() action
├── Retrieves preset from presets data
├── Preserves ambientTemp (user preference)
├── Calls applyConfig(preset)
│   ├── normalizeConfig(preset, baseConfig)
│   └── Updates calculatorState.config
├── Updates activePresetKey
├── Shows toast notification
└── Calls regenerateFormulas()
│
        ▼
Reactive Update
├── All computed values recalculate
├── Formulas regenerated with new config
│
        ▼
UI Updates
├── All input fields update
├── Results panels refresh
├── Grade badge recalculates
└── URL hash updates for sharing
```

### Example 3: Upgrade Simulation

```
User clicks "Voltage Upgrade"
        │
        ▼
UpgradeSimulator.svelte
├── Calls simulateUpgrade('voltage')
│
        ▼
simulateUpgrade() action
├── Calls simulateUpgradePhysics(config, 'voltage')
│   ├── Creates new config with +12V
│   ├── Updates related parameters
│   └── Returns simulatedConfig
├── Sets calculatorState.simulatedConfig
├── Sets calculatorState.activeUpgrade = 'voltage'
│
        ▼
Reactive Update
├── simStats getter computes new stats
├── upgradeDelta calculates differences
│
        ▼
UI Updates
├── ComparisonDeltaCards show before/after
├── ComparisonSummary displays deltas
├── ComparisonDisplay shows detailed diff
└── UpgradeGuidance highlights this upgrade
```

---

## Physics Engine Data Flow

### Calculation Pipeline

```
Input: ScooterConfig + PredictionMode
              │
              ▼
    ┌─────────────────────┐
    │   calculatePerformance  │
    │   (physics/calculator)  │
    └─────────────────────┘
              │
      ┌───────┴───────┐
      ▼               ▼
┌────────────┐  ┌────────────┐
│   Cache    │  │ Calculate  │
│   Check    │  │   Fresh    │
└─────┬──────┘  └─────┬──────┘
      │               │
  Cache Hit        Cache Miss
      │               │
      ▼               ▼
  Return          Perform
  Cached          Calculations
  Result              │
                  Store in
                  Cache
                      │
                      ▼
                  Return Result
```

### Physics Calculations

```typescript
// Energy calculation
wh = config.v × config.ah

// Speed calculation
speed = calculateTopSpeed(config)
  ├── baseSpeed = config.v × motorKv × wheelFactor
  ├── efficiency = calculateEfficiency(config)
  └── return baseSpeed × efficiency

// Range calculation
range = config.wh / consumption
  ├── consumption = config.style × efficiencyFactor
  └── efficiencyFactor = mode === 'realworld' ? 0.85 : 1.0

// Hill climb
hillSpeed = calculateHillClimb(config)
  ├── gradient = config.slope
  ├── powerRequired = gradient × weight × drag
  └── return min(speed, powerAvailable / powerRequired)
```

---

## Component Data Binding

### Reactive Bindings

```svelte
<!-- BasicConfig.svelte -->
<script>
  import { calculatorState, updateConfig } from '$lib/stores/calculator.svelte';
  
  // Reactive derived values
  const stats = $derived(calculatorState.stats);
  const bottlenecks = $derived(calculatorState.bottlenecks);
  
  // Event handler
  function handleInput(key: string, value: number) {
    updateConfig(key as ConfigNumericKey, value);
  }
</script>

<!-- Bindings update automatically when state changes -->
<FormField 
  label="Voltage" 
  value={calculatorState.config.v}
  on:input={(e) => handleInput('v', e.detail)}
/>
```

### Store Subscriptions

```typescript
// UI state subscription
uiState = $state({
  activeTab: 'configuration',
  showAdvanced: false,
  isCompareMode: false,
});

// Actions update UI state
setActiveTab('upgrades');     // Changes activeTab
toggleAdvanced(true);          // Toggles showAdvanced
toggleCompareMode(true);       // Toggles isCompareMode
```

---

## Caching Strategy

### Calculation Cache

```typescript
// physics/cache.ts
const calculationCache = new LRUCache<string, PerformanceStats>({
  maxSize: 200
});

// Cache key generation
function generateCacheKey(config: ScooterConfig, mode: PredictionMode): string {
  return `${JSON.stringify(config)}:${mode}`;
}
```

### Cache Flow

```
calculatePerformance(config, mode)
        │
        ▼
Generate cache key
        │
        ▼
┌───────────────┐
│ Check Cache   │
└───────┬───────┘
        │
   ┌────┴────┐
   │         │
  Hit      Miss
   │         │
   ▼         ▼
Return    Calculate
Cached    Fresh
Result    Result
            │
            ▼
        Store in
          Cache
```

---

## Formula Trace Generation

### Flow

```
State Update
      │
      ▼
regenerateFormulas()
      │
      ▼
generateFormulaTraces(config, stats)
      │
      ▼
Create trace for each calculation:
├── Total Energy
├── Top Speed
├── Range
├── Hill Speed
├── Charge Time
└── Cost per 100km
      │
      ▼
Apply LRU cap (50 entries)
      │
      ▼
Store in calculatorState.formulas
      │
      ▼
Available for FormulaDetailsPanel
```

---

## Import/Export Flow

### URL Sharing

```
User clicks "Share"
        │
        ▼
createShareLink(config)
├── encodeConfig(config)
│   ├── Extract shareable keys
│   ├── Convert to array
│   ├── JSON stringify
│   └── Base64 encode
├── Build URL with ?cfg= parameter
└── Copy to clipboard
        │
        ▼
User shares URL
        │
        ▼
loadConfigFromUrl()
├── Parse URL params
├── decodeConfig(encoded)
│   ├── Base64 decode
│   ├── JSON parse
│   └── Reconstruct config
├── applyConfig(decodedConfig)
└── Return success/failure
```

---

## Error Handling Flow

```
Input Error
      │
      ▼
Validation
      │
┌─────┴─────┐
│           │
Valid    Invalid
  │         │
  ▼         ▼
Update   Show
State    Error
         Toast
```

---

## Performance Optimization

### Optimization Strategies

1. **Calculation Caching**: Physics results cached with composite key
2. **Lazy Formula Generation**: Formula traces computed on-demand
3. **Component Lazy Loading**: Tabs render conditionally
4. **LRU Eviction**: Prevents unbounded memory growth
5. **Memoized Derived Values**: `$derived` caches computations

### Before Optimization

```
User Input
    │
    ▼
Recalculate Everything
    │
    ▼
Update All Components
```

### After Optimization

```
User Input
    │
    ▼
Check Cache First
    │
┌───┴───┐
│       │
Hit   Miss
│       │
▼       ▼
Fast  Calculate
Return  & Cache
    │
    ▼
Update Changed
Components Only
```

---

## Data Validation

### Validation Pipeline

```
Raw Input
    │
    ▼
normalizeConfigValue()
├── Check type
├── Check bounds
├── Clamp values
└── Return normalized
    │
    ▼
Update State
    │
    ▼
Recalculate
```

### Validation Rules

```typescript
// validators.ts
const validationRules = {
  v: { min: 24, max: 96, required: true },        // Voltage
  ah: { min: 5, max: 100, required: true },       // Capacity
  motors: { min: 1, max: 4, required: true },     // Motor count
  watts: { min: 250, max: 10000, required: true },// Power
  weight: { min: 50, max: 150, required: true },  // Rider weight
  // ... etc
};
```

---

## Event Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│                         EVENT FLOW                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   USER          COMPONENT         ACTION          STORE     │
│    │               │                │               │       │
│    │──Click───────▶│                │               │       │
│    │               │──Event────────▶│               │       │
│    │               │                │──Validate────▶│       │
│    │               │                │               │       │
│    │               │                │◀──Update──────│       │
│    │               │◀──Callback────│               │       │
│    │               │                │               │       │
│    │               │──Subscribe────▶│               │       │
│    │               │◀──State Change─│               │       │
│    │               │                │               │       │
│    │◀──Re-render──│                │               │       │
│    │               │                │               │       │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Files

| File | Responsibility |
|------|----------------|
| `stores/calculator.svelte.ts` | Main state container |
| `stores/ui.svelte.ts` | UI state management |
| `physics/calculator.ts` | Core calculations |
| `physics/cache.ts` | Result caching |
| `utils/validators.ts` | Input validation |
| `utils/formatters.ts` | Display formatting |

---

## Debugging Data Flow

### Tools

1. **Svelte DevTools**: Inspect reactive state
2. **Console Logging**: Add debug logs in actions
3. **Performance Profiler**: Track calculation times
4. **Cache Monitor**: Log cache hits/misses

### Debug Pattern

```typescript
// Add to actions for debugging
export function updateConfig(key: ConfigKey, value: number) {
  console.log('[updateConfig]', key, '→', value);
  const normalized = normalizeConfigValue(key, value, calculatorState.config[key]);
  console.log('[updateConfig] normalized:', normalized);
  calculatorState.config[key] = normalized;
  console.log('[updateConfig] state updated');
}
```
