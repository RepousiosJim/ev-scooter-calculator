# Configuration Guide

## Application Settings

### Presets

Scooter presets are stored in `src/lib/data/presets.ts`. To add a new preset:

```typescript
{
  name: 'My Scooter',
  config: {
    v: 48,
    ah: 13,
    motors: 1,
    watts: 800,
    // ... other config values
  }
}
```

### Ride Modes

Ride modes are stored in `src/lib/data/ride-modes.ts`. These affect efficiency calculations:

- Eco: Lower speed, extended range
- Standard: Balanced performance
- Sport: Higher speed, reduced range
- Custom: User-defined efficiency

### Physics Constants

Physical constants are defined in `src/lib/constants/physics.ts`:

```typescript
export const AIR_DENSITY = 1.225; // kg/m³
export const GRAVITY = 9.81;      // m/s²
export const ROLLING_RESISTANCE = 15; // W
```

These values are calibrated for typical EV scooter parameters.

## Advanced Configuration

### Cache Settings

Performance calculations are cached. Cache behavior is configured in `src/lib/utils/physics.ts`:

```typescript
const PERFORMANCE_CACHE_LIMIT = 200;
```

### Theme Configuration

Theme colors are defined in `src/app.css` and `tailwind.config.js`. To customize:

```css
@theme {
  --color-primary: #00d4ff;
  --color-secondary: #7000ff;
  --color-bg-dark: #0f172a;
  /* ... */
}
```

### localStorage Schema

Profiles are stored in localStorage under the key `ev-scooter-profiles`:

```json
[
  {
    "id": 1234567890,
    "name": "My Scooter",
    "config": { /* ScooterConfig object */ },
    "createdAt": 1234567890000,
    "updatedAt": 1234567890000
  }
]
```

## Environment-Specific Behavior

### Development
- Hot module replacement enabled
- Source maps included
- Development warnings visible

### Production
- Code minified
- Tree shaking enabled
- Performance optimizations applied
- PWA assets generated

## Calculations Reference

### Range Calculation

```
baseRange = (v * ah * soh * temperatureFactor) / style
regenGain = baseRange * (regen * 0.2)
totalRange = baseRange + regenGain
```

### Speed Calculation

Speed is drag-limited based on:
- Available motor power
- Aerodynamic drag (ridePosition factor)
- Rolling resistance
- Efficiency losses (drivetrain, battery sag)

### Acceleration Score

```
powerToWeight = totalWatts / (scooterWeight + riderWeight)
accelScore = min(100, (powerToWeight / 25) * 100)
```

## Customizing Behavior

### Adding New Bottlenecks

Edit `detectBottlenecks()` in `src/lib/utils/physics.ts`:

```typescript
if (stats.someCondition) {
  bottlenecks.push({
    type: 'NEW_BOTTLENECK',
    message: 'Description',
    upgrade: 'suggestedUpgrade'
  });
}
```

### Adding New Recommendations

Edit `generateRecommendations()` in `src/lib/utils/physics.ts` following the existing pattern.

### Modifying Upgrade Simulation

Upgrade types and their effects are defined in `simulateUpgrade()` and `calculateUpgradeDelta()`.
