# EV Scooter Pro Calculator - Project Documentation

## Project Status: ✅ Complete (v1.2)

This is a **static vanilla JavaScript project** - no build process, no dependencies, no frameworks.

- **Type:** Static web application
- **Technologies:** HTML5, CSS3, Vanilla JavaScript
- **Browser Execution:** Client-side only
- **Deployment:** Static hosting (GitHub Pages, Netlify, Vercel, or any web server)

## v1.1 Completed Features

### Phase 1: Core Physics & Accuracy ✅
- [x] Hill Climb Capability - Max speed on slopes (0-100% grade)
- [x] Aerodynamic Drag - Realistic top speed with air resistance
- [x] Riding Position Options - Upright (CdA=0.6) vs Sport Tuck (CdA=0.4)

### Phase 2: Intelligence & Diagnostics ✅
- [x] Bottleneck Detection - Auto-identify limiting components
- [x] Dynamic Upgrade Suggestions - Critical upgrades highlighted
- [x] Visual Warning System - Red glow indicators for priority upgrades

### Phase 3: UI/UX Enhancements ✅
- [x] Persistent Comparison Mode - Side-by-side Current vs Simulated
- [x] Power vs Speed Graph - Canvas-based visualization
- [x] Equilibrium Point Marker - Visual top speed indicator

### Phase 4: Polish & Safety ✅
- [x] Battery Health (SoH) - 50-100% degradation slider
- [x] Print-Ready Styling - Clean exports
- [x] Input Validation - Clamping for all numeric fields

## v1.2 Completed Features

### Phase 1: Interactive Controls ✅
- [x] Scooter Presets - 8 popular models (M365, ES2, Wolf, OX, Dualtron, Burn-E, Emove)
- [x] Preset Loading - Quick-start with smooth animations
- [x] Rider Weight Slider - Dual input with two-way binding

### Phase 2: Visual Feedback System ✅
- [x] Component Status Indicators - Battery, Controller, Motor with progress bars
- [x] Dynamic Coloring - Green/Orange/Red based on stress levels
- [x] Advanced Tooltips - Contextual help for complex options

### Phase 3: Layout & Animations ✅
- [x] Enhanced Upgrade Simulator - Clear button, placeholder, active state highlighting
- [x] Smart Number Animation - Animate only on preset/upgrade, instant on manual input
- [x] Improved Graph - Gradient fill, pulsing equilibrium point, hover tooltips

### File Structure Changes (v1.2)

```
index.html (1,992 lines, +580 from v1.1)
├── Preset Section (new)
├── Component Status Section (new)
├── Rider Weight Slider (modified)
├── Help Icons (added to labels)
├── Upgrade Simulator Enhancements (modified)
├── Canvas Graph Improvements (modified)
└── JavaScript
    ├── scooterPresets object (new)
    ├── loadPreset() (new)
    ├── updateComponentStatus() (new)
    ├── animateValue() (new)
    ├── animateValues() (new)
    ├── animateColumn() (new)
    ├── clearSimulation() (new)
    ├── simUpgrade() (modified)
    ├── calculate() (modified - source parameter)
    ├── updateUI() (modified - smart animation)
    └── drawGraph() (modified - gradient, pulse, tooltips)

CSS (≈100 new lines)
├── .preset-section
├── .dual-input
├── .component-status
├── .component-card
├── .help-icon
├── .sim-placeholder
├── .clear-btn
├── .upgrade-card.active
├── @keyframes pulse
└── Canvas tooltips styles
```
- [x] Print-Ready Styling - Clean exports
- [x] Input Validation - Clamping for all numeric fields

## Project Architecture

### Single File Structure
All code is contained in `index.html` for maximum portability:

```
index.html (1,412 lines)
├── HTML (≈250 lines)
│   ├── Configuration Form
│   ├── Results Display
│   ├── Upgrades Section
│   └── Comparison Modal
├── CSS (≈350 lines)
│   ├── Variables & Theming
│   ├── Responsive Layout
│   ├── Component Styles
│   ├── Canvas Graph Styles
│   └── Print Media Queries
└── JavaScript (≈800 lines)
    ├── State Management
    ├── Physics Engine (calculate, detectBottlenecks)
    ├── UI Updates (updateUI, drawGraph)
    ├── Upgrade Simulation (simUpgrade, toggleCompareMode)
    ├── Data Persistence (saveProfile, loadProfile)
    └── Initialization (Event Listeners)
```

### Core Functions

#### Physics Engine
```javascript
calculate(stateOverride, targetElement)
- Main calculation entry point
- Applies battery health (EffectiveAh = Ah * SoH)
- Calculates drag-limited top speed
- Calculates hill climb speed based on slope
- Returns stats object or updates DOM directly
```

#### Diagnostics
```javascript
detectBottlenecks(stats)
- Analyzes C-rate, controller limits, gear ratios
- Returns array of bottleneck objects
- Triggers critical upgrade highlighting
```

#### Visualization
```javascript
drawGraph(data)
- Renders Power vs Speed curve on HTML5 Canvas
- Shows available power line vs required power curve
- Marks equilibrium point (top speed)
- Responsive sizing with 2x scaling for retina displays
```

#### Simulation
```javascript
simUpgrade(type)
- Simulates parallel, voltage, or controller upgrades
- Stores state for persistent comparison
- Updates dual-column view when enabled
```

## Data Flow

```
User Input (DOM)
    ↓
getState() - Read all inputs
    ↓
calculate() - Physics calculations
    ↓
┌─────────────────┬─────────────────┐
│   updateUI()    │ detectBottlenecks() │
│   Update stats  │ Analyze system  │
└─────────────────┴─────────────────┘
         ↓                 ↓
    ┌────────────────────────────┐
    │   Render to DOM           │
    │   - Stats Grid          │
    │   - Bar Charts          │
    │   - Power Graph         │
    │   - Upgrade Cards       │
    │   - Analysis Text       │
    └────────────────────────────┘
```

## Development Guidelines

### Adding New Features

1. **Input Fields** - Add to form in HTML, update `inputMap` object
2. **Calculations** - Modify `calculate()` function physics logic
3. **UI Updates** - Add display element to stats grid, update `updateUI()`
4. **State Management** - Ensure `getState()` and `setState()` handle new field
5. **Validation** - Add clamping in `window.addEventListener('load')`

### Modifying Physics

- All physics formulas in `calculate()` function
- Drag formula: `0.5 * ρ * v³ * CdA`
- Gravity power: `m * g * sin(θ) * v`
- Keep units consistent (meters, seconds, watts)

### Styling

- CSS variables in `:root` for theming
- Media queries for responsive design
- Print styles in `@media print` block
- No external CSS frameworks

### Canvas Graph

- Canvas ID: `powerGraph`
- Context: 2D with 2x scaling for sharpness
- Called from `updateUI()` after data calculation
- Responsive on window resize event

## Browser Compatibility

- **Required:** ES6+ support
- **Tested:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **APIs Used:**
  - localStorage (for profiles)
  - Canvas 2D (for graphs)
  - Modern DOM APIs (querySelector, classList)

## Deployment

### Static Hosting Options

Any static file hosting works:

1. **GitHub Pages** (Free)
   ```bash
   # Already configured: https://repousiosjim.github.io/ev-scooter-calculator/
   ```

2. **Netlify** (Drag & Drop)
   ```bash
   # Drag index.html to Netlify dashboard
   ```

3. **Vercel** (CLI)
   ```bash
   vercel deploy
   ```

4. **Local Server**
   ```bash
   python -m http.server 8000
   # or
   npx serve
   ```

## Future Enhancement Ideas

### v1.2 (Potential)
- [ ] Multiple battery configurations (series/parallel)
- [ ] Regenerative braking energy recovery visualization
- [ ] Export data to CSV/PDF
- [ ] Metric/Imperial unit toggle
- [ ] Temperature impact on battery performance
- [ ] Acceleration curves (0-60km/h time)

### v2.0 (Concept)
- [ ] PWA with offline support
- [ ] Database for shared community builds
- [ ] Advanced motor controller simulation
- [ ] Real-world crowd-sourced data comparison
- [ ] 3D scooter model visualization

## Known Limitations

1. **Approximate Physics** - Uses simplified drag coefficients and constant rolling resistance
2. **Battery Model** - Linear degradation model, doesn't account for temperature or age effects
3. **Motor Behavior** - Assumes linear power curve, real motors vary by RPM/load
4. **No Terrain** - Flat surface calculations except for specified slope
5. **Controller Limits** - Basic amp limit, doesn't simulate phase current or FOC

## Maintenance

### Backup
- v1.0 saved as `index_v1.0_backup.html`
- Always backup before major changes

### Testing
- Test on multiple browsers
- Test print preview (Ctrl+P)
- Test mobile responsiveness
- Test edge cases (zero inputs, max values)

### Code Style
- Vanilla JS only
- No external libraries
- Single file architecture
- Clear function naming
- Minimal comments (per project style)

## Quick Reference

### Input Field IDs
- `voltage`, `capacity`, `motorCount`, `motorWatt`
- `controllerLimit`, `rideStyle`
- `riderWeight`, `wheelSize`, `motorRpm`
- `chargerAmps`, `regenEff`, `elecCost`
- `slope` (v1.1), `ridePosition` (v1.1), `soh` (v1.1)

### Display Element IDs
- `dispWh`, `dispRange`, `dispSpeed`, `dispHillSpeed` (v1.1)
- `dispPower`, `dispCharge`, `dispCost`
- `barSpeed`, `barAccel`, `barRange`, `barCost`
- `powerGraph` (v1.1)
- `hardwareAnalysis`

### Key Constants
- Air density: 1.225 kg/m³
- Gravity: 9.81 m/s²
- Rolling resistance: 15W
- CdA (Upright): 0.6
- CdA (Sport): 0.4

---

**Last Updated:** January 2026
**Version:** 1.1.0
**Status:** Production Ready ✅
