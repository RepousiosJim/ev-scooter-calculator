# Component Catalog

Complete catalog of all UI components in the EV Scooter Calculator.

## Component Hierarchy

```
Page (+page.svelte)
├── Hero
├── Tabs (Navigation)
│
├── Configuration Tab
│   ├── PresetSelector
│   ├── RideModeSelector
│   ├── BasicConfig
│   │   └── FormField + Input/Select
│   ├── PerformanceSummary
│   │   ├── StatCard
│   │   └── PerformanceGrade
│   ├── EfficiencyPanel
│   ├── ComponentHealthPanel
│   └── PowerGraph
│
├── Advanced Tab
│   ├── BasicConfig
│   ├── AdvancedConfig
│   └── PowerGraph
│
├── Upgrades Tab
│   ├── UpgradeSimulator
│   │   └── UpgradeCard[]
│   ├── ComparisonDeltaCard[]
│   ├── ComparisonDisplay
│   └── UpgradeGuidance
│       └── RecommendationCard[]
│
└── Compare Tab
    └── ScooterComparisonTable
```

---

## Atomic Design Structure

### Atoms (Basic Components)

Located in `src/lib/components/ui/atoms/`

| Component | File | Props | Description |
|-----------|------|-------|-------------|
| **Button** | `Button.svelte` | `variant`, `size`, `disabled`, `type` | Primary action button with variants |
| **Input** | `Input.svelte` | `value`, `placeholder`, `type`, `disabled` | Text/number input field |
| **Slider** | `Slider.svelte` | `value`, `min`, `max`, `step` | Range slider input |
| **Select** | `Select.svelte` | `value`, `options`, `placeholder` | Dropdown select |
| **Toggle** | `Toggle.svelte` | `checked`, `disabled` | Toggle switch |
| **Badge** | `Badge.svelte` | `variant`, `size` | Status badge |
| **Icon** | `Icon.svelte` | `name`, `size`, `class` | SVG icon component |
| **Tooltip** | `Tooltip.svelte` | `content`, `position` | Hover tooltip |
| **HelpTooltip** | `HelpTooltip.svelte` | `content` | Contextual help icon |
| **ValidationError** | `ValidationError.svelte` | `message` | Error message display |

**Example Usage:**
```svelte
<script>
  import { Button, Input, Icon } from '$lib/components/ui/atoms';
</script>

<Button variant="primary" size="md">
  <Icon name="save" size="sm" />
  Save
</Button>

<Input type="number" placeholder="Enter voltage" />
```

---

### Molecules (Composite Components)

Located in `src/lib/components/ui/molecules/`

| Component | File | Props | Description |
|-----------|------|-------|-------------|
| **FormField** | `FormField.svelte` | `label`, `value`, `error`, `required` | Label + input with validation |
| **ProgressBar** | `ProgressBar.svelte` | `value`, `max`, `color` | Progress indicator |

**Example Usage:**
```svelte
<script>
  import { FormField, ProgressBar } from '$lib/components/ui/molecules';
</script>

<FormField label="Battery Voltage" required>
  <Input type="number" bind:value={voltage} />
</FormField>

<ProgressBar value={75} max={100} color="primary" />
```

---

### Organisms (Feature Components)

Located in `src/lib/components/ui/organisms/`

| Component | File | Props | Description |
|-----------|------|-------|-------------|
| **ConfigPanel** | `ConfigPanel.svelte` | `config`, `onChange` | Configuration form container |
| **Dashboard** | `Dashboard.svelte` | `stats` | Results dashboard |
| **MobileNavigation** | `MobileNavigation.svelte` | `activeTab`, `onTabChange` | Mobile bottom navigation |
| **ResultsPanel** | `ResultsPanel.svelte` | `stats`, `bottlenecks` | Results display panel |

---

### UI Components (Shared)

Located in `src/lib/components/ui/`

| Component | File | Props | Description |
|-----------|------|-------|-------------|
| **Card** | `Card.svelte` | `title`, `class` | Container card |
| **Tabs** | `Tabs.svelte` | `tabs`, `activeTab`, `onChange` | Tab navigation |
| **BottomSheet** | `BottomSheet.svelte` | `isOpen`, `title`, `onClose` | Mobile bottom sheet |
| **Hero** | `Hero.svelte` | - | Page header section |
| **Toast** | `Toast.svelte` | `message`, `type` | Notification toast |
| **LoadingSkeleton** | `LoadingSkeleton.svelte` | `lines` | Loading placeholder |
| **TourModal** | `TourModal.svelte` | `steps`, `isOpen` | Onboarding tour |
| **ShareButton** | `ShareButton.svelte` | `config` | Share configuration |
| **SectionDivider** | `SectionDivider.svelte` | `icon`, `label` | Section separator |
| **ComparisonDeltaCard** | `ComparisonDeltaCard.svelte` | `before`, `after`, `label` | Delta comparison |
| **VisualCRateIndicator** | `VisualCRateIndicator.svelte` | `value` | C-rate visualization |
| **PerformanceGradeBadge** | `PerformanceGradeBadge.svelte` | `grade` | Grade display |

---

## Calculator Components (Feature-Specific)

Located in `src/lib/components/calculator/`

### Configuration Components

| Component | File | Dependencies | Description |
|-----------|------|--------------|-------------|
| **BasicConfig** | `BasicConfig.svelte` | `calculatorState`, `updateConfig` | Basic configuration form |
| **AdvancedConfig** | `AdvancedConfig.svelte` | `calculatorState` | Advanced parameters |
| **PresetSelector** | `PresetSelector.svelte` | `presets`, `loadPreset` | Preset dropdown |
| **RideModeSelector** | `RideModeSelector.svelte` | `rideModePresets`, `applyRideMode` | Ride mode tabs |

### Results Components

| Component | File | Dependencies | Description |
|-----------|------|--------------|-------------|
| **PerformanceSummary** | `PerformanceSummary.svelte` | `calculatorState.stats` | Key metrics summary |
| **EfficiencyPanel** | `EfficiencyPanel.svelte` | `stats`, `config` | Efficiency metrics |
| **ComponentHealthPanel** | `ComponentHealthPanel.svelte` | `stats`, `config` | Health indicators |
| **BottleneckPanel** | `BottleneckPanel.svelte` | `bottlenecks` | Performance limits |
| **PowerGraph** | `PowerGraph.svelte` | `stats` | Power curve chart |
| **ResultDisplay** | `ResultDisplay.svelte` | `stats` | Legacy results view |

### Upgrade Components

| Component | File | Dependencies | Description |
|-----------|------|--------------|-------------|
| **UpgradeSimulator** | `UpgradeSimulator.svelte` | `simulateUpgrade` | Upgrade selection UI |
| **UpgradeCard** | `UpgradeCard.svelte` | `upgrade`, `onSelect` | Individual upgrade option |
| **UpgradeGuidance** | `UpgradeGuidance.svelte` | `recommendations` | Recommendation list |
| **ComparisonDisplay** | `ComparisonDisplay.svelte` | `stats`, `simStats` | Before/after view |
| **ComparisonSummary** | `ComparisonSummary.svelte` | `upgradeDelta` | Delta summary |

### Comparison Components

| Component | File | Dependencies | Description |
|-----------|------|--------------|-------------|
| **ScooterComparisonTable** | `ScooterComparisonTable.svelte` | `presets`, `metadata` | Full comparison table |

### Formula Components

| Component | File | Dependencies | Description |
|-----------|------|--------------|-------------|
| **FormulaDetailsPanel** | `FormulaDetailsPanel.svelte` | `formulaTraces` | Formula breakdown |

---

## Component Dependencies

### Store Dependencies

Components depend on these stores:

```
calculatorState
├── config
├── stats ($derived)
├── bottlenecks ($derived)
├── recommendations ($derived)
├── simulatedConfig
└── activeUpgrade

uiState
├── activeTab
├── showAdvanced
└── isCompareMode
```

### Physics Dependencies

```
Components
├── calculatePerformance(config, mode) → stats
├── detectBottlenecks(stats, config) → bottlenecks[]
├── generateRecommendations(config, stats) → recommendations[]
└── simulateUpgrade(config, type) → newConfig
```

---

## Props Interface Reference

### Common Props Patterns

```typescript
// Config-related
interface ConfigProps {
  config: ScooterConfig;
  onChange?: (key: keyof ScooterConfig, value: number) => void;
}

// Stats-related
interface StatsProps {
  stats: PerformanceStats;
}

// Comparison-related
interface ComparisonProps {
  before: PerformanceStats;
  after: PerformanceStats;
  delta: UpgradeDelta;
}

// Event handlers
interface InputProps {
  value: number;
  oninput: (value: number) => void;
  onchange?: (value: number) => void;
}
```

---

## Component Best Practices

1. **Props Down, Events Up**: Pass data via props, emit changes via callbacks
2. **Store Access**: Access stores in parent components, pass data via props
3. **Derived Values**: Use `$derived` for computed values
4. **Reactive Statements**: Minimize reactive statements, prefer derived
5. **Cleanup**: Use `onDestroy` for cleanup, especially for subscriptions

---

## File Naming Conventions

- **Components**: PascalCase (e.g., `PerformanceSummary.svelte`)
- **Utilities**: camelCase (e.g., `formatters.ts`)
- **Constants**: UPPER_SNAKE_CASE within files
- **Types**: PascalCase with descriptive names

---

## Component Size Guidelines

- **Atoms**: < 100 lines
- **Molecules**: < 150 lines
- **Organisms**: < 250 lines
- **Page Components**: < 400 lines

If a component exceeds these limits, consider decomposition.

---

## Accessibility Requirements

All components must:

1. Include proper ARIA attributes
2. Support keyboard navigation
3. Maintain focus management
4. Provide sufficient color contrast
5. Include screen reader labels

Example:
```svelte
<button
  type="button"
  aria-label="Close dialog"
  aria-pressed={isOpen}
  on:click={toggle}
>
  <Icon name="close" aria-hidden="true" />
</button>
```
