# Deployment Guide

The app is a SvelteKit application with server routes (public API, admin panel, OG images, cron), deployed to **Vercel** with `@sveltejs/adapter-vercel`. It is not a static site: Netlify/GitHub Pages static hosting will not work.

## Vercel

1. Import the repository in Vercel (framework preset: SvelteKit). `vercel.json` sets `npm ci` + `npm run build`.
2. Set the environment variables below (Project → Settings → Environment Variables).
3. Apply the Supabase migrations (below).
4. Push to the production branch (`master`); Vercel builds and deploys it.

Adapter settings (`svelte.config.js`): Node 22 runtime, `split: false` (one function — the Hobby plan allows 12), `maxDuration: 60`. Some pages (`/best`, `/compare/*`, `/sitemap.xml`) are prerendered at build time.

### Environment variables

| Variable                    | Required | Purpose                                                                                                                                   |
| --------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `ADMIN_PASSWORD`            | Yes      | Admin panel login.                                                                                                                        |
| `SESSION_SECRET`            | Yes      | Signs admin session cookies (64+ random chars). Production refuses to start without it.                                                   |
| `SUPABASE_URL`              | Yes      | Supabase project URL. Vercel's filesystem is read-only, so all persistent data (verification, newsletter, rate limits) needs it.          |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes      | Server-side Supabase key (never exposed to the browser).                                                                                  |
| `CRON_SECRET`               | Yes      | Authenticates Vercel Cron calls to `/api/cron/cleanup`. **Vercel does not create it — add it yourself**; without it the cron returns 401. |
| `PUBLIC_SITE_URL`           | No       | Canonical origin for canonical/OG/sitemap URLs. Defaults to `https://evscooterpro.com`.                                                   |
| `GEMINI_API_KEY`            | No       | AI spec extraction in the admin pipeline.                                                                                                 |
| `VITE_SENTRY_DSN`           | No       | Browser error reporting (Sentry loads lazily, only when set).                                                                             |
| `SENTRY_DSN`                | No       | Server error reporting.                                                                                                                   |
| `SENTRY_AUTH_TOKEN`         | No       | Uploads source maps to Sentry during the build.                                                                                           |
| `LOG_LEVEL`                 | No       | `debug` / `info` (default) / `warn`.                                                                                                      |

See `.env.example` for local development.

### Supabase migrations

Run, in order, in the Supabase SQL editor (or `supabase db push`):

1. `supabase-migration.sql` — base tables
2. `supabase/migrations/001_rate_limits_and_nonces.sql`
3. `supabase/migrations/002_atomic_rate_limit.sql`
4. `supabase/migrations/003_security_hardening.sql` — enables row-level security, locks the rate-limit function to the service role, and creates `purchase_links`

All are safe to re-run. If you re-run `002`, re-run `003` afterwards (it re-applies the function's permissions).

### Cron

`vercel.json` schedules `/api/cron/cleanup` daily at 03:00 UTC to remove expired rate-limit windows.

### After deploying

Check the response headers of an admin URL and a public page:

```bash
curl -sI https://evscooterpro.com/admin/login | grep -iE 'cache-control|x-frame-options'   # private, no-store
curl -sI https://evscooterpro.com/rankings  | grep -iE 'cache-control|x-frame-options'   # public, SAMEORIGIN
```

A stricter Content Security Policy runs in report-only mode (`kit.csp` in `svelte.config.js`); violations are logged by `/api/csp-report`. Once the logs are clean, switch it from `reportOnly` to `directives` and remove script `'unsafe-inline'` from the policy in `src/hooks.server.ts`.

## Local production build

```bash
npm run build
npm run preview   # http://localhost:4173
```

`vite preview` runs the build in Node; it doesn't reproduce Vercel's function bundling exactly. CI runs the Playwright suite against it.

## PWA Support

`vite-plugin-pwa` generates a service worker, a web app manifest and precached assets.
