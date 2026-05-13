function parseDays(value) {
  const days = Number(value || 30);
  if (!Number.isFinite(days)) return 30;
  return Math.max(1, Math.min(180, Math.floor(days)));
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('allow', 'GET');
    return response.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const token = process.env.DASHBOARD_API_TOKEN;
  const endpoint = process.env.DASHBOARD_API_URL;
  if (!token) {
    return response.status(500).json({ ok: false, error: 'DASHBOARD_API_TOKEN is not configured' });
  }
  if (!endpoint) {
    return response.status(500).json({ ok: false, error: 'DASHBOARD_API_URL is not configured' });
  }

  const days = parseDays(request.query.days);
  const url = new URL(endpoint);
  url.searchParams.set('days', String(days));

  try {
    const upstream = await fetch(url, {
      headers: {
        'x-deskcat-dashboard-token': token,
      },
    });
    const payload = await upstream.json();
    response.setHeader('cache-control', 'no-store');
    return response.status(upstream.status).json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return response.status(502).json({ ok: false, error: message });
  }
}
