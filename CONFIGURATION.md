# Configuration Guide

## Application Settings

### Presets

Scooter presets live in `src/lib/data/presets.ts`, in two maps keyed by the same preset key:

- `presets[key]` — the `ScooterConfig` the calculator runs (volts, amp-hours, motors, peak watts per motor, wheel size, base consumption `style`, optional `speedCap`, …).
- `presetMetadata[key]` — display data: `name` (always prefixed with the brand), `year`, and the manufacturer's claims (`topSpeed`, `range`, `batteryWh`, `price`).

`watts` is the **peak** output per motor (divide a published total peak by the motor count). Manufacturers' rated/nominal figures are lower and make the scooter look slower than it is.

After adding or changing a preset, calibrate it against the manufacturer's claims:

```bash
node scripts/calibrate-presets.mjs           # dry run: table of old → new values and flags
node scripts/calibrate-presets.mjs --write   # write motorKv and style into presets.ts
```

The script does two things:

1. **Top speed:** fits `motorKv` so the calculated top speed matches the claimed top speed. Presets with a firmware or legal `speedCap` keep their KV. If the listed power can't reach the claim at any KV, the scooter is listed as power-limited; check its `watts`.
2. **Range:** sets `style`, the scooter's base consumption in Wh/km at reference conditions (80 kg rider, flat ground, no regen, full-power cruise, default tyres), so the engine reproduces the claimed range under the conditions manufacturers measure at (75 kg rider, flat, ~15 km/h). The everyday range then comes from the physics model. If the preset has an independently tested range (`tested.range` in its metadata), that is used instead, and the everyday range is set to match the test. Use this when a claim is an eco-mode figure far above real riding.

When a preset is merged into another or its key changes, add the old key to `src/lib/data/preset-aliases.ts`. Old `/scooter/…`, `/compare/…` and `?preset=` links then redirect to the current key. Keys removed because the model doesn't exist are not aliased; they return 404. Bump `CATALOG_VERSION` and `CATALOG_LAST_UPDATED` when the catalog changes — `CONTENT_YEAR` (used in "best of" titles) is derived from the latter.

### Ride Modes

Ride modes are defined in `src/lib/data/ride-modes.ts`. Like real scooter firmware, each mode caps speed and power **relative to the scooter's own capability** and sets regen strength; they do not change the scooter's base consumption:

| Mode   | Speed cap | Power cap | Regen |
| ------ | --------- | --------- | ----- |
| Eco    | 60%       | 50%       | 0.12  |
| Normal | 80%       | 75%       | 0.08  |
| Sport  | 95%       | 90%       | 0.05  |
| Turbo  | 100%      | 100%      | 0.03  |

They are stored in the config as `speedFactor` and `powerLimit` (absent means 100%, i.e. Turbo — how a preset loads).

### Physics Constants

Constants live in `src/lib/constants/physics.ts`, including:

- `AIR_DENSITY_KG_M3`, `GRAVITY_M_S2`, `ROLLING_RESISTANCE_COEFFICIENT` (default tyre Cr, 0.02)
- `C_RATE_CAUTION` (2.0) and `C_RATE_CRITICAL` (3.0) — battery discharge warning thresholds
- `CHARGE_WALL_EFFICIENCY` (0.88) — share of wall energy that reaches the battery (used for cost)
- Consumption model: `REF_RIDER_KG`, `CRUISE_FRACTION_OF_TOP_SPEED`, `CRUISE_MIN_KMH`, `CRUISE_MAX_KMH`, `REGEN_FLAT_BRAKING_SHARE`, `IDLE_BASE_W`, `IDLE_PER_MOTOR_FRACTION_OF_RATED`
- Calibration: `CLAIM_RIDER_KG`, `CLAIM_CRUISE_KMH`

The cruise and claim constants were fitted to independent range tests; re-run the calibration script after changing any of them.

## Advanced Configuration

### Cache Settings

Performance results are memoised in an LRU cache keyed on the exact config. The size is set in `src/lib/constants/cache.ts`:

```typescript
export const PERFORMANCE_CACHE_LIMIT = 200;
```

### Theme Configuration

Theme tokens are defined with Tailwind v4's `@theme` block in `src/app.css` (there is no `tailwind.config.js`):

```css
@theme {
	--color-primary: #22d3ee;
	--color-text-tertiary: #8291a7; /* keep ≥4.5:1 contrast on the background tokens */
	/* ... */
}
```

### localStorage Schema

Saved profiles are stored under the key `ev-scooter-profiles` and validated on load (malformed entries are dropped):

```json
[
	{
		"id": "uuid",
		"name": "My Scooter",
		"config": {
			/* ScooterConfig */
		},
		"presetKey": "custom",
		"createdAt": "2026-01-01T00:00:00.000Z",
		"updatedAt": "2026-01-01T00:00:00.000Z",
		"isFavorite": false
	}
]
```

## Environment-Specific Behavior

### Development

- `npm run dev` serves on `http://localhost:3000` with hot module replacement
- Without Supabase credentials, data is stored in local JSON files under `data/` (gitignored)

### Production

- Deployed to Vercel (see [DEPLOYMENT.md](DEPLOYMENT.md))
- Supabase is required for persistent data
- PWA assets are generated

## Calculations Reference

All formulas live in `src/lib/physics/calculator.ts`.

### Power

```
uncappedWatts  = motors × watts × (1 − sag) × temperatureFactor
controllerCap  = controller × V × (1 − sag) × drivetrainEfficiency   (if a controller limit is set)
totalWatts     = min(uncappedWatts, controllerCap) × powerLimit
```

`watts` is peak output power per motor, so drivetrain efficiency only converts the controller's electrical limit to output power.

### Speed

Top speed is the equilibrium speed where available power equals rolling + aerodynamic (+ grade) resistance, limited by the motor's KV/RPM, the firmware `speedCap`, and the ride mode's `speedFactor`.

### Range

```
whPerKm    = style × physicsWhPerKm(actual ride) / physicsWhPerKm(reference ride)
totalRange = V × Ah × soh × temperatureFactor / whPerKm
```

`physicsWhPerKm` models rolling resistance, aerodynamic drag at a typical cruise speed (0.75 × top speed, 15–32 km/h, lowered by ride mode), an out-and-back grade, a small regen recovery and no-load losses. Physics is used only as a ratio, so heavier riders, hills, worse tyres and faster cruising all reduce range relative to the calibrated base. Real-world mode applies extra drivetrain losses.

### Acceleration Score

```
powerToWeight = totalWatts / (scooterWeight + riderWeight)
accelScore    = min(100, (powerToWeight / 25) × 100)
```

## Customizing Behavior

### Adding New Bottlenecks

Edit `detectBottlenecks()` in `src/lib/physics/bottlenecks.ts`:

```typescript
if (stats.someCondition) {
	bottlenecks.push({
		type: 'NEW_BOTTLENECK',
		message: 'Description',
		upgrade: 'suggestedUpgrade',
	});
}
```

### Adding New Recommendations

Edit `generateRecommendations()` in `src/lib/physics/recommendations.ts`, following the existing pattern. Compute gains by re-running `calculatePerformance()` on the upgraded config and format them with `formatPercentChange()` / `formatSignedDelta()` from `src/lib/utils/formatters.ts`.

### Modifying Upgrade Simulation

Upgrade types and their effects are defined in `simulateUpgrade()` and `calculateUpgradeDelta()` in `src/lib/physics/upgrades.ts`.
