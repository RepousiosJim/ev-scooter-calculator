---
tags: [performance]
summary: performance implementation decisions and patterns
relevantTo: [performance]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 0
  referenced: 0
  successfulFeatures: 0
---
# performance

#### [Pattern] Cache physics calculations with Map and 200-item limit to avoid redundant computations during UI interactions (2026-01-16)
- **Problem solved:** Temperature slider triggers reactive updates which recalculate range/performance on every small change
- **Why this works:** Physics calculations involve multiple formulas and could run hundreds of times per second while dragging slider. Caching identical calculation results prevents CPU waste and keeps UI responsive
- **Trade-offs:** Instant UI response with temperature slider, but 200-item limit means rarely-used calculations may be evicted and recomputed