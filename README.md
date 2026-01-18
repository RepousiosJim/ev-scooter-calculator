# EV Scooter Pro Calculator

A sleek, physics-based EV scooter calculator for performance insight, upgrade planning, and quick comparisons.

Use it to sanity-check range and speed, then validate upgrades before spending on hardware.

![Version](https://img.shields.io/badge/version-1.3.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Highlights

- Range, speed, and acceleration in real time
- Drag, hill climb, and efficiency modeling
- Upgrade simulator with side-by-side deltas
- Bottleneck alerts for battery, controller, and gearing
- Preset library spanning entry to flagship scooters
- PWA-ready, responsive UI built with SvelteKit

## Documentation

- **[Contributing Guide](CONTRIBUTING.md)** - Development workflow and code standards
- **[Deployment Guide](DEPLOYMENT.md)** - Production setup and environment variables
- **[Configuration Guide](CONFIGURATION.md)** - Advanced settings and customization
- **[Testing Guide](TESTING.md)** - Test coverage and writing tests

## Quick Start

```bash
npm install
npm run dev
```

Visit http://localhost:5173

## Usage

- Pick a preset or enter your scooter specs
- Adjust advanced inputs like weight, wheel size, and riding style
- Review performance metrics and bottleneck warnings
- Toggle the upgrade simulator to compare changes
- Save configurations for quick reloads

## Scripts

```bash
npm run build   # production build
npm run preview # preview build
npm run check   # type check
npm run test    # all tests
```

## Tech Stack

- SvelteKit 2.x + Svelte 5 runes
- TypeScript (strict)
- Tailwind CSS v4
- Vite 7.x
- Vitest + Playwright

## License

MIT License - see [LICENSE](LICENSE).
