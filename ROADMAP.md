# EV Scooter Pro Calculator — Strategic Roadmap

> Generated 2026-04-12 | Current version: v1.4.0

---

## Current State (v1.4.0)

**Strengths:** Clean TypeScript (zero `as any`, zero TODOs), solid physics engine with LRU cache, full admin verification pipeline, PWA-ready, 151 unit tests passing, 9 E2E test suites, Google Analytics integrated, good mobile UX with 44px touch targets.

**Gaps:** No linting config, no code coverage tracking, test coverage blind spots (server APIs, verification pipeline), file-based verification store won't scale, no error monitoring in production, no user persistence (accounts/saved configs), all strings hardcoded (no i18n), skipped accessibility tests.

---

## Phase 1: Engineering Foundation (1-2 weeks)

_"Stop shipping without a safety net"_

| #   | Task                                                                                                                                           | Why                                                                                                          | Effort |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------ |
| 1.1 | **Add ESLint + Prettier** with pre-commit hooks (Husky + lint-staged)                                                                          | No linting exists. One bad merge can introduce regressions nobody catches.                                   | S      |
| 1.2 | **Enable code coverage** in Vitest, set 70% floor, add badge to README                                                                         | You have 151 tests but no idea what % of code they cover. Blind spot.                                        | S      |
| 1.3 | **Test the server API routes** — unit tests for `/api/admin/verify`, `/api/admin/batch-verify`, `/api/admin/discover`, `/api/admin/candidates` | These endpoints handle data mutations with zero test coverage. The entire verification pipeline is untested. | M      |
| 1.4 | **Un-skip the 5 accessibility E2E tests** (keyboard nav, focus management, reduced motion) and fix any failures                                | Skipped tests are worse than no tests — they give false confidence.                                          | S      |
| 1.5 | **Add E2E tests to CI** as a separate workflow step with Playwright                                                                            | E2E exists but doesn't run in CI. Regressions in routing, navigation, presets can ship undetected.           | S      |
| 1.6 | **Add error monitoring** — Sentry or equivalent, client + server                                                                               | You have zero visibility into production errors. A user hitting a bug is invisible to you.                   | S      |

**Exit criteria:** CI runs lint + type check + unit tests (with coverage) + E2E. Sentry captures errors. Coverage >= 70%.

---

## Phase 2: Production Hardening (2-3 weeks)

_"Make it reliable at scale"_

| #   | Task                                                                                  | Why                                                                                                                                   | Effort |
| --- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2.1 | **Migrate verification store from JSON files to Vercel KV**                           | File-based store breaks on multi-instance serverless. One concurrent write = data corruption. This is your biggest production risk.   | L      |
| 2.2 | **Add structured logging** (pino or similar) with request IDs                         | `console.error` scattered across server code. No way to trace a request through discovery -> candidate -> approval.                   | M      |
| 2.3 | **Parallelize discovery scanning** — `Promise.allSettled()` for manufacturer requests | Currently sequential. 15 manufacturers x 3-5s each = 45-75s scan. Parallel = ~5s.                                                     | S      |
| 2.4 | **Add response caching headers** to public routes                                     | Rankings page recomputes 68 scooters on every load. Add `Cache-Control` + `stale-while-revalidate`.                                   | S      |
| 2.5 | **Performance budget** — Lighthouse CI in GitHub Actions, fail on score < 90          | You have no automated guard against performance regressions. A heavy import can tank LCP.                                             | M      |
| 2.6 | **Generate dynamic OG images** per scooter (using `@vercel/og` or satori)             | Share links currently have no visual preview. A scooter-specific card image dramatically increases click-through on social/messaging. | M      |

**Exit criteria:** Verification data survives concurrent writes. Discovery completes in <10s. Lighthouse scores >= 90 in CI.

---

## Phase 3: User Value (3-4 weeks)

_"Give users a reason to come back"_

| #   | Task                                                                                                              | Why                                                                                                                                                                                      | Effort |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 3.1 | **User profiles with localStorage** — save multiple configs, name them, switch between them                       | Users currently lose their config when they close the tab. The share link is a workaround, not a solution.                                                                               | M      |
| 3.2 | **Scooter detail pages** (`/scooter/[key]`) with full specs, score breakdown, upgrade paths, and SEO              | Each scooter is a high-intent search query ("Nami Burn-E 2 Max specs"). You're leaving 68 indexable pages on the table. Right now everything is client-rendered behind JS.               | L      |
| 3.3 | **Side-by-side comparison view** — select 2-3 scooters, see a diff view of all specs + calculated metrics         | The compare table exists but shows raw numbers. A diff-style view (green = better, red = worse) with visual bars would be much more useful for purchase decisions.                       | M      |
| 3.4 | **"Which scooter should I buy?" wizard** — guided flow: budget -> use case -> weight -> terrain -> recommendation | Most users don't know what voltage or Ah means. A guided wizard that asks human questions and maps to technical filters would capture the 90% of visitors who bounce off the calculator. | L      |
| 3.5 | **Print/PDF export** — styled single-page report with config, all metrics, graphs, bottleneck analysis            | Users take scooter comparisons to dealers, show partners, or save for reference. A clean PDF is more shareable than a URL.                                                               | M      |
| 3.6 | **Ride cost calculator** — input daily commute distance, electricity price, compare vs car/transit/bike           | Extends the value proposition beyond "which scooter" to "should I buy a scooter at all." Strong SEO keyword target.                                                                      | M      |

**Exit criteria:** Users can save/load configs. Each scooter has an indexable page. Wizard converts non-technical visitors.

---

## Phase 4: Growth & Discovery (2-3 weeks)

_"Get found by the people who need this"_

| #   | Task                                                                                                                          | Why                                                                                                                                     | Effort |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 4.1 | **Schema.org structured data** — `Product` markup on scooter pages, `FAQPage` on calculator                                   | Google rich snippets. A scooter search result with price, rating, and specs shown inline = massive CTR boost.                           | M      |
| 4.2 | **Blog/content section** (`/guides/`) — "Best scooters for commuting 2025", "How to read scooter specs", "Battery care guide" | SEO content marketing. Each guide targets high-volume keywords and links to your calculator. This is your #1 organic growth lever.      | L      |
| 4.3 | **Embeddable widget** — `<iframe>` or web component that other sites can embed (scooter review sites, forums)                 | Distribution channel. Review sites want interactive tools. An embed with "Powered by EV Scooter Pro" drives backlinks + traffic.        | M      |
| 4.4 | **Public API** (`/api/v1/`) — scooter specs, performance calculations, rankings                                               | Developers, YouTubers, and review sites would use this. API key auth, rate limiting, OpenAPI spec. Positions you as the data authority. | L      |
| 4.5 | **Newsletter/notification** — "Price drop alert" or "New model added"                                                         | Re-engagement. Users who compared scooters 3 months ago might be ready to buy. Price alerts trigger action.                             | M      |

**Exit criteria:** Organic traffic growing month-over-month. At least 5 external sites embedding or linking.

---

## Phase 5: Intelligence & Differentiation (4-6 weeks)

_"Things only you can build because you have the data"_

| #   | Task                                                                                                                             | Why                                                                                                                                                                                         | Effort |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 5.1 | **Real-world range model** — crowdsourced ride data (voluntary upload) to calibrate physics predictions                          | Your "realworld" mode applies a flat 15% derating. Actual range varies by terrain, rider weight, temperature. User-submitted data makes your predictions the most accurate on the internet. | XL     |
| 5.2 | **Price tracking dashboard** — historical price charts, deal alerts, "best time to buy"                                          | You already store `priceHistory`. Surfacing this as a consumer feature (not just admin) turns your data into a unique product. Think CamelCamelCamel for scooters.                          | L      |
| 5.3 | **Depreciation/TCO model** — total cost of ownership over 1-3 years including battery degradation, tire replacement, maintenance | No one does this. Scooter buyers focus on sticker price. A TCO comparison that accounts for battery SOH decay and maintenance would be genuinely novel.                                     | L      |
| 5.4 | **AI-powered "Ask about this scooter"** — conversational Q&A using your physics engine + spec database as context                | Instead of users figuring out what C-rate means, they ask "Can this handle my 10km hilly commute?" and get a physics-backed answer.                                                         | L      |
| 5.5 | **Fleet calculator** — for delivery companies or rental operators: fleet sizing, charging infrastructure, replacement schedules  | B2B angle. Delivery companies are the fastest-growing EV scooter segment. A fleet tool positions you for commercial partnerships.                                                           | XL     |

---

## Priority Matrix

```
              HIGH IMPACT
                  |
      +-----------+-----------+
      |  3.2  3.4 | 5.1  5.2  |
      |  4.2  4.4 | 5.3  5.5  |
      |           |           |
 LOW  -----------+-----------  HIGH
 EFFORT          |           EFFORT
      |  1.1-1.6 | 2.1  3.6  |
      |  2.3  2.4 | 2.5  4.3  |
      |  3.1  3.5 | 4.1       |
      +-----------+-----------+
                  |
              LOW IMPACT
```

**Do first (high impact, low effort):** Phase 1 entirely, then 3.1, 2.3, 2.4

**Do next (high impact, high effort):** 3.2 (scooter pages), 3.4 (wizard), 4.2 (blog)

**Schedule (lower urgency):** Phase 5 items — only after Phases 1-3 are solid

---

## Top 3 Recommendations

1. **Phase 1 is non-negotiable.** You're shipping to production without linting, without coverage, with untested API routes, and with zero error visibility. This is the engineering equivalent of driving without mirrors. Do this before any feature work.

2. **3.2 (Scooter detail pages) is your highest-leverage feature.** You have 68 scooters. Each one is a search query someone types into Google. Right now, all that content is locked behind client-side JS in a single-page app. Creating `/scooter/nami-burn-e-2-max` with server-rendered specs, score breakdown, and upgrade paths gives you 68 indexable landing pages overnight.

3. **2.1 (Vercel KV migration) before you scale traffic.** Your verification store writes JSON files. Serverless functions are ephemeral — file writes disappear between cold starts, and concurrent writes corrupt data. If you're going to grow traffic (via SEO, guides, API), fix the data layer first.

---

## Effort Legend

| Size | Meaning   |
| ---- | --------- |
| S    | < 1 day   |
| M    | 1-3 days  |
| L    | 3-7 days  |
| XL   | 1-2 weeks |
