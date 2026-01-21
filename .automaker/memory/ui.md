---
tags: [ui]
summary: ui implementation decisions and patterns
relevantTo: [ui]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 1
  referenced: 0
  successfulFeatures: 0
---
# ui

### Temperature slider displays real-time efficiency percentage (60% at -20°C, 80% at 0°C, 100% at 20°C+) as user adjusts (2026-01-16)
- **Context:** Users adjusting ambient temperature need immediate feedback on how much efficiency loss they'll experience
- **Why:** Improves UX by making the abstract temperature value concrete - users understand what "-20°C" means for their scooter's performance. Reduces need for users to manually calculate or guess the impact
- **Rejected:** Showing efficiency only in results section - rejected as delayed feedback makes it harder to understand the relationship between temperature and performance
- **Trade-offs:** More complex UI component vs better user understanding and decision-making
- **Breaking if changed:** Removing efficiency display makes temperature value abstract and harder for users to interpret

### Preserve temperature setting across preset changes instead of resetting to 20°C (2026-01-16)
- **Context:** Users exploring different scooter models need to compare them in their local climate conditions
- **Why:** Temperature represents environmental context (where user rides), not scooter configuration. Resetting it forces users to re-enter temperature every time they switch presets, creating friction in comparison workflows
- **Rejected:** Making temperature part of each preset (would duplicate data across 15+ presets), creating separate temperature profiles (adds unnecessary complexity for single-value state)
- **Trade-offs:** Easier preset comparison and exploration, but presets no longer fully 'reset' calculator state - users must manually reset temperature if needed
- **Breaking if changed:** Removing temperature preservation causes UX regression - users lose environmental context on every preset change, making model comparison frustrating

#### [Gotcha] Test expectations needed updating because temperature efficiency was already implemented but tests assumed 100% regardless of input (2026-01-16)
- **Situation:** Existing temperature feature had full physics implementation, but E2E tests were written expecting no temperature impact
- **Root cause:** Physics was added incrementally, but test suite wasn't updated to reflect new behavior. Tests failing revealed feature was already working - just had wrong expectations
- **How to avoid:** Fixed tests now properly validate temperature behavior, but had to identify and update multiple test assertions rather than adding new tests