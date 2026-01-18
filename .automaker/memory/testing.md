---
tags: [testing]
summary: testing implementation decisions and patterns
relevantTo: [testing]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 0
  referenced: 0
  successfulFeatures: 0
---
# testing

#### [Gotcha] Created temporary Playwright test for verification then deleted it after successful validation (2026-01-16)
- **Situation:** Ad-hoc verification during development of new UI feature (temperature slider)
- **Root cause:** Rapid verification without committing test code that may not meet test standards or be worth maintaining long-term. Allows quick exploration and validation before formalizing
- **How to avoid:** Faster development iteration vs risk of not having formal test coverage for the feature