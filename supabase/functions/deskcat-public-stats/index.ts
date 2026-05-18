import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type StatsPayload = {
  eventType?: string;
  asset?: string;
  href?: string;
  locale?: string;
  referrer?: string;
  path?: string;
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
    assets?: Array<{ name?: string; download_count?: number }>;
  }>;

  const releaseAssetCount = releases.reduce((releaseTotal, release) => {
    const assetTotal = (release.assets ?? [])
      .filter((asset) => String(asset.name ?? '').endsWith('.dmg'))
      .reduce(
        (total, asset) => total + Number(asset.download_count ?? 0),
        0,
      );
    return releaseTotal + assetTotal;
  }, 0);

  let cloneCount = 0;
  let cloneUniqueCount = 0;
  let cloneWindowDays = 14;
  let cloneError: string | null = token ? null : 'GITHUB_TOKEN is not configured';

  if (token) {
    try {
      const clonesResponse = await fetch(`https://api.github.com/repos/${repo}/traffic/clones`, { headers });
      if (!clonesResponse.ok) throw new Error(`GitHub clones request failed: ${clonesResponse.status}`);
      const clonesData = await clonesResponse.json() as {
        count?: number;
        uniques?: number;
        clones?: Array<{ timestamp?: string }>;
      };
      cloneCount = Number(clonesData.count ?? 0);
      cloneUniqueCount = Number(clonesData.uniques ?? 0);
      cloneWindowDays = clonesData.clones?.length || 14;
    } catch (error) {
      cloneError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    count: releaseAssetCount + cloneCount,
    releaseAssetCount,
    cloneCount,
    cloneUniqueCount,
    cloneWindowDays,
    cloneError,
    sourceZipCount: null,
    sourceZipError: 'GitHub API does not expose source ZIP download counts.',
  };
}

async function getGithubRepoStats() {
  const repo = Deno.env.get('DESKCAT_GITHUB_REPO') || Deno.env.get('GITHUB_REPO') || 'ppxinyue/DeskCat';
  const token = Deno.env.get('GITHUB_TOKEN');
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'deskcat-public-stats',
  };
  if (token) headers.authorization = `Bearer ${token}`;

  const repoResponse = await fetch(`https://api.github.com/repos/${repo}`, { headers });
  if (!repoResponse.ok) throw new Error(`GitHub repo request failed: ${repoResponse.status}`);
  const repoData = await repoResponse.json() as { stargazers_count?: number };

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = getSupabaseAdmin();

    if (req.method === 'GET') {
      const [devices, downloads, pageViews, githubDownloads, githubStats] = await Promise.all([
        supabase.from('devices').select('device_id', { count: 'exact', head: true }),
        supabase.from('download_events').select('id', { count: 'exact', head: true }),
        supabase.from('page_view_events').select('id', { count: 'exact', head: true }),
        getGithubDownloads().catch(() => ({
          count: 0,
          releaseAssetCount: 0,
          cloneCount: 0,
          cloneUniqueCount: 0,
          cloneWindowDays: 14,
          sourceZipCount: null,
        })),
        getGithubRepoStats().catch((error) => ({
          repo: Deno.env.get('DESKCAT_GITHUB_REPO') || Deno.env.get('GITHUB_REPO') || 'ppxinyue/DeskCat',
          stars: 0,
          views: 0,
          uniqueViews: 0,
          viewsWindowDays: 14,
          viewsError: error instanceof Error ? error.message : String(error),
        })),
      ]);
      if (devices.error) throw devices.error;
      if (downloads.error) throw downloads.error;
      if (pageViews.error) throw pageViews.error;

      const productSiteDownloads = downloads.count ?? 0;
      const productSiteViews = pageViews.count ?? 0;
      const githubDownloadCount = Number(githubDownloads.count ?? 0);
      const githubViews = Number(githubStats.views ?? 0);
      return json({
        ok: true,
        generatedAt: new Date().toISOString(),
        totalUsers: devices.count ?? 0,
        productSiteDownloads,
        githubDownloads: githubDownloadCount,
        githubDownloadBreakdown: githubDownloads,
        totalDownloads: productSiteDownloads + githubDownloadCount,
        productSiteViews,
        githubViews,
        totalViews: productSiteViews + githubViews,
        githubStars: Number(githubStats.stars ?? 0),
        github: githubStats,
      });
    }

    if (req.method === 'POST') {
      const payload = (await req.json().catch(() => ({}))) as StatsPayload;
      const eventType = safeText(payload.eventType, 32) || 'download';

      if (eventType === 'page_view') {
        const { error } = await supabase.from('page_view_events').insert({
          source: 'product_site',
          path: safeText(payload.path, 500) || '/',
          locale: safeText(payload.locale, 32),
          referrer: safeText(payload.referrer, 500),
          user_agent: safeText(req.headers.get('user-agent'), 500),
        });
        if (error) throw error;

        return json({ ok: true });
      }

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
