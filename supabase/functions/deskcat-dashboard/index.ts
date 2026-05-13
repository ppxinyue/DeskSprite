import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type DailyMetric = {
  metric_date: string;
  dau: number;
  event_count: number;
  feature_use_count: number;
  total_duration_ms: number;
};

type DailyFeatureMetric = {
  metric_date: string;
  feature: string;
  event_name: string;
  active_devices: number;
  event_count: number;
  use_count: number;
  duration_ms: number;
};

type RecentEvent = {
  device_id: string;
  event_name: string;
  feature: string;
  count: number;
  duration_ms: number;
  client_created_at: string;
};

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, x-client-info, x-deskcat-dashboard-token, x-desksprite-dashboard-token',
  'access-control-allow-methods': 'GET, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}

function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) throw new Error('Missing Supabase admin environment');
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function requireDashboardToken(req: Request) {
  const expected = Deno.env.get('DESKCAT_DASHBOARD_TOKEN') || Deno.env.get('DESKSPRITE_DASHBOARD_TOKEN');
  if (!expected) throw new Error('Dashboard token is not configured');
  const received = req.headers.get('x-deskcat-dashboard-token') || req.headers.get('x-desksprite-dashboard-token');
  if (received !== expected) throw new Error('Unauthorized dashboard token');
}

function daysAgoDate(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - Math.max(0, days - 1));
  return date.toISOString().slice(0, 10);
}

function parseDays(req: Request) {
  const value = Number(new URL(req.url).searchParams.get('days') ?? 30);
  if (!Number.isFinite(value)) return 30;
  return Math.max(1, Math.min(180, Math.floor(value)));
}

function sum(rows: Array<Record<string, unknown>>, key: string) {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

function aggregateFeatures(rows: DailyFeatureMetric[]) {
  const byFeature = new Map<string, {
    feature: string;
    eventCount: number;
    useCount: number;
    durationMs: number;
    activeDevices: Set<string>;
  }>();
  const byEvent = new Map<string, {
    feature: string;
    eventName: string;
    eventCount: number;
    useCount: number;
    durationMs: number;
    activeDevices: number;
  }>();

  for (const row of rows) {
    const feature = byFeature.get(row.feature) ?? {
      feature: row.feature,
      eventCount: 0,
      useCount: 0,
      durationMs: 0,
      activeDevices: new Set<string>(),
    };
    feature.eventCount += Number(row.event_count ?? 0);
    feature.useCount += Number(row.use_count ?? 0);
    feature.durationMs += Number(row.duration_ms ?? 0);
    feature.activeDevices.add(`${row.metric_date}:${row.active_devices}`);
    byFeature.set(row.feature, feature);

    const eventKey = `${row.feature}:${row.event_name}`;
    const event = byEvent.get(eventKey) ?? {
      feature: row.feature,
      eventName: row.event_name,
      eventCount: 0,
      useCount: 0,
      durationMs: 0,
      activeDevices: 0,
    };
    event.eventCount += Number(row.event_count ?? 0);
    event.useCount += Number(row.use_count ?? 0);
    event.durationMs += Number(row.duration_ms ?? 0);
    event.activeDevices = Math.max(event.activeDevices, Number(row.active_devices ?? 0));
    byEvent.set(eventKey, event);
  }

  return {
    features: Array.from(byFeature.values())
      .map((item) => ({
        feature: item.feature,
        eventCount: item.eventCount,
        useCount: item.useCount,
        durationMs: item.durationMs,
      }))
      .sort((a, b) => b.durationMs - a.durationMs || b.useCount - a.useCount),
    events: Array.from(byEvent.values())
      .sort((a, b) => b.durationMs - a.durationMs || b.useCount - a.useCount),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  try {
    requireDashboardToken(req);
    const supabase = getSupabaseAdmin();
    const days = parseDays(req);
    const startDate = daysAgoDate(days);

    const [
      devices,
      backups,
      telemetry,
      daily,
      featureDaily,
      recent,
    ] = await Promise.all([
      supabase.from('devices').select('device_id', { count: 'exact', head: true }),
      supabase.from('cloud_backups').select('id', { count: 'exact', head: true }),
      supabase.from('telemetry_events').select('id', { count: 'exact', head: true }),
      supabase.from('daily_metrics').select('*').gte('metric_date', startDate).order('metric_date', { ascending: true }),
      supabase.from('daily_feature_metrics').select('*').gte('metric_date', startDate).order('metric_date', { ascending: false }),
      supabase.from('telemetry_events')
        .select('device_id,event_name,feature,count,duration_ms,client_created_at')
        .order('client_created_at', { ascending: false })
        .limit(50),
    ]);

    for (const result of [devices, backups, telemetry, daily, featureDaily, recent]) {
      if (result.error) throw result.error;
    }

    const dailyRows = (daily.data ?? []) as DailyMetric[];
    const featureRows = (featureDaily.data ?? []) as DailyFeatureMetric[];
    const aggregates = aggregateFeatures(featureRows);
    const latestDaily = dailyRows.at(-1);

    return json({
      ok: true,
      generatedAt: new Date().toISOString(),
      range: { days, startDate },
      totals: {
        devices: devices.count ?? 0,
        backups: backups.count ?? 0,
        telemetryEvents: telemetry.count ?? 0,
        dau: Number(latestDaily?.dau ?? 0),
        eventCount: sum(dailyRows as unknown as Array<Record<string, unknown>>, 'event_count'),
        useCount: sum(dailyRows as unknown as Array<Record<string, unknown>>, 'feature_use_count'),
        durationMs: sum(dailyRows as unknown as Array<Record<string, unknown>>, 'total_duration_ms'),
      },
      daily: dailyRows,
      featureUsage: aggregates.features,
      eventUsage: aggregates.events.slice(0, 40),
      recentEvents: (recent.data ?? []) as RecentEvent[],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('Unauthorized') ? 401 : 400;
    return json({ ok: false, error: message }, status);
  }
});
