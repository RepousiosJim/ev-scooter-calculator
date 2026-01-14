# EV Scooter Pro Calculator v1.3.1

A professional electric scooter performance analysis, hardware compatibility, and upgrade simulation tool. Built with SvelteKit, TypeScript, and Tailwind CSS.

![Version](https://img.shields.io/badge/version-1.3.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### 📊 Performance Analysis
- Real-time calculation of energy, range, top speed, and acceleration
- Physics-based calculations including aerodynamic drag and hill climb capability
- Battery health impact analysis
- Charge time and running cost estimates

### 🧠 Intelligent Diagnostics
- **Bottleneck Detection**: Auto-identify limiting components
  - High battery C-rate warnings
  - Controller amp limit detection
  - Gear ratio limitations
  - Hill climb performance issues
- **Dynamic Upgrade Suggestions**: Critical upgrades highlighted with visual indicators
- **Component Status Visualization**: Battery, Controller, and Motor health indicators with progress bars

### 🔄 Upgrade Simulator
- **Scooter Presets**: Quick-start with 8 popular models (M365, ES2, Wolf, OX, Dualtron, Burn-E, Emove)
- Simulate battery, voltage, and controller upgrades
- Persistent comparison mode (Current vs Simulated side-by-side)
- Real-time performance projections

### ✨ UX Enhancements (v1.3)
- **Smart Reactive State**: Real-time updates using Svelte 5 runes ($state, $derived)
- **Interactive Components**: Modular, reusable component architecture
- **TypeScript Safety**: Full type coverage for calculations and state
- **PWA Support**: Offline capability with auto-update
- **Modern Design**: Tailwind CSS with responsive layouts

### 📈 Visualizations
- Power vs Speed curve graph with equilibrium point marker
- Bar charts for speed efficiency, acceleration, range potential, and running costs
- Color-coded metrics with animated progress bars

### 💾 Data Management
- Save and load scooter configurations
- Compare current setup with saved profiles
- LocalStorage persistence with type safety

### 🖨️ Print-Ready
- Clean print stylesheet for exporting build sheets
- Mobile-responsive design

## Tech Stack

- **Framework**: SvelteKit 2.x
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS v4
- **State Management**: Svelte runes ($state, $derived)
- **Testing**: Playwright (E2E) + Vitest (Unit)
- **PWA**: Vite PWA Plugin
- **Build Tool**: Vite 7.x

## Quick Start

### Development
```bash
# Clone repository
git clone <repository-url>
cd ev-scooter-calc-v2

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit http://localhost:5173

### Production Build
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing
```bash
# Run unit tests
npm run test:unit

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test

# Run E2E tests in UI mode
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug
```

### Type Checking
```bash
# Run Svelte type checker
npm run check

# Run type checker in watch mode
npm run check:watch
```

## Usage

### 1. Configure Your Scooter
- Select a preset from "Quick Start" or enter manual values
- Enter battery voltage and capacity
- Set motor count and power per motor
- Add controller amp limit (optional)
- Choose riding style (consumption rate)

### 2. Advanced Settings
- Rider weight and wheel size
- Motor RPM for precise speed calculation
- Charger amperage
- Regen efficiency
- Electricity cost
- **Max Slope (%)** - Calculate hill climb capability
- **Riding Position** - Affects drag and top speed
- **Battery Health (%)** - Simulate battery degradation

### 3. View Results
- Real-time performance metrics
- Power vs Speed graph
- Bottleneck warnings
- Critical upgrade suggestions
- Component status indicators

### 4. Compare Upgrades
- Click "Enable Upgrade Simulator"
- Select an upgrade to simulate
- View side-by-side comparison

### 5. Save Profiles
- Click "Save Setup" to store your configuration
- Load saved profiles for comparison

## Physics Formulas

### Aerodynamic Drag
```
P_drag = 0.5 * ρ * v³ * CdA
```
Where:
- ρ = Air density (1.225 kg/m³)
- v = Velocity (m/s)
- CdA = Drag coefficient × frontal area (0.6 upright, 0.4 tuck)

### Gravity Power (Hill Climb)
```
P_gravity = m * g * sin(θ) * v
```
Where:
- m = Total mass (scooter + rider)
- g = Gravitational acceleration (9.81 m/s²)
- θ = Slope angle (arctan(slope%/100))
- v = Velocity (m/s)

### Battery Discharge Rate
```
C-rate = Peak Amps / Battery Ah
```

## Project Structure

```
ev-scooter-calc-v2/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── calculator/      # Calculator-specific components
│   │   │   └── ui/              # Reusable UI components
│   │   ├── stores/            # State management
│   │   ├── utils/              # Physics, validators, formatters
│   │   ├── data/               # Presets data
│   │   └── types.ts            # TypeScript interfaces
│   ├── routes/
│   │   └── +page.svelte       # Main calculator page
│   └── app.css                # Global styles (Tailwind)
├── tests/
│   ├── e2e/                  # End-to-end tests
│   └── unit/                 # Unit tests
├── static/                     # Static assets
├── tailwind.config.js          # Tailwind configuration
├── vite.config.ts             # Vite + PWA config
└── package.json                # Dependencies and scripts
```

## Deployment

The `build` folder contains a static site ready for deployment to any static hosting service:

### Vercel (Recommended)
```bash
npm run build
vercel deploy
```


### GitHub Pages
```bash
npm run build
# Enable GitHub Pages in repository settings
```

### Other Static Hosts
- Cloudflare Pages
- Firebase Hosting
- AWS S3 + CloudFront

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- All modern mobile browsers

## Performance

- **Bundle Size**: ~12KB (gzipped)
- **Lighthouse Score**: 90+
- **First Contentful Paint**: <1s
- **Time to Interactive**: <2s

## PWA Features

- Offline capability (Service Worker)
- Installable on home screen
- Auto-update support
- App-like experience

## Development

### Adding New Features

1. **Input Fields**: Add to BasicConfig.svelte or AdvancedConfig.svelte
2. **Calculations**: Modify `calculate()` function in physics.ts
3. **UI Updates**: Add display element to ResultDisplay.svelte
4. **State Management**: Update calculator.svelte.ts store
5. **Validation**: Add rules to validators.ts

### Code Style

- TypeScript strict mode enabled
- Svelte 5 runes ($state, $derived)
- Tailwind CSS utility classes
- No external CSS frameworks
- Minimal comments

## Version History

### v1.3.1 (Current)
- ✅ Documentation refresh

### v1.3.0
- ✅ Migrated to SvelteKit + TypeScript
- ✅ Added Tailwind CSS styling
- ✅ Implemented PWA support
- ✅ Added Playwright E2E tests
- ✅ Added Vitest unit tests
- ✅ Component-based architecture
- ✅ Reactive state with Svelte runes
- ✅ Full TypeScript coverage

### v1.2.0 (Vanilla JS)
- Scooter Presets
- Component Status Indicators
- Dual Input (Slider + Number)
- Smart Number Animation
- Enhanced Graph
- Advanced Tooltips
- Improved Upgrade Simulator

### v1.1.0
- Physics-based drag calculations
- Hill climb capability
- Bottleneck detection
- Persistent upgrade simulator
- Power vs Speed curve graph
- Battery health slider
- Print-ready styling

### v1.0.0
- Basic performance calculations
- Profile save/load system
- Modal-based comparison

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Disclaimer

This calculator is for educational and estimation purposes only. Real-world performance may vary based on factors not included in this tool (temperature, road conditions, battery quality, etc.). Always follow manufacturer specifications and safety guidelines.

## Credits

Created for the EV scooter enthusiast community.
