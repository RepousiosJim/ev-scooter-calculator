---
tags: [architecture]
summary: architecture implementation decisions and patterns
relevantTo: [architecture]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 1
  referenced: 0
  successfulFeatures: 0
---
# architecture

### Applied temperature factor to BOTH battery capacity (Ah) and power output (Watts) in performance calculations (2026-01-16)
- **Context:** Real-world cold weather degrades both available energy storage and maximum power delivery in Li-ion batteries
- **Why:** Physically accurate modeling - cold temperature reduces ion mobility (affecting power) AND reduces chemical reaction rates (affecting capacity). Only affecting one would give misleadingly optimistic results
- **Rejected:** Applying factor only to capacity - rejected because it would overestimate performance in cold conditions, giving users inaccurate range/speed expectations
- **Trade-offs:** More computationally complex (2x multiplications) vs more accurate predictions
- **Breaking if changed:** If only one factor is applied, range and top speed calculations become inaccurate in cold conditions, misleading users

### Linear interpolation from 60% at -20°C to 100% at 20°C, flat 100% above 20°C (2026-01-16)
- **Context:** Modeling Li-ion battery efficiency across realistic operating temperatures
- **Why:** Linear approximation is sufficiently accurate for consumer scooters and computationally simple. 60% baseline at -20°C matches real-world Li-ion performance data. Flat above 20°C because high heat doesn't significantly improve efficiency in this range
- **Rejected:** Exponential/curved interpolation - rejected as over-engineering for scooter-calculator accuracy needs and harder to explain to users
- **Trade-offs:** Simpler code and easier to understand vs less precise at extreme temperatures
- **Breaking if changed:** Changing interpolation method would require recalculating all results and updating documentation of efficiency behavior

#### [Pattern] New config fields must be added to configKeys array for URL sharing/export functionality (2026-01-16)
- **Problem solved:** Explicit opt-in mechanism for which configuration fields get serialized to URL params
- **Why this works:** Prevents accidental leakage of sensitive or internal fields, provides clear control over what's shareable, maintains backward compatibility by defaulting new fields to NOT shared until explicitly added
- **Trade-offs:** More manual maintenance (must remember to add each new field) vs safer and more controllable data sharing

#### [Pattern] All preset configurations updated to include default ambientTemp: 20 value when adding new optional field (2026-01-16)
- **Problem solved:** Adding ambientTemp to ScooterConfig interface with presets.ts containing multiple scooter configurations
- **Why this works:** TypeScript strict mode and validation rules require all config fields to be defined. Presets without ambientTemp would fail validation or cause undefined behavior when accessed
- **Trade-offs:** More upfront work updating all presets vs simpler code path without undefined checks everywhere

#### [Pattern] New config field added to validators.ts immediately after interface definition (2026-01-16)
- **Problem solved:** Adding ambientTemp to ScooterConfig requires validation rules to maintain data integrity
- **Why this works:** Ensures all configuration values are validated before use, prevents invalid state from propagating through calculations. Catches type errors and range violations early in the data flow
- **Trade-offs:** More boilerplate code vs robust error prevention and clearer contract for valid inputs

#### [Pattern] Apply temperature factor to BOTH battery capacity AND motor power output in physics calculations (2026-01-16)
- **Problem solved:** Temperature affects electrochemical battery performance AND electrical motor efficiency in real EVs
- **Why this works:** Cold temperatures reduce battery discharge rate (power output) AND usable capacity (energy). Single factor on capacity only would overestimate performance in cold conditions, while power-only would underestimate range. Dual impact provides more accurate real-world modeling
- **Trade-offs:** More accurate physics modeling with minimal complexity, but users cannot isolate whether range reduction comes from capacity or power limitation

### Use linear interpolation with plateaus (-20°C to 20°C range) rather than exponential or lookup table (2026-01-16)
- **Context:** Need to model temperature efficiency without complex formulas or extensive calibration data
- **Why:** Linear interpolation is predictable, easy to understand, and matches typical battery manufacturer specs which show gradual capacity loss. Plateaus prevent unrealistic efficiency (never below 60%, never above 100%) and avoid edge cases
- **Rejected:** Exponential decay (too aggressive, hard to calibrate), lookup table (requires more data points, harder to interpolate), Arrhenius equation (overly complex for scooter use case)
- **Trade-offs:** Simple and predictable formula easy to maintain, but may not perfectly match specific battery chemistries (NMC vs LFP differences)
- **Breaking if changed:** Changing to exponential would overstate cold weather impact; changing to lookup table would require more data maintenance