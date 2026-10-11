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
- Verification follow-ups: exact `/admin/login` exemption (prefix check let `/admin/loginX` skip auth) and `requireAdminPage()` in every admin page load (layout loads can be skipped via `x-sveltekit-invalidated`); cron requires `CRON_SECRET` on Vercel; GA4 CSP hosts per Google's guide; `kit.prerender.origin` set (sitemap/canonical no longer `http://sveltekit-prerender`)

## Phase 1 — Live bugs and security ✅ done

All items shipped on this branch; see the commits for details.

- 1.1 Fixed site URL: `src/lib/config/site.ts` (`SITE_URL`, from `PUBLIC_SITE_URL`, default `https://evscooterpro.com`) used for canonical, OG, JSON-LD and sitemap; `kit.prerender.origin` set; `/notifications` noindexed and dropped from the sitemap.
- 1.2 OG images: Inter Latin-subset TTFs + resvg wasm loaded via `?url` + `read()`; verified by invoking the built Vercel function in isolation (200 `image/png`); e2e test added.
- 1.3 `supabase/migrations/003_security_hardening.sql`: verified on Postgres 16 with Supabase roles (idempotent; anon/authenticated denied; upsert works). **Apply it to the production database.**
- 1.4 SSRF: `src/lib/server/net/safe-fetch.ts` + `ip-blocklist.ts`; `scrapeUrl` and `fetchPage` migrated; 55 tests.
- 1.5 Rate limiter: no longer fails open; login and newsletter fail closed (503) with their own buckets.
- 1.6 Dependencies: `npm audit --omit=dev` 26 → 0.

## Phase 2 — Calculator correctness ✅ done

- **2A** safe fixes: gain strings never show NaN/Infinity/"+-"; shared C-rate thresholds; finite input guard; wall-energy cost; `rpm` in share links; store uses `$derived`; ride-mode badge.
- **2B** controller current limit applied (`controller·V·(1−sag)·η`), exposed as `controllerLimited`; KV top speed uses sag. No catalog numbers moved (verified by snapshot).
- **2C** physics-ratio consumption model, relative ride modes (speed/power caps), firmware `speedCap`, and recalibrated presets.
  - **Calibration changed from the original plan:** instead of per-class realism factors (0.75/0.65/0.55), each preset is calibrated so the engine reproduces its claimed range under _claim conditions_ (75 kg, flat, ~15 km/h); the everyday figure then comes from physics. Constants (cruise cap 32 km/h, claim cruise 15 km/h) were fitted to independent tests. Result: median range 0.70× claim (RiderGuide average 0.71), commuter/mid/hyper medians 0.73/0.64/0.74, and 0 presets ≥50% off their claim (was 103). The validation set is only 4 tested scooters — add `tested` data to presets as it becomes available and re-run `node scripts/calibrate-presets.mjs`.
  - Spec corrections from manufacturer pages: Xiaomi Electric Scooter 5 (was mislabelled "M365 Pro"), Navee GT3 Pro, Apollo Phantom V3, Segway GT3 Pro, WK GTR claim, Gotrax GX2; speed caps for Air5, Climber, Renegade.
  - Open: `watts` holds peak power for most presets; Wolf King GTR battery (2520 vs 2419 Wh) is unresolved between sources.

## Phase 3 — SEO, accessibility, content ✅ done (except newsletter)

- One `<Seo>` component per page; layout and `app.html` emit no title/meta (app.html's static `<title>` was winning over page titles). Verified 1 title/description/canonical/og:title/og:image on 14 page types.
- axe-core: 20/20 page×viewport combinations clean (was 0/20; 1,057 contrast failures on /rankings). Tertiary text #8291a7; one h1 per page; mobile nav is a `<nav>`; no nested interactive elements; valid `<dl>`; named progressbars; `aria-pressed` toggles.
- Retired Clearbit logos removed (initials badge); years from `CONTENT_YEAR`; brand-prefixed names; Wh/mi in imperial.
- **Open:** newsletter double opt-in and token unsubscribe — blocked on choosing an email provider (recommended: Resend). Design in the security notes above still applies. Font-size floor (11px) left as a design decision; 8–9px text was raised to 10px.

## Phase 4 — Hardening, tooling, performance ✅ done (except refactors)

- E2E runs on `vite preview` of the build in CI; 3 already-broken tests fixed; suite 47/47 passing.
- Admin SSE client: no POST auto-retry, listener leak fixed, WHATWG parser, aborted on navigation.
- Storage: dead A/B code removed, guarded localStorage, validated profiles, listener/idle leaks fixed.
- `$app/stores` → `$app/state`; client Sentry lazy-loaded (not in the client build without a DSN); `autoInstrument.load` off.
- GA bootstrap moved to `static/ga-init.js`; strict hash-based CSP running **report-only** with `/api/csp-report` (0 violations in testing). Enforce it once production reports are clean.
- Dead code removed (`tailwind.config.js`, 3 unused components, `autoprefixer`, legacy `@typescript-eslint/*`); DEPLOYMENT/CONFIGURATION/README rewritten.
- **Deferred (pure refactors, no user-visible effect):** splitting large components; splitting the presets data chunk.

## Decisions needed

1. **Email provider** for newsletter opt-in/unsubscribe (recommend Resend), or keep sign-ups pending with no mail until one is chosen.
2. **Range calibration target** — claimed range × 0.75 (recommended) vs. raw claims vs. independent test data where available.
3. **Canonical domain** — confirm `https://evscooterpro.com`.
4. **Post-deploy verification** of `vercel.json` header precedence (`curl -I` an admin URL and a public page; check `Cache-Control`, `X-Frame-Options`, `x-vercel-cache`).
5. **Set `CRON_SECRET`** in the Vercel project env vars (Vercel does not create it); the cron endpoint now returns 401 on Vercel without it. Optionally set `PUBLIC_SITE_URL`.
