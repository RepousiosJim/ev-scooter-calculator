-- Security hardening: lock every app table to the service role.
--
-- The app talks to Supabase only with the service-role key (src/lib/server/db.ts),
-- which bypasses RLS, so enabling RLS with no policies and revoking table
-- privileges from anon/authenticated denies the public API without affecting
-- the app. Safe to re-run.

begin;

-- Tables from 001 were created without RLS.
alter table public.rate_limits enable row level security;
alter table public.revoked_nonces enable row level security;
revoke all on table public.rate_limits, public.revoked_nonces from anon, authenticated;

-- check_rate_limit_atomic (002): Supabase's default privileges grant EXECUTE on
-- new functions directly to anon and authenticated, so revoking from PUBLIC alone
-- is not enough. Pin search_path; the body uses unqualified table names, so an
-- empty search_path would break it. Note: re-running 002's CREATE OR REPLACE
-- resets these settings, so re-apply this migration afterwards.
alter function public.check_rate_limit_atomic(text, integer, bigint, bigint)
  set search_path = pg_catalog, public;
revoke execute on function public.check_rate_limit_atomic(text, integer, bigint, bigint)
  from public, anon, authenticated;
grant execute on function public.check_rate_limit_atomic(text, integer, bigint, bigint)
  to service_role;

-- purchase_links is used by src/lib/server/verification/purchase-links.ts but was
-- never created by a migration. The primary key backs the upsert's
-- onConflict: 'scooter_key,retailer_id'.
create table if not exists public.purchase_links (
  scooter_key       text        not null,
  retailer_id       text        not null,
  retailer_name     text        not null,
  url               text        not null,
  raw_url           text        not null,
  price             numeric(10, 2),
  currency          text        not null default 'USD',
  in_stock          boolean,
  last_checked      timestamptz not null default now(),
  affiliate_network text        not null,
  primary key (scooter_key, retailer_id)
);
alter table public.purchase_links enable row level security;
revoke all on table public.purchase_links from anon, authenticated;

-- Defense in depth for the tables created by supabase-migration.sql.
do $$
declare
  t text;
begin
  foreach t in array array[
    'newsletter_subscribers', 'scooter_verifications', 'preset_candidates',
    'activity_log', 'discovery_runs', 'discovery_entries', 'url_health'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on table public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;

commit;
