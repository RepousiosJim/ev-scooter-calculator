-- Extra source URLs added by the discovery pipeline (approved candidates).
-- Replaces data/dynamic-sources.json, which can't be written on Vercel.
-- Service-role access only, like the other app tables. Safe to re-run.

create table if not exists public.source_urls (
  scooter_key text        not null,
  url         text        not null,
  name        text        not null,
  type        text        not null
                check (type in ('manufacturer', 'retailer', 'review', 'community', 'scrape')),
  created_at  timestamptz not null default now(),
  primary key (scooter_key, url)
);

alter table public.source_urls enable row level security;
revoke all on table public.source_urls from anon, authenticated;
