# Site Review — Remediation Plan

Outcome of a multi-agent review (security, physics correctness, live UX/a11y/SEO,
build health) in October 2026. Quick wins are already fixed on
`claude/fervent-ramanujan-4lk76v` (commits "Format codebase with Prettier" and
"Fix admin auth bypass, CDN caching, and review quick wins"). This document plans
the rest. Effort: S ≈ <½ day, M ≈ 1–2 days, L ≈ 3+ days.

## Already fixed

- Admin auth bypass via percent-encoded paths (`/%61dmin/...`); admin layout re-checks session
- `private, no-store` on admin pages/API; `vercel.json` public cache rule no longer matches admin/cron/newsletter/immutable assets
- Cron endpoint requires `CRON_SECRET` in production, constant-time compare
- JSON-LD `<` escaping (`src/lib/utils/json-ld.ts`)
- Newsletter: email length cap, non-enumerating unsubscribe response
- Physics result cache uses an exact key (was a lossy 32-bit hash returning other configs' stats)
- Number inputs display the clamped value; cost page NaN/Infinity; rankings `replaceState` crash + debounce
- Mobile nav / desktop header tabs navigate home from subpages; `/embed` frameable again; CSP `connect-src` for Sentry/GA/Fonts
- "Cost per per 100km" label; inverted "x lower C-rate"; svelte-check errors; BottomSheet/StatsCard rune fixes
- CI: lint + format check, Node 22, npm cache, single test run; `lighthouserc.cjs`; `npm ci` on Vercel

## Phase 1 — Live bugs and security (do next)

| #   | Item                                                                                                                                                                       | Effort | Notes                                                                                                                                                                                                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | **Prerendered pages point at `http://sveltekit-prerender`** — sitemap `<loc>`s and canonicals on `/best`, `/best/[slug]`, `/compare/[pair]` use `url.origin` at build time | S      | Add `src/lib/config/site.ts` (`SITE_URL` from `PUBLIC_SITE_URL`, default `https://evscooterpro.com`), set `kit.prerender.origin`, replace every `url.origin`/hard-coded domain. Drop `/notifications` from sitemap (+ `noindex`).                                                                                                              |
| 1.2 | **`/api/og` returns 500** — satori can't read WOFF2                                                                                                                        | S      | Commit Inter TTF (latin subset) under `src/lib/server/og/fonts/`, load via `?url` + `read()` from `$app/server`. Add a smoke test for `200 image/png`.                                                                                                                                                                                         |
| 1.3 | **Supabase hardening migration** `003_security_hardening.sql`                                                                                                              | S      | Enable RLS + revoke anon/authenticated on `rate_limits`, `revoked_nonces`; `search_path` + revoke PUBLIC execute on `check_rate_limit_atomic`; create missing `purchase_links` table; defensive RLS on all base tables. Regenerate DB types.                                                                                                   |
| 1.4 | **SSRF** — `url-safety.ts` is string-only, redirects not re-validated, `html-extractor.ts fetchPage` unvalidated and unbounded                                             | M      | New `src/lib/server/net/safe-fetch.ts`: DNS lookup + private-range check (incl. IPv4-mapped IPv6, CGNAT, multicast), connection pinned to vetted IP, `redirect: 'manual'` with per-hop revalidation, timeout, byte cap, content-type check. Migrate `scraper.ts`, `html-extractor.ts fetchPage`, `web-search.ts`. Unit-test the IP classifier. |
| 1.5 | **Rate limiter fails open** on DB error (`rate-limit-persistent.ts:22-25`)                                                                                                 | S      | `failMode`: public routes fall back to in-memory limiter; admin login fails closed (503). Separate, lower newsletter bucket.                                                                                                                                                                                                                   |
| 1.6 | **Dependency advisories** (26 prod, 8 high incl. svelte/kit XSS)                                                                                                           | S–M    | Semver-safe bumps: kit 2.70.x, svelte 5.57.x, vite 7.3.x, postcss, supabase-js, @sentry/sveltekit 10.76; `overrides` for devalue if needed. Majors (kit 3, vite 8, Sentry 11, vitest 5…) on a separate branch.                                                                                                                                 |

## Phase 2 — Calculator correctness (ship in three steps)

**2A — no model-number changes (except cost)**

| Item                                         | Effort | Change                                                                                                  |
| -------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Gain strings `+NaN%`/`+Infinity%`/`+-5%`     | S      | `formatPercentChange(base, next)` in `utils/formatters.ts`; use in `recommendations.ts`, `upgrades.ts`. |
| C-rate thresholds disagree (3.0 / 2.0 / 2.5) | S      | `C_RATE_CAUTION=2.0`, `C_RATE_CRITICAL=3.0` constants everywhere.                                       |
| Input guard misses `soh≤0`/NaN               | S      | `Number.isFinite(x) && x > 0` for all required fields in `calculatePerformance`.                        |
| Cost ignores charger losses                  | S      | `costPer100km` uses wall energy (`/0.88`).                                                              |
| Share links drop `rpm`                       | S      | Append to end of positional `configKeys`; export encode/decode with round-trip tests.                   |
| Store getters recompute ~11×                 | M      | `CalculatorStore` class with `$derived` fields; keep `calculatorState.*` API.                           |
| Ride-mode badge wrong on load                | S      | `rideMode: RideMode                                                                                     | null`, null after `loadPreset`/non-matching style. |

**2B — power & speed (changes numbers; re-baseline catalog once)**

- **Controller limit never applied:** `totalWatts = min(motors·watts·(1−sag)·temp, controller·v·(1−sag))`; expose `controllerLimited`; bottlenecks/recommendations read it; recommendation gains come from re-running the engine (drop `NOMINAL_VOLTAGE` scaling). (S–M)
- **Efficiency/realworld ignored for power-limited speed:** equilibrium speed uses `totalWatts·η`; KV top speed applies sag. (S)
- Expected impact: power-limited top speeds ≈10% lower; controller upgrades show real gains.

**2C — consumption model + preset recalibration (must land together)**

- **Range ignores weight/tyres/aero/slope; hills _increase_ range:** keep `style` as Wh/km at reference conditions (80 kg rider, flat, Cr 0.015, single motor, no regen) and scale it by
  `physWhKm(config) / physWhKm(reference)` where
  `physWhKm = [(Cr·m·g + ½ρ·CdA·v_ref²)/η + m·g·(s/100)·0.5·(1−regen·η)] / 3.6 + P_idle·motors/v_ref`,
  `v_ref = clamp(0.75·flatSpeed, 15, 45) km/h`. Regen recovers only braking share (~0.3) on the flat. (L)
- **Ride modes do nothing:** relative `speedFactor` (eco 0.6 → turbo 1.0) caps `v_ref` and top speed; `powerLimit` caps watts; include mode in cache key. (M)
- **Presets:** 104/204 presets compute ≥50% off claimed range. `scripts/calibrate-presets.ts` (vite-node) solves `style` per preset against `claim.range × 0.75`, clamps to plausible bounds, flags `needs-review` instead of fudging; dry-run diff by default, `--write` via `preset-writer.ts`. Fix `m365_2025` specs; add optional `speedCap` for regulated scooters (air5, gx2, climber). Lower UI `style` min from 20 → 8 (it currently silently alters efficient presets). Bump `CATALOG_VERSION`. (M–L)
- Track `catalog-audit.spec.ts` warning/error counts before/after in each PR.

## Phase 3 — SEO, accessibility, content

| Item                                                                                 | Effort | Change                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Duplicate meta tags (2× og:title/og:image/description; 2× canonical on compare/best) | M      | Single `Seo.svelte` rendered by the layout from `page.data.seo` with defaults; remove description from `app.html` and all per-page og/twitter/canonical tags; add `+page.ts` where pages lack a load.                    |
| Contrast (axe serious; 1057 nodes on /rankings)                                      | S      | `--color-text-tertiary: #8291a7` (≥4.5:1 on all backgrounds); 11px floor (`text-2xs`), codemod 9px usages.                                                                                                               |
| ARIA                                                                                 | S      | AppHeader brand `h1`→`span`; tab roles only when panels exist (home, non-error); `/embed` h1; rankings empty `<th>` sr-only label; `/scooter/[key]` `<dl>` structure + progressbar labels; motor buttons `aria-pressed`. |
| Brand logos via retired Clearbit API                                                 | S      | Initials badge by default; optional self-hosted SVGs; tighten CSP `img-src`.                                                                                                                                             |
| Year inconsistencies + brand-less names                                              | S–M    | `CONTENT_YEAR` from `CATALOG_LAST_UPDATED`; `brand` field on preset metadata; rename ~13 entries; generator prefixes brand.                                                                                              |
| Imperial efficiency stuck in Wh/km                                                   | S      | `efficiencyVal`/`efficiencyUnit` in `units.ts`.                                                                                                                                                                          |
| Newsletter: unauthenticated unsubscribe, no opt-in                                   | M      | HMAC tokens (`NEWSLETTER_SECRET`), pending→confirmed flow, token-based unsubscribe page (RFC 8058 one-click); email via Resend REST. Needs a provider decision.                                                          |

## Phase 4 — Hardening, tooling, performance

| Item                                           | Effort | Change                                                                                                                                             |
| ---------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| E2E runs against dev server                    | S      | Playwright uses `npm run preview` on 4173 in CI. Do early so later work is covered.                                                                |
| Nonce/hash CSP (drop script `'unsafe-inline'`) | M      | Move GA bootstrap out of `app.html`; `kit.csp` mode `auto`; roll out as Report-Only first. After 1.6.                                              |
| Admin SSE client re-runs batch POSTs           | S–M    | No retries for non-GET; abort on navigation; fix listener leak; spec-compliant parser; tests.                                                      |
| Browser-storage robustness                     | S      | Delete unused A/B code; remove leaked listeners/idle callbacks; try/catch `setItem`; validate saved profiles.                                      |
| `$app/stores` → `$app/state` (11 files)        | S–M    | Mechanical; keep reads inside reactive contexts.                                                                                                   |
| Sentry loaded on every page (~46 KB gz)        | M      | Lazy-import in `hooks.client.ts` when DSN set; conditional vite plugin.                                                                            |
| Presets chunk (107 KB)                         | M      | Light index eagerly, full specs on demand.                                                                                                         |
| Dead code                                      | S      | Remove `tailwind.config.js` (verify CSS diff), `Card`/`PresetCard`/`UpgradeGuidance`, `autoprefixer`, `@typescript-eslint/{eslint-plugin,parser}`. |
| Stale docs                                     | S      | Rewrite `DEPLOYMENT.md` for Vercel + real env vars; README port 3000; fix `CONFIGURATION.md` paths and ride-mode names.                            |
| Large components                               | M each | Split `ScooterComparisonTable`, `+page.svelte`, `ProfileManager`, `BasicConfig`, `DataAuditPanel` (one PR each).                                   |

## Decisions needed

1. **Email provider** for newsletter opt-in/unsubscribe (recommend Resend), or keep sign-ups pending with no mail until one is chosen.
2. **Range calibration target** — claimed range × 0.75 (recommended) vs. raw claims vs. independent test data where available.
3. **Canonical domain** — confirm `https://evscooterpro.com`.
4. **Post-deploy verification** of `vercel.json` header precedence (`curl -I` an admin URL and a public page; check `Cache-Control`, `X-Frame-Options`, `x-vercel-cache`).
