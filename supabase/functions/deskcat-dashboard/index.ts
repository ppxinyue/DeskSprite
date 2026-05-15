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

type DailyFeatureUserMetric = {
  metric_date: string;
  feature: string;
  active_devices: number;
  event_count: number;
  use_count: number;
  duration_ms: number;
};

type DailyDeviceUsageMetric = {
  metric_date: string;
  device_id: string;
  event_count: number;
  use_count: number;
  duration_ms: number;
  first_event_at: string;
  last_event_at: string;
  raw_duration_ms?: number;
};

type DailyDeviceFeatureMetric = {
  metric_date: string;
  device_id: string;
  feature: string;
  event_name: string;
  event_count: number;
  use_count: number;
  duration_ms: number;
  raw_duration_ms?: number;
};

type DeviceMetric = {
  device_id: string;
  platform: string | null;
  app_version: string | null;
  first_seen_at: string;
  last_seen_at: string;
  metadata: Record<string, unknown> | null;
};

type DeviceBackupMetric = {
  device_id: string;
  backup_count: number;
  first_backup_at: string | null;
  last_backup_at: string | null;
};

type UserEventBuilder = {
  eventName: string;
  durationMs: number;
  rawDurationMs: number;
  useCount: number;
  eventCount: number;
};

type UserFeatureBuilder = {
  feature: string;
  durationMs: number;
  rawDurationMs: number;
  useCount: number;
  eventCount: number;
  events: Map<string, UserEventBuilder>;
};

type UserDailyBuilder = {
  metricDate: string;
  durationMs: number;
  rawDurationMs: number;
  useCount: number;
  eventCount: number;
  firstEventAt: string;
  lastEventAt: string;
};

type UserBuilder = {
  deviceId: string;
  platform: string | null;
  appVersion: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  metadata: Record<string, unknown> | null;
  totals: {
    durationMs: number;
    rawDurationMs: number;
    useCount: number;
    eventCount: number;
    activeDays: number;
    backups: number;
  };
  backup: {
    count: number;
    firstBackupAt: string | null;
    lastBackupAt: string | null;
  };
  daily: UserDailyBuilder[];
  features: Map<string, UserFeatureBuilder>;
  recentEvents: RecentEvent[];
};

type DailyDownloadMetric = {
  metric_date: string;
  source: string;
  channel: string;
  asset: string;
  download_count: number;
};

type DailyPageViewMetric = {
  metric_date: string;
  source: string;
  path: string;
  view_count: number;
};

type RecentEvent = {
  device_id: string;
  event_name: string;
  feature: string;
  count: number;
  duration_ms: number;
  client_created_at: string;
  received_at: string;
};

type PublicStatsFallback = {
  ok?: boolean;
  productSiteViews?: number;
  githubViews?: number;
  totalViews?: number;
  githubStars?: number;
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

function addUtcDays(dateText: string, days: number) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
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

function fillDailyRows(rows: DailyMetric[], startDate: string, days: number) {
  const byDate = new Map(rows.map((row) => [row.metric_date, row]));
  return Array.from({ length: days }, (_, index) => {
    const metricDate = addUtcDays(startDate, index);
    return byDate.get(metricDate) ?? {
      metric_date: metricDate,
      dau: 0,
      event_count: 0,
      feature_use_count: 0,
      total_duration_ms: 0,
    };
  });
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

function aggregateDeviceFeatures(rows: DailyDeviceFeatureMetric[]) {
  const byFeature = new Map<string, {
    feature: string;
    eventCount: number;
    useCount: number;
    durationMs: number;
    rawDurationMs: number;
    activeDevices: Set<string>;
  }>();
  const byEvent = new Map<string, {
    feature: string;
    eventName: string;
    eventCount: number;
    useCount: number;
    durationMs: number;
    rawDurationMs: number;
    activeDevices: Set<string>;
  }>();

  for (const row of rows) {
    const durationMs = Number(row.duration_ms ?? 0);
    const rawDurationMs = Number(row.raw_duration_ms ?? row.duration_ms ?? 0);
    const useCount = Number(row.use_count ?? 0);
    const eventCount = Number(row.event_count ?? 0);
    const deviceKey = `${row.metric_date}:${row.device_id}`;

    const feature = byFeature.get(row.feature) ?? {
      feature: row.feature,
      eventCount: 0,
      useCount: 0,
      durationMs: 0,
      rawDurationMs: 0,
      activeDevices: new Set<string>(),
    };
    feature.eventCount += eventCount;
    feature.useCount += useCount;
    feature.durationMs += durationMs;
    feature.rawDurationMs += rawDurationMs;
    feature.activeDevices.add(deviceKey);
    byFeature.set(row.feature, feature);

    const eventKey = `${row.feature}:${row.event_name}`;
    const event = byEvent.get(eventKey) ?? {
      feature: row.feature,
      eventName: row.event_name,
      eventCount: 0,
      useCount: 0,
      durationMs: 0,
      rawDurationMs: 0,
      activeDevices: new Set<string>(),
    };
    event.eventCount += eventCount;
    event.useCount += useCount;
    event.durationMs += durationMs;
    event.rawDurationMs += rawDurationMs;
    event.activeDevices.add(deviceKey);
    byEvent.set(eventKey, event);
  }

  return {
    features: Array.from(byFeature.values())
      .map((item) => ({
        feature: item.feature,
        eventCount: item.eventCount,
        useCount: item.useCount,
        durationMs: item.durationMs,
        rawDurationMs: item.rawDurationMs,
        activeDevices: item.activeDevices.size,
      }))
      .sort((a, b) => b.durationMs - a.durationMs || b.useCount - a.useCount),
    events: Array.from(byEvent.values())
      .map((item) => ({
        feature: item.feature,
        eventName: item.eventName,
        eventCount: item.eventCount,
        useCount: item.useCount,
        durationMs: item.durationMs,
        rawDurationMs: item.rawDurationMs,
        activeDevices: item.activeDevices.size,
      }))
      .sort((a, b) => b.durationMs - a.durationMs || b.useCount - a.useCount),
  };
}

function aggregateFeatureUsers(rows: DailyFeatureUserMetric[]) {
  return rows
    .map((row) => ({
      metricDate: row.metric_date,
      feature: row.feature,
      activeDevices: Number(row.active_devices ?? 0),
      useCount: Number(row.use_count ?? 0),
      eventCount: Number(row.event_count ?? 0),
      durationMs: Number(row.duration_ms ?? 0),
    }))
    .sort((a, b) => String(b.metricDate).localeCompare(String(a.metricDate)) || b.activeDevices - a.activeDevices);
}

function aggregateDeviceUsage(rows: DailyDeviceUsageMetric[]) {
  return rows
    .map((row) => ({
      metricDate: row.metric_date,
      deviceId: row.device_id,
      durationMs: Number(row.duration_ms ?? 0),
      useCount: Number(row.use_count ?? 0),
      eventCount: Number(row.event_count ?? 0),
      firstEventAt: row.first_event_at,
      lastEventAt: row.last_event_at,
      rawDurationMs: Number(row.raw_duration_ms ?? row.duration_ms ?? 0),
    }))
    .sort((a, b) =>
      String(b.metricDate).localeCompare(String(a.metricDate)) ||
      b.durationMs - a.durationMs ||
      String(a.deviceId).localeCompare(String(b.deviceId))
    );
}

function buildUsers(
  devices: DeviceMetric[],
  usageRows: DailyDeviceUsageMetric[],
  featureRows: DailyDeviceFeatureMetric[],
  backupRows: DeviceBackupMetric[],
  recentRows: RecentEvent[],
) {
  const byDevice = new Map<string, UserBuilder>();

  function ensure(deviceId: string) {
    const existing = byDevice.get(deviceId);
    if (existing) return existing;
    const user: UserBuilder = {
      deviceId,
      platform: null,
      appVersion: null,
      firstSeenAt: null,
      lastSeenAt: null,
      metadata: null,
      totals: {
        durationMs: 0,
        rawDurationMs: 0,
        useCount: 0,
        eventCount: 0,
        activeDays: 0,
        backups: 0,
      },
      backup: {
        count: 0,
        firstBackupAt: null,
        lastBackupAt: null,
      },
      daily: [],
      features: new Map(),
      recentEvents: [],
    };
    byDevice.set(deviceId, user);
    return user;
  }

  for (const device of devices) {
    const user = ensure(device.device_id);
    user.platform = device.platform;
    user.appVersion = device.app_version;
    user.firstSeenAt = device.first_seen_at;
    user.lastSeenAt = device.last_seen_at;
    user.metadata = device.metadata ?? null;
  }

  for (const row of usageRows) {
    const user = ensure(row.device_id);
    const durationMs = Number(row.duration_ms ?? 0);
    const rawDurationMs = Number(row.raw_duration_ms ?? row.duration_ms ?? 0);
    const useCount = Number(row.use_count ?? 0);
    const eventCount = Number(row.event_count ?? 0);
    user.totals.durationMs += durationMs;
    user.totals.rawDurationMs += rawDurationMs;
    user.totals.useCount += useCount;
    user.totals.eventCount += eventCount;
    user.daily.push({
      metricDate: row.metric_date,
      durationMs,
      rawDurationMs,
      useCount,
      eventCount,
      firstEventAt: row.first_event_at,
      lastEventAt: row.last_event_at,
    });
  }

  for (const row of featureRows) {
    const user = ensure(row.device_id);
    const feature = user.features.get(row.feature) ?? {
      feature: row.feature,
      durationMs: 0,
      rawDurationMs: 0,
      useCount: 0,
      eventCount: 0,
      events: new Map(),
    };
    const durationMs = Number(row.duration_ms ?? 0);
    const rawDurationMs = Number(row.raw_duration_ms ?? row.duration_ms ?? 0);
    const useCount = Number(row.use_count ?? 0);
    const eventCount = Number(row.event_count ?? 0);
    feature.durationMs += durationMs;
    feature.rawDurationMs += rawDurationMs;
    feature.useCount += useCount;
    feature.eventCount += eventCount;

    const event = feature.events.get(row.event_name) ?? {
      eventName: row.event_name,
      durationMs: 0,
      rawDurationMs: 0,
      useCount: 0,
      eventCount: 0,
    };
    event.durationMs += durationMs;
    event.rawDurationMs += rawDurationMs;
    event.useCount += useCount;
    event.eventCount += eventCount;
    feature.events.set(row.event_name, event);
    user.features.set(row.feature, feature);
  }

  for (const row of backupRows) {
    const user = ensure(row.device_id);
    user.backup = {
      count: Number(row.backup_count ?? 0),
      firstBackupAt: row.first_backup_at,
      lastBackupAt: row.last_backup_at,
    };
    user.totals.backups = Number(row.backup_count ?? 0);
  }

  for (const event of recentRows) {
    const user = ensure(event.device_id);
    user.recentEvents.push(event);
  }

  return Array.from(byDevice.values())
    .map((user) => {
      const daily = user.daily
        .sort((a, b) => String(b.metricDate).localeCompare(String(a.metricDate)));
      const features = Array.from(user.features.values())
        .map((feature) => ({
          feature: feature.feature,
          durationMs: feature.durationMs,
          rawDurationMs: feature.rawDurationMs,
          useCount: feature.useCount,
          eventCount: feature.eventCount,
          events: Array.from(feature.events.values())
            .sort((a, b) => b.durationMs - a.durationMs || b.useCount - a.useCount),
        }))
        .sort((a, b) => b.durationMs - a.durationMs || b.useCount - a.useCount);
      return {
        deviceId: user.deviceId,
        platform: user.platform,
        appVersion: user.appVersion,
        firstSeenAt: user.firstSeenAt,
        lastSeenAt: user.lastSeenAt,
        metadata: user.metadata,
        totals: {
          ...user.totals,
          activeDays: daily.length,
        },
        backup: user.backup,
        daily,
        features,
        recentEvents: user.recentEvents.slice(0, 20),
      };
    })
    .sort((a, b) =>
      b.totals.durationMs - a.totals.durationMs ||
      String(b.lastSeenAt ?? '').localeCompare(String(a.lastSeenAt ?? '')) ||
      String(a.deviceId).localeCompare(String(b.deviceId))
    );
}

function aggregateProductDownloads(rows: DailyDownloadMetric[]) {
  const byAsset = new Map<string, number>();
  for (const row of rows) {
    byAsset.set(row.asset, (byAsset.get(row.asset) ?? 0) + Number(row.download_count ?? 0));
  }
  return {
    count: Array.from(byAsset.values()).reduce((total, value) => total + value, 0),
    assets: Array.from(byAsset.entries())
      .map(([asset, count]) => ({ asset, count }))
      .sort((a, b) => b.count - a.count),
    daily: rows,
  };
}

function aggregateProductViews(rows: DailyPageViewMetric[]) {
  const byPath = new Map<string, number>();
  for (const row of rows) {
    byPath.set(row.path, (byPath.get(row.path) ?? 0) + Number(row.view_count ?? 0));
  }
  return {
    count: Array.from(byPath.values()).reduce((total, value) => total + value, 0),
    paths: Array.from(byPath.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count),
    daily: rows,
  };
}

async function getGithubDownloads() {
  const repo = Deno.env.get('DESKCAT_GITHUB_REPO') || Deno.env.get('GITHUB_REPO') || 'ppxinyue/DeskCat';
  const token = Deno.env.get('GITHUB_TOKEN');
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'deskcat-dashboard',
  };
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=100`, { headers });
  if (!response.ok) throw new Error(`GitHub releases request failed: ${response.status}`);
  const releases = await response.json() as Array<{
    tag_name?: string;
    assets?: Array<{ name?: string; download_count?: number }>;
  }>;

  const assets = releases.flatMap((release) =>
    (release.assets ?? [])
      .filter((asset) => String(asset.name ?? '').endsWith('.dmg'))
      .map((asset) => ({
        release: release.tag_name ?? '',
        asset: asset.name ?? '',
        count: Number(asset.download_count ?? 0),
      }))
  );

  return {
    repo,
    count: assets.reduce((total, asset) => total + asset.count, 0),
    assets: assets.sort((a, b) => b.count - a.count).slice(0, 20),
  };
}

async function getGithubRepoStats() {
  const repo = Deno.env.get('DESKCAT_GITHUB_REPO') || Deno.env.get('GITHUB_REPO') || 'ppxinyue/DeskCat';
  const token = Deno.env.get('GITHUB_TOKEN');
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'deskcat-dashboard',
  };
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(`https://api.github.com/repos/${repo}`, { headers });
  if (!response.ok) throw new Error(`GitHub repo request failed: ${response.status}`);
  const repoData = await response.json() as { stargazers_count?: number };

  let views = 0;
  let uniqueViews = 0;
  let viewsError: string | null = token ? null : 'GITHUB_TOKEN is not configured';
  if (token) {
    try {
      const trafficResponse = await fetch(`https://api.github.com/repos/${repo}/traffic/views`, { headers });
      if (!trafficResponse.ok) throw new Error(`GitHub traffic request failed: ${trafficResponse.status}`);
      const trafficData = await trafficResponse.json() as { count?: number; uniques?: number };
      views = Number(trafficData.count ?? 0);
      uniqueViews = Number(trafficData.uniques ?? 0);
    } catch (error) {
      viewsError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    repo,
    stars: Number(repoData.stargazers_count ?? 0),
    views,
    uniqueViews,
    viewsWindowDays: 14,
    viewsError,
  };
}

async function getPublicStatsFallback(): Promise<PublicStatsFallback | null> {
  const configuredUrl = Deno.env.get('DESKCAT_PUBLIC_STATS_URL');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const derivedUrl = supabaseUrl
    ? `${supabaseUrl.replace('https://', 'https://').replace('.supabase.co', '.functions.supabase.co')}/deskcat-public-stats`
    : null;
  const url = configuredUrl || derivedUrl;
  if (!url) return null;

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'deskcat-dashboard',
    },
  });
  if (!response.ok) throw new Error(`Public stats fallback failed: ${response.status}`);
  const payload = await response.json() as PublicStatsFallback;
  return payload.ok === false ? null : payload;
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
      featureUsersDaily,
      deviceUsageDaily,
      deviceFeatureDaily,
      deviceBackups,
      downloads,
      downloadsTotal,
      pageViews,
      pageViewsTotal,
      publicStats,
      recent,
    ] = await Promise.all([
      supabase.from('devices').select('device_id,platform,app_version,first_seen_at,last_seen_at,metadata', { count: 'exact' }).order('last_seen_at', { ascending: false }),
      supabase.from('cloud_backups').select('id', { count: 'exact', head: true }),
      supabase.from('telemetry_events').select('id', { count: 'exact', head: true }),
      supabase.from('daily_metrics').select('*').gte('metric_date', startDate).order('metric_date', { ascending: true }),
      supabase.from('daily_feature_metrics').select('*').gte('metric_date', startDate).order('metric_date', { ascending: false }),
      supabase.from('daily_feature_user_metrics').select('*').gte('metric_date', startDate).order('metric_date', { ascending: false }),
      supabase.from('daily_device_usage_metrics').select('*').gte('metric_date', startDate).order('metric_date', { ascending: false }).order('duration_ms', { ascending: false }),
      supabase.from('daily_device_feature_metrics').select('*').gte('metric_date', startDate).order('metric_date', { ascending: false }).order('duration_ms', { ascending: false }),
      supabase.from('device_backup_metrics').select('*'),
      supabase.from('daily_download_metrics').select('*').gte('metric_date', startDate).order('metric_date', { ascending: false }),
      supabase.from('download_events').select('id', { count: 'exact', head: true }),
      supabase.from('daily_page_view_metrics').select('*').gte('metric_date', startDate).order('metric_date', { ascending: false }),
      supabase.from('page_view_events').select('id', { count: 'exact', head: true }),
      getPublicStatsFallback().catch(() => null),
      supabase.from('telemetry_events')
        .select('device_id,event_name,feature,count,duration_ms,client_created_at,received_at')
        .gte('received_at', `${startDate}T00:00:00.000Z`)
        .order('received_at', { ascending: false })
        .limit(1000),
    ]);

    for (const result of [
      devices,
      backups,
      telemetry,
      daily,
      featureDaily,
      featureUsersDaily,
      deviceUsageDaily,
      deviceFeatureDaily,
      deviceBackups,
      downloads,
      downloadsTotal,
      pageViews,
      pageViewsTotal,
      recent,
    ]) {
      if (result.error) throw result.error;
    }

    const dailyRows = fillDailyRows((daily.data ?? []) as DailyMetric[], startDate, days);
    const deviceRows = (devices.data ?? []) as DeviceMetric[];
    const featureRows = (featureDaily.data ?? []) as DailyFeatureMetric[];
    const featureUserRows = (featureUsersDaily.data ?? []) as DailyFeatureUserMetric[];
    const deviceUsageRows = (deviceUsageDaily.data ?? []) as DailyDeviceUsageMetric[];
    const deviceFeatureRows = (deviceFeatureDaily.data ?? []) as DailyDeviceFeatureMetric[];
    const deviceBackupRows = (deviceBackups.data ?? []) as DeviceBackupMetric[];
    const downloadRows = (downloads.data ?? []) as DailyDownloadMetric[];
    const pageViewRows = (pageViews.data ?? []) as DailyPageViewMetric[];
    const aggregates = aggregateDeviceFeatures(deviceFeatureRows);
    const productDownloads = aggregateProductDownloads(downloadRows);
    const productViews = aggregateProductViews(pageViewRows);
    const githubDownloads = await getGithubDownloads().catch((error) => ({
      repo: Deno.env.get('DESKCAT_GITHUB_REPO') || Deno.env.get('GITHUB_REPO') || 'ppxinyue/DeskCat',
      count: 0,
      assets: [],
      error: error instanceof Error ? error.message : String(error),
    }));
    const githubStats = await getGithubRepoStats().catch((error) => ({
      repo: Deno.env.get('DESKCAT_GITHUB_REPO') || Deno.env.get('GITHUB_REPO') || 'ppxinyue/DeskCat',
      stars: 0,
      views: 0,
      uniqueViews: 0,
      viewsWindowDays: 14,
      viewsError: error instanceof Error ? error.message : String(error),
    }));
    const latestDaily = dailyRows.at(-1);
    const productSiteViewsTotal = Number(pageViewsTotal.count ?? publicStats?.productSiteViews ?? 0);
    const githubViews = Number(githubStats.views || publicStats?.githubViews || 0);
    const githubStars = Number(githubStats.stars || publicStats?.githubStars || 0);

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
        downloads: Number(downloadsTotal.count ?? 0) + Number(githubDownloads.count ?? 0),
        views: productSiteViewsTotal + githubViews,
        githubStars,
      },
      daily: dailyRows,
      featureUsage: aggregates.features,
      featureDailyUsers: aggregateFeatureUsers(featureUserRows).slice(0, 80),
      dailyUserUsage: aggregateDeviceUsage(deviceUsageRows).slice(0, 200),
      users: buildUsers(
        deviceRows,
        deviceUsageRows,
        deviceFeatureRows,
        deviceBackupRows,
        (recent.data ?? []) as RecentEvent[],
      ),
      eventUsage: aggregates.events.slice(0, 40),
      downloads: {
        productSite: {
          total: downloadsTotal.count ?? 0,
          range: productDownloads.count,
          assets: productDownloads.assets,
          daily: productDownloads.daily,
        },
        github: githubDownloads,
        total: Number(downloadsTotal.count ?? 0) + Number(githubDownloads.count ?? 0),
      },
      views: {
        productSite: {
          total: productSiteViewsTotal,
          range: productViews.count,
          paths: productViews.paths,
          daily: productViews.daily,
        },
        github: {
          ...githubStats,
          views: githubViews,
          stars: githubStars,
        },
        total: productSiteViewsTotal + githubViews,
      },
      recentEvents: (recent.data ?? []) as RecentEvent[],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('Unauthorized') ? 401 : 400;
    return json({ ok: false, error: message }, status);
  }
});
