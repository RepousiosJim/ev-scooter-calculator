# EV Scooter Pro Calculator

A professional electric scooter performance analysis, hardware compatibility, and upgrade simulation tool. Built with vanilla JavaScript, HTML, and CSS - no external dependencies required.

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### 📊 Performance Analysis
- Real-time calculation of energy, range, top speed, and acceleration
- Physics-based calculations including aerodynamic drag and hill climb capability
- Battery health impact analysis
- Charge time and running cost estimates

### ⚡ Physics Engine (v1.1)
- **Aerodynamic Drag**: Realistic top speed limited by air resistance (Upright/Sport Tuck positions)
- **Hill Climb**: Calculate maximum speed on slopes (0-100% grade)
- **Gravity Power**: Physics-based formulas for climbing performance

### 🧠 Intelligent Diagnostics
- **Bottleneck Detection**: Automatically identifies limiting factors
  - High battery C-rate warnings
  - Controller amp limit detection
  - Gear ratio limitations
  - Hill climb performance issues
- **Dynamic Upgrade Suggestions**: Critical upgrades highlighted with visual indicators

### 🔄 Upgrade Simulator
- Simulate battery, voltage, and controller upgrades
- Persistent comparison mode (Current vs Simulated side-by-side)
- Real-time performance projections

### 📈 Visualizations
- Power vs Speed curve graph with equilibrium point marker
- Bar charts for speed efficiency, acceleration, range potential, and running costs
- Color-coded metrics

### 💾 Data Management
- Save and load scooter configurations
- Compare current setup with saved profiles
- LocalStorage persistence

### 🖨️ Print-Ready
- Clean print stylesheet for exporting build sheets
- Mobile-responsive design

## Quick Start

Simply open `index.html` in any modern web browser. No installation or build process required.

```bash
# Clone the repository
git clone https://github.com/yourusername/ev-scooter-calculator.git

# Open in browser
open ev-scooter-calculator/index.html
```

## Usage

1. **Configure Your Scooter**
   - Enter battery voltage and capacity
   - Set motor count and power per motor
   - Add controller amp limit (optional)
   - Choose riding style (consumption rate)

2. **Advanced Settings**
   - Rider weight and wheel size
   - Motor RPM for precise speed calculation
   - Charger amperage
   - Regen efficiency
   - Electricity cost
   - **Max Slope (%)** - Calculate hill climb capability
   - **Riding Position** - Affects drag and top speed
   - **Battery Health (%)** - Simulate battery degradation

3. **View Results**
   - Real-time performance metrics
   - Power vs Speed graph
   - Bottleneck warnings
   - Critical upgrade suggestions

4. **Compare Upgrades**
   - Click "Enable Upgrade Simulator"
   - Select an upgrade to simulate
   - View side-by-side comparison

5. **Save Profiles**
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

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- All modern mobile browsers

## File Structure

```
ev-scooter-calculator/
├── index.html                 # Main application (v1.1)
├── index_v1.0_backup.html    # v1.0 backup
├── plan.md                   # Development plan
├── README.md                  # This file
├── LICENSE                    # MIT License
└── .gitignore                 # Git ignore rules
```

## Development

The calculator uses vanilla JavaScript with no dependencies. All code is contained in `index.html`.

### Key Functions
- `calculate()` - Main physics engine
- `detectBottlenecks()` - Intelligent diagnostics
- `drawGraph()` - Canvas-based power curve rendering
- `simUpgrade()` - Upgrade simulation
- `saveProfile()` / `loadProfile()` - Data persistence

## Version History

### v1.1.0 (Current)
- ✅ Added physics-based drag calculations
- ✅ Added hill climb capability
- ✅ Implemented bottleneck detection
- ✅ Added persistent upgrade simulator
- ✅ Added power vs Speed curve graph
- ✅ Added battery health slider
- ✅ Added print-ready styling
- ✅ Input validation and clamping

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
