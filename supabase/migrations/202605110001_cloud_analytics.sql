create extension if not exists pgcrypto;

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  user_id uuid null,
  platform text null,
  app_version text null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.cloud_backups (
  id uuid primary key default gen_random_uuid(),
  backup_id text not null,
  device_id text not null references public.devices(device_id) on delete cascade,
  reason text not null,
  snapshot jsonb not null,
  client_created_at timestamptz not null,
  received_at timestamptz not null default now(),
  unique (device_id, backup_id)
);

create table if not exists public.telemetry_events (
  id uuid primary key default gen_random_uuid(),
  client_event_id bigint not null,
  device_id text not null references public.devices(device_id) on delete cascade,
  event_name text not null,
  feature text not null,
  count integer not null default 1 check (count > 0),
  duration_ms bigint not null default 0 check (duration_ms >= 0),
  metadata jsonb not null default '{}'::jsonb,
  client_created_at timestamptz not null,
  received_at timestamptz not null default now(),
  unique (device_id, client_event_id)
);

create index if not exists telemetry_events_client_created_at_idx
  on public.telemetry_events (client_created_at desc);

create index if not exists telemetry_events_feature_created_at_idx
  on public.telemetry_events (feature, client_created_at desc);

create index if not exists cloud_backups_device_received_at_idx
  on public.cloud_backups (device_id, received_at desc);

create or replace view public.daily_metrics as
select
  (client_created_at at time zone 'utc')::date as metric_date,
  count(distinct device_id) as dau,
  count(*) as event_count,
  coalesce(sum(count), 0)::bigint as feature_use_count,
  coalesce(sum(duration_ms), 0)::bigint as total_duration_ms
from public.telemetry_events
group by 1;

create or replace view public.daily_feature_metrics as
select
  (client_created_at at time zone 'utc')::date as metric_date,
  feature,
  event_name,
  count(distinct device_id) as active_devices,
  count(*) as event_count,
  coalesce(sum(count), 0)::bigint as use_count,
  coalesce(sum(duration_ms), 0)::bigint as duration_ms
from public.telemetry_events
group by 1, 2, 3;

alter table public.devices enable row level security;
alter table public.cloud_backups enable row level security;
alter table public.telemetry_events enable row level security;

