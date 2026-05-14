create table if not exists public.download_events (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('product_site')),
  channel text not null default 'website',
  asset text not null,
  href text null,
  locale text null,
  referrer text null,
  user_agent text null,
  requested_at timestamptz not null default now()
);

create index if not exists download_events_requested_at_idx
  on public.download_events (requested_at desc);

create index if not exists download_events_asset_requested_at_idx
  on public.download_events (asset, requested_at desc);

create or replace view public.daily_feature_user_metrics as
select
  (client_created_at at time zone 'utc')::date as metric_date,
  feature,
  count(distinct device_id) as active_devices,
  count(*) as event_count,
  coalesce(sum(count), 0)::bigint as use_count,
  coalesce(sum(duration_ms), 0)::bigint as duration_ms
from public.telemetry_events
group by 1, 2;

create or replace view public.daily_download_metrics as
select
  (requested_at at time zone 'utc')::date as metric_date,
  source,
  channel,
  asset,
  count(*) as download_count
from public.download_events
group by 1, 2, 3, 4;

alter table public.download_events enable row level security;
