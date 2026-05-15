create or replace view public.daily_device_usage_metrics as
select
  (client_created_at at time zone 'utc')::date as metric_date,
  device_id,
  count(*) as event_count,
  coalesce(sum(count), 0)::bigint as use_count,
  coalesce(sum(duration_ms), 0)::bigint as duration_ms,
  min(client_created_at) as first_event_at,
  max(client_created_at) as last_event_at
from public.telemetry_events
group by 1, 2;
