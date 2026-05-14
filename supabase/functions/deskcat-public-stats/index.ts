import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type DownloadPayload = {
  asset?: string;
  href?: string;
  locale?: string;
  referrer?: string;
};

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, x-client-info',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
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

function safeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

async function getGithubDownloads() {
  const repo = Deno.env.get('DESKCAT_GITHUB_REPO') || Deno.env.get('GITHUB_REPO') || 'ppxinyue/DeskCat';
  const token = Deno.env.get('GITHUB_TOKEN');
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'deskcat-public-stats',
  };
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=100`, { headers });
  if (!response.ok) throw new Error(`GitHub releases request failed: ${response.status}`);
  const releases = await response.json() as Array<{
    assets?: Array<{ download_count?: number }>;
  }>;

  return releases.reduce((releaseTotal, release) => {
    const assetTotal = (release.assets ?? []).reduce(
      (total, asset) => total + Number(asset.download_count ?? 0),
      0,
    );
    return releaseTotal + assetTotal;
  }, 0);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = getSupabaseAdmin();

    if (req.method === 'GET') {
      const [devices, downloads, githubDownloads] = await Promise.all([
        supabase.from('devices').select('device_id', { count: 'exact', head: true }),
        supabase.from('download_events').select('id', { count: 'exact', head: true }),
        getGithubDownloads().catch(() => 0),
      ]);
      if (devices.error) throw devices.error;
      if (downloads.error) throw downloads.error;

      const productSiteDownloads = downloads.count ?? 0;
      return json({
        ok: true,
        generatedAt: new Date().toISOString(),
        totalUsers: devices.count ?? 0,
        productSiteDownloads,
        githubDownloads,
        totalDownloads: productSiteDownloads + githubDownloads,
      });
    }

    if (req.method === 'POST') {
      const payload = (await req.json().catch(() => ({}))) as DownloadPayload;
      const asset = safeText(payload.asset, 120);
      if (!asset) return json({ ok: false, error: 'Missing asset' }, 400);

      const { error } = await supabase.from('download_events').insert({
        source: 'product_site',
        channel: 'website',
        asset,
        href: safeText(payload.href, 500),
        locale: safeText(payload.locale, 32),
        referrer: safeText(payload.referrer, 500),
        user_agent: safeText(req.headers.get('user-agent'), 500),
      });
      if (error) throw error;

      return json({ ok: true });
    }

    return json({ ok: false, error: 'Method not allowed' }, 405);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ ok: false, error: message }, 400);
  }
});
