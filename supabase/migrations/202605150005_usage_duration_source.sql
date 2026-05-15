create or replace view public.daily_device_usage_metrics as
select
  (client_created_at at time zone 'utc')::date as metric_date,
  device_id,
  count(*) as event_count,
  coalesce(sum(count), 0)::bigint as use_count,
  least(
    coalesce(sum(duration_ms) filter (where event_name <> 'timeline.entry'), 0)::bigint,
    86400000::bigint
  ) as duration_ms,
  min(client_created_at) as first_event_at,
  max(client_created_at) as last_event_at,
  coalesce(sum(duration_ms), 0)::bigint as raw_duration_ms
from public.telemetry_events
group by 1, 2;

create or replace view public.daily_metrics as
with event_metrics as (
  select
    (client_created_at at time zone 'utc')::date as metric_date,
    count(distinct device_id) as dau,
    count(*) as event_count,
    coalesce(sum(count), 0)::bigint as feature_use_count
  from public.telemetry_events
  group by 1
),
usage_metrics as (
  select
    metric_date,
    coalesce(sum(duration_ms), 0)::bigint as total_duration_ms
  from public.daily_device_usage_metrics
  group by 1
)
select
  event_metrics.metric_date,
  event_metrics.dau,
  event_metrics.event_count,
  event_metrics.feature_use_count,
  coalesce(usage_metrics.total_duration_ms, 0)::bigint as total_duration_ms
from event_metrics
left join usage_metrics using (metric_date);

create or replace view public.daily_device_feature_metrics as
select
  (client_created_at at time zone 'utc')::date as metric_date,
  device_id,
  feature,
  event_name,
  count(*) as event_count,
  coalesce(sum(count), 0)::bigint as use_count,
  least(
    coalesce(sum(duration_ms) filter (where event_name <> 'timeline.entry'), 0)::bigint,
    86400000::bigint
  ) as duration_ms,
  coalesce(sum(duration_ms), 0)::bigint as raw_duration_ms
from public.telemetry_events
group by 1, 2, 3, 4;
