# Cloud Database And Developer Analytics

This is a developer-only data path. It must not appear in the user profile or user settings UI.

## Supabase Landing Plan

1. Create a Supabase project.
2. Apply `supabase/migrations/202605110001_cloud_analytics.sql`.
3. Deploy `supabase/functions/deskcat-sync`.
4. Set the Edge Function secret `DESKCAT_INGEST_TOKEN` for private alpha builds.
5. Store the function URL in local setting `cloudSyncEndpoint`.
6. Store the same private alpha token in local setting `cloudSyncIngestToken`.
7. Trigger `syncCloudBackup()` on app start, periodically, and before app shutdown.

The deployed endpoint will look like:

```text
https://<project-ref>.functions.supabase.co/deskcat-sync
```

Recommended Supabase CLI flow:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
supabase secrets set DESKCAT_INGEST_TOKEN=<private-alpha-token>
supabase functions deploy deskcat-sync --no-verify-jwt
```

`--no-verify-jwt` is intentional for the anonymous-device alpha path. The function still checks `DESKCAT_INGEST_TOKEN` when that secret is configured. Once user login exists, switch the endpoint to Supabase Auth JWT verification and bind devices to authenticated users.

## Client Data Flow

- Local data remains the source of truth during app use.
- Every local mutation queues a redacted cloud backup snapshot by default.
- API keys and keychain references are scrubbed before a backup snapshot is created.
- Settings keys containing `apiKey`, `token`, `secret`, or `password` are scrubbed before a backup snapshot is created.
- Telemetry is stored as append-only local events and uploaded with the next cloud sync.
- Cloud upload is disabled until `cloudSyncEndpoint` is configured in settings storage.

## Client API

- `recordTelemetryEvent(...)`: append a feature event.
- `trackFeatureUse(...)`: small helper for count-based events.
- `createFeatureTimer(...)`: small helper for duration-based events.
- `getCloudSyncStatus()`: inspect local sync state.
- `getCloudBackupPayload()`: inspect the currently queued backup payload.
- `syncCloudBackup(endpoint?)`: POST queued backup and unsynced telemetry to a developer-owned endpoint.
- `getDeveloperAnalyticsDashboard(days?)`: local developer aggregate for smoke testing the dashboard model.

## Upload Payload

```json
{
  "deviceId": "device-or-uuid",
  "backup": {
    "id": "device-or-uuid:2026-05-11T00:00:00.000Z",
    "reason": "chat-message",
    "createdAt": "2026-05-11T00:00:00.000Z",
    "deviceId": "device-or-uuid",
    "snapshot": {}
  },
  "telemetryEvents": [],
  "sentAt": "2026-05-11T00:00:00.000Z"
}
```

## Backend Tables

- `users`: developer account or anonymous install owner.
- `devices`: `device_id`, `user_id`, app version, platform, first seen, last seen.
- `cloud_backups`: immutable backup snapshots keyed by `device_id` and backup id.
- `telemetry_events`: raw append-only events with feature, event name, count, duration, metadata, and created time.
- `daily_metrics`: SQL view for DAU, event count, total usage count, and total duration.
- `daily_feature_metrics`: SQL view for per-feature and per-event usage.

## Dashboard Metrics

- Total users: distinct users or devices, depending on auth readiness.
- DAU: distinct devices with telemetry or backup activity on a local date.
- Usage duration: sum of event `durationMs`.
- Feature usage: grouped by `feature` and `eventName`, including count and duration.
- Retention: active devices by first-seen cohort once the backend has enough history.

## Vercel Dashboard

The developer dashboard lives in `dashboard/`. It is a static Vite app designed for Vercel.

Supabase Edge Function:

```text
https://<project-ref>.functions.supabase.co/deskcat-dashboard
```

Required Supabase secret:

```text
DESKCAT_DASHBOARD_TOKEN
```

Deploy the data API:

```bash
supabase secrets set DESKCAT_DASHBOARD_TOKEN=<private-dashboard-token>
supabase functions deploy deskcat-dashboard --no-verify-jwt
```

Vercel setup:

- Import the GitHub repository in Vercel.
- Set Root Directory to `dashboard`.
- Build Command: `npm run build`.
- Output Directory: `dist`.
- No server-side Vercel environment variables are required for the static build.
- Open the site, paste the dashboard endpoint and dashboard token, then refresh.

The dashboard token is stored only in the browser's local storage for the developer machine using the dashboard.

## Useful Dashboard SQL

Total devices:

```sql
select count(*) as total_devices from public.devices;
```

DAU and duration:

```sql
select * from public.daily_metrics order by metric_date desc limit 30;
```

Feature usage:

```sql
select *
from public.daily_feature_metrics
order by metric_date desc, duration_ms desc, use_count desc
limit 100;
```

Latest backups:

```sql
select device_id, reason, client_created_at, received_at
from public.cloud_backups
order by received_at desc
limit 50;
```
