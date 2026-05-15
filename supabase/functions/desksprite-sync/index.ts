import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type TelemetryEventPayload = {
  id: number;
  eventName: string;
  feature: string;
  count: number;
  durationMs: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

type BackupPayload = {
  id: string;
  reason: string;
  createdAt: string;
  deviceId: string;
  snapshot: Record<string, unknown>;
};

type SyncPayload = {
  deviceId: string;
  platform?: string | null;
  appVersion?: string | null;
  userAgent?: string | null;
  deviceInfo?: Record<string, unknown> | null;
  backup?: BackupPayload | null;
  telemetryEvents?: TelemetryEventPayload[];
  sentAt?: string;
};

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, x-client-info, x-deskcat-device-id, x-deskcat-ingest-token, x-desksprite-device-id, x-desksprite-ingest-token',
  'access-control-allow-methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json',
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

function requireIngestToken(req: Request) {
  const expected = Deno.env.get('DESKCAT_INGEST_TOKEN') || Deno.env.get('DESKSPRITE_INGEST_TOKEN');
  if (!expected) return;
  const received = req.headers.get('x-deskcat-ingest-token') || req.headers.get('x-desksprite-ingest-token');
  if (received !== expected) throw new Error('Unauthorized ingest token');
}

function assertPayload(value: unknown): SyncPayload {
  if (!value || typeof value !== 'object') throw new Error('Invalid payload');
  const payload = value as SyncPayload;
  if (!payload.deviceId || typeof payload.deviceId !== 'string') throw new Error('Missing deviceId');
  if (payload.telemetryEvents && !Array.isArray(payload.telemetryEvents)) throw new Error('Invalid telemetryEvents');
  return payload;
}

function safeText(value: unknown, maxLength = 200) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : null;
}

function getRequestIp(req: Request) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const firstForwarded = forwardedFor?.split(',')[0]?.trim();
  return (
    safeText(req.headers.get('cf-connecting-ip'), 80) ||
    safeText(req.headers.get('x-real-ip'), 80) ||
    safeText(firstForwarded, 80)
  );
}

function getRequestGeo(req: Request) {
  return {
    city: safeText(req.headers.get('x-vercel-ip-city') || req.headers.get('cf-ipcity'), 120),
    region: safeText(req.headers.get('x-vercel-ip-country-region') || req.headers.get('cf-region'), 120),
    country: safeText(req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry'), 20),
    timezone: safeText(req.headers.get('x-vercel-ip-timezone') || req.headers.get('cf-timezone'), 120),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    requireIngestToken(req);
    const payload = assertPayload(await req.json());
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const platform = safeText(payload.platform);
    const appVersion = safeText(payload.appVersion, 80);
    const userAgent = safeText(payload.userAgent, 500);
    const ip = getRequestIp(req);
    const geo = getRequestGeo(req);

    const { error: deviceError } = await supabase
      .from('devices')
      .upsert({
        device_id: payload.deviceId,
        ...(platform ? { platform } : {}),
        ...(appVersion ? { app_version: appVersion } : {}),
        last_seen_at: now,
        metadata: {
          source: 'deskcat',
          sentAt: payload.sentAt ?? null,
          userAgent,
          ip,
          geo,
          deviceInfo: payload.deviceInfo && typeof payload.deviceInfo === 'object' ? payload.deviceInfo : null,
          headerDeviceId: req.headers.get('x-deskcat-device-id') || req.headers.get('x-desksprite-device-id'),
        },
      }, { onConflict: 'device_id' });
    if (deviceError) throw deviceError;

    let backupInserted = false;
    if (payload.backup) {
      const { error: backupError } = await supabase
        .from('cloud_backups')
        .upsert({
          backup_id: payload.backup.id,
          device_id: payload.deviceId,
          reason: payload.backup.reason,
          snapshot: payload.backup.snapshot,
          client_created_at: payload.backup.createdAt,
        }, { onConflict: 'device_id,backup_id', ignoreDuplicates: true });
      if (backupError) throw backupError;
      backupInserted = true;
    }

    const telemetryEvents = payload.telemetryEvents ?? [];
    if (telemetryEvents.length > 0) {
      const rows = telemetryEvents.map((event) => ({
        client_event_id: event.id,
        device_id: payload.deviceId,
        event_name: event.eventName,
        feature: event.feature,
        count: Math.max(1, Math.floor(Number(event.count) || 1)),
        duration_ms: Math.max(0, Math.floor(Number(event.durationMs) || 0)),
        metadata: event.metadata ?? {},
        client_created_at: event.createdAt,
      }));
      const { error: telemetryError } = await supabase
        .from('telemetry_events')
        .upsert(rows, { onConflict: 'device_id,client_event_id', ignoreDuplicates: true });
      if (telemetryError) throw telemetryError;
    }

    return json({
      ok: true,
      deviceId: payload.deviceId,
      backupInserted,
      telemetryReceived: telemetryEvents.length,
      receivedAt: now,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('Unauthorized') ? 401 : 400;
    return json({ ok: false, error: message }, status);
  }
});
