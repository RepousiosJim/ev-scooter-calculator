-- Rate limiting: sliding-window counters per IP
create table if not exists rate_limits (
  key         text primary key,
  count       integer not null default 1,
  window_start bigint not null
);

create index if not exists idx_rate_limits_window on rate_limits (window_start);

-- Session nonce revocation list
create table if not exists revoked_nonces (
  nonce  text primary key,
  expiry bigint not null
);

create index if not exists idx_revoked_nonces_expiry on revoked_nonces (expiry);
