create table if not exists public.builtin_ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  device_id text null,
  action text not null check (action in ('chat', 'transcribe', 'synthesize')),
  app_version text null,
  unit text not null,
  input_units bigint not null default 0 check (input_units >= 0),
  output_units bigint not null default 0 check (output_units >= 0),
  success boolean not null default true,
  status_code integer null,
  latency_ms bigint not null default 0 check (latency_ms >= 0),
  error_code text null,
  metadata jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create index if not exists builtin_ai_usage_events_received_at_idx
  on public.builtin_ai_usage_events (received_at desc);

create index if not exists builtin_ai_usage_events_device_received_at_idx
  on public.builtin_ai_usage_events (device_id, received_at desc);

create or replace view public.daily_builtin_ai_usage_metrics as
select
  (received_at at time zone 'utc')::date as metric_date,
  action,
  unit,
  count(*) as event_count,
  count(distinct device_id) filter (where device_id is not null) as active_devices,
  coalesce(sum(input_units), 0)::bigint as input_units,
  coalesce(sum(output_units), 0)::bigint as output_units,
  coalesce(sum(latency_ms), 0)::bigint as latency_ms,
  count(*) filter (where success is false) as error_count
from public.builtin_ai_usage_events
group by 1, 2, 3;

alter table public.builtin_ai_usage_events enable row level security;
