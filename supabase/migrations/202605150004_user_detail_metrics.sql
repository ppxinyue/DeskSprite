create or replace view public.daily_device_feature_metrics as
select
  (client_created_at at time zone 'utc')::date as metric_date,
  device_id,
  feature,
  event_name,
  count(*) as event_count,
  coalesce(sum(count), 0)::bigint as use_count,
  least(coalesce(sum(duration_ms), 0)::bigint, 86400000::bigint) as duration_ms,
  coalesce(sum(duration_ms), 0)::bigint as raw_duration_ms
from public.telemetry_events
group by 1, 2, 3, 4;

create or replace view public.device_backup_metrics as
select
  device_id,
  count(*) as backup_count,
  min(client_created_at) as first_backup_at,
  max(client_created_at) as last_backup_at
from public.cloud_backups
group by 1;
