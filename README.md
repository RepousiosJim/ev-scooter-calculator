# EV Scooter Pro Calculator

A physics-based performance calculator for electric scooters. Get real-time estimates for range, top speed, and acceleration — then simulate upgrades before you buy.

![Version](https://img.shields.io/badge/version-1.4.0-blue)
![Status](https://img.shields.io/badge/status-early%20access-orange)
![License](https://img.shields.io/badge/license-MIT-green)
![Coverage](https://img.shields.io/badge/coverage-70%25+-brightgreen)

> **Early Access** — This app is under active development. Features may change, and some values are estimates based on physics modeling rather than manufacturer claims. Feedback is welcome via [Issues](../../issues).

## What It Does

**Performance Calculator** — Enter your scooter's voltage, battery capacity, motor wattage, and rider weight to get estimated range, top speed, hill climb ability, and acceleration. Toggle between manufacturer-spec and real-world prediction modes for optimistic vs. realistic numbers.

**Upgrade Simulator** — Compare your current setup against common upgrades (parallel battery, higher voltage, controller swap, motor upgrade, tire change) with side-by-side deltas showing exactly what changes and by how much.

**Bottleneck Detection** — The calculator flags limiting components in your build. If your controller caps motor output or your battery C-rate is a weak point, you'll see it called out with specific upgrade suggestions.

**Scooter Rankings** — Browse 30+ scooters ranked by calculated performance across tiers (S through D). Search, filter, and compare models from budget commuters to flagship dual-motors.

**Ride Modes** — Switch between Eco, Normal, Sport, and Turbo profiles to see how riding style affects range and performance.

**Preset Library** — Start from a known scooter model instead of entering specs manually. Presets cover popular models from Xiaomi, Segway, VSETT, Dualtron, Kaabo, Wolf, and more.

## Advanced Configuration

For power users, the Deep Dive panel exposes:

- Motor KV rating and drivetrain efficiency
- Battery sag percentage and state of health
- Slope grade and ride position (standing/seated)
- Ambient temperature effects on battery performance
- Regenerative braking energy recovery

## How Calculations Work

The calculator uses a physics model that accounts for aerodynamic drag, rolling resistance, gravitational forces on inclines, motor efficiency curves, and battery discharge characteristics. Results are estimates — real-world performance varies with terrain, wind, tire pressure, and rider behavior.

Two prediction modes are available:

- **Spec Mode** — Uses manufacturer-rated efficiency. Good for comparing scooters on paper.
- **Real-World Mode** — Applies derating factors for battery sag, temperature, and typical riding patterns. Closer to what you'll actually experience.

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge). Installable as a PWA on mobile and desktop for offline use.

## Contributing

Contributions are welcome! Fork the repo and get running locally:

```bash
npm install
npm run dev
```

Then visit `http://localhost:5173`.

Useful commands:

```bash
npm run check    # type check
npm run test     # unit + e2e tests
npm run build    # production build
```

For more details, see:

- **[Contributing Guide](CONTRIBUTING.md)** — Development workflow and code standards
- **[Configuration Guide](CONFIGURATION.md)** — Advanced settings and customization
- **[Testing Guide](TESTING.md)** — Test coverage and writing tests
- **[Deployment Guide](DEPLOYMENT.md)** — Production setup and environment variables

If you find a bug or have a feature request, please [open an issue](../../issues).

## License

MIT License — see [LICENSE](LICENSE).
