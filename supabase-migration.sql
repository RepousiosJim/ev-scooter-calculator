-- =============================================================================
-- EV Scooter Calc v2 — Supabase Migration
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- =============================================================================

-- 1. Newsletter subscribers
create table if not exists newsletter_subscribers (
  email           text primary key,
  preferences     text[] not null default '{"new_models"}',
  subscribed_at   timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 2. Scooter verifications (replaces verification-store.json)
create table if not exists scooter_verifications (
  scooter_key         text primary key,
  fields              jsonb not null default '{}',
  price_history       jsonb not null default '[]',
  last_updated        timestamptz not null default now(),
  overall_confidence  numeric not null default 0
);

-- 3. Preset candidates (replaces preset-candidates.json)
create table if not exists preset_candidates (
  key               text primary key,
  name              text not null,
  year              integer not null,
  status            text not null default 'pending'
                      check (status in ('pending', 'approved', 'rejected')),
  config            jsonb not null default '{}',
  manufacturer_specs jsonb not null default '{}',
  validation        jsonb not null default '{}',
  sources           jsonb not null default '{}',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 4. Activity log (replaces activity-log.json)
create table if not exists activity_log (
  id          text primary key,
  type        text not null,
  timestamp   timestamptz not null default now(),
  summary     text not null,
  details     jsonb
);
create index if not exists activity_log_timestamp_idx on activity_log (timestamp desc);
create index if not exists activity_log_type_idx on activity_log (type);

-- 5. Discovery runs (replaces discovery-store.json → runs[])
create table if not exists discovery_runs (
  id                  text primary key,
  started_at          timestamptz not null default now(),
  completed_at        timestamptz,
  status              text not null default 'running'
                        check (status in ('running', 'completed', 'failed')),
  manufacturer_ids    text[] not null default '{}',
  total_found         integer not null default 0,
  total_new           integer not null default 0,
  total_known         integer not null default 0,
  candidates_created  integer not null default 0,
  errors              text[] not null default '{}'
);
create index if not exists discovery_runs_started_at_idx on discovery_runs (started_at desc);

-- 6. Discovery entries (replaces discovery-store.json → entries[])
create table if not exists discovery_entries (
  id                text primary key,
  name              text not null,
  url               text not null,
  manufacturer      text not null,
  manufacturer_id   text not null,
  specs             jsonb not null default '{}',
  is_known          boolean not null default false,
  matched_key       text,
  year              integer,
  extraction_method text,
  discovery_run_id  text references discovery_runs (id),
  discovered_at     timestamptz not null default now(),
  candidate_key     text,
  disposition       text check (disposition in ('promoted', 'dismissed'))
);
create index if not exists discovery_entries_run_idx on discovery_entries (discovery_run_id);
create index if not exists discovery_entries_disposition_idx on discovery_entries (disposition);
create index if not exists discovery_entries_discovered_at_idx on discovery_entries (discovered_at desc);

-- 7. URL health (replaces discovery-store.json → urlHealth{})
create table if not exists url_health (
  url                   text primary key,
  last_checked          timestamptz not null default now(),
  last_status           integer not null default 0,
  last_error            text,
  consecutive_failures  integer not null default 0,
  is_disabled           boolean not null default false,
  last_success          timestamptz,
  products_found_last   integer not null default 0
);

-- =============================================================================
-- Row Level Security (RLS)
-- All tables are accessed via service role key only (server-side),
-- so we enable RLS and add a blanket allow for service_role.
-- =============================================================================

alter table newsletter_subscribers enable row level security;
alter table scooter_verifications  enable row level security;
alter table preset_candidates      enable row level security;
alter table activity_log           enable row level security;
alter table discovery_runs         enable row level security;
alter table discovery_entries      enable row level security;
alter table url_health             enable row level security;

-- Service role bypasses RLS automatically — no additional policies needed.
-- If you ever expose these tables to anon/authenticated roles, add policies here.
