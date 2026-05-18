const daysInput = document.querySelector('#days');
const form = document.querySelector('#settings-form');
const statusEl = document.querySelector('#status');
const generatedAtEl = document.querySelector('#generated-at');
const metricsEl = document.querySelector('#metrics');
const dailyChartEl = document.querySelector('#daily-chart');
const dailySummaryEl = document.querySelector('#daily-summary');
const trendChartEl = document.querySelector('#trend-chart');
const featureListEl = document.querySelector('#feature-list');
const featureUserTableEl = document.querySelector('#feature-user-table');
const dailyUserUsageTableEl = document.querySelector('#daily-user-usage-table');
const userListEl = document.querySelector('#user-list');
const userDetailEl = document.querySelector('#user-detail');
const usersSummaryEl = document.querySelector('#users-summary');
const downloadListEl = document.querySelector('#download-list');
const downloadSummaryEl = document.querySelector('#download-summary');
const reachListEl = document.querySelector('#reach-list');
const reachSummaryEl = document.querySelector('#reach-summary');
const eventTableEl = document.querySelector('#event-table');
const worldMapEl = document.querySelector('#world-map');
const mapSummaryEl = document.querySelector('#map-summary');

const storage = {
  days: 'deskcat-dashboard:days',
  selectedUser: 'deskcat-dashboard:selected-user',
};

let selectedUserId = getStored(storage.selectedUser, '');

function getStored(key, fallback = '') {
  return localStorage.getItem(key) || fallback;
}

function setStatus(message, tone = 'muted') {
  statusEl.textContent = message;
  statusEl.style.color = tone === 'error' ? '#d13438' : tone === 'ok' ? '#218358' : '#687076';
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

function formatDuration(ms) {
  const minutes = Math.round(Number(ms || 0) / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
}

function metric(label, value, sub = '') {
  return `
    <article class="metric">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      <div class="sub">${sub}</div>
    </article>
  `;
}

function renderMetrics(data) {
  const totals = data.totals || {};
  metricsEl.innerHTML = [
    metric('Total Users', formatNumber(totals.devices), 'distinct devices'),
    metric('DAU', formatNumber(totals.dau), 'latest active day'),
    metric('Usage Time', formatDuration(totals.durationMs), `capped · ${data.range.days} days`),
    metric('Feature Uses', formatNumber(totals.useCount), 'summed event count'),
    metric('Downloads', formatNumber(totals.downloads), 'website + GitHub'),
    metric('Views', formatNumber(totals.views), 'website + GitHub traffic'),
    metric('GitHub Stars', formatNumber(totals.githubStars), 'repository stars'),
    metric('Events', formatNumber(totals.telemetryEvents), 'raw telemetry'),
    metric('Backups', formatNumber(totals.backups), 'cloud snapshots'),
  ].join('');
}

function renderDaily(data) {
  const rows = data.daily || [];
  if (rows.length === 0) {
    dailyChartEl.innerHTML = '<div class="empty">No daily telemetry yet.</div>';
    dailySummaryEl.textContent = '';
    return;
  }
  const maxDau = Math.max(1, ...rows.map((row) => Number(row.dau || 0)));
  const maxDuration = Math.max(1, ...rows.map((row) => Number(row.total_duration_ms || 0)));
  dailySummaryEl.textContent = `${data.range.days} days`;
  dailyChartEl.innerHTML = `
    ${renderDailySeries(rows, { key: 'dau', label: 'DAU', className: 'views', max: maxDau, format: (value) => formatNumber(Math.round(value)) })}
    ${renderDailySeries(rows, { key: 'total_duration_ms', label: 'Usage Time', className: 'usage', max: maxDuration, format: formatDuration })}
  `;
}

function linePoints(rows, key, width, height, padding, max) {
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (rows.length === 1) {
    const y = padding.top + innerHeight - (Number(rows[0][key] || 0) / max) * innerHeight;
    return `${padding.left},${y} ${width - padding.right},${y}`;
  }
  return rows.map((row, index) => {
    const x = padding.left + (index / Math.max(1, rows.length - 1)) * innerWidth;
    const y = padding.top + innerHeight - (Number(row[key] || 0) / max) * innerHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function renderDailySeries(rows, config) {
  const width = Math.max(520, rows.length * 72);
  const height = 150;
  const padding = { top: 14, right: 22, bottom: 26, left: 62 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const barWidth = Math.min(42, Math.max(12, innerWidth / Math.max(1, rows.length) * 0.58));
  const latest = rows.at(-1) || {};
  const latestValue = Number(latest[config.key] || 0);
  const bars = rows.map((row, index) => {
    const value = Number(row[config.key] || 0);
    const x = padding.left + (index / Math.max(1, rows.length - 1)) * innerWidth - barWidth / 2;
    const barHeight = Math.max(value > 0 ? 2 : 1, (value / config.max) * innerHeight);
    const y = padding.top + innerHeight - barHeight;
    const date = row.metricDate || row.metric_date;
    return `<rect class="daily-bar ${config.className}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="5"><title>${date} · ${config.label} ${config.format(value)}</title></rect>`;
  }).join('');

  return `
    <section class="trend-card">
      <div class="trend-card-head">
        <strong><i class="${config.className}"></i>${config.label}</strong>
        <span>${config.format(latestValue)}</span>
      </div>
      <div class="chart-scroll">
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${config.label} daily chart">
          <line class="chart-axis" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"></line>
          <line class="chart-axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}"></line>
          ${renderAxisLabels(config.max, config.format, height, padding)}
          ${renderDateLabels(rows, width, height, padding)}
          ${bars}
        </svg>
      </div>
    </section>
  `;
}

function renderAxisLabels(max, formatter, height = 220, padding = { top: 18, bottom: 30 }) {
  const innerHeight = height - padding.top - padding.bottom;
  return [max, max / 2, 0].map((value, index) => {
    const y = padding.top + 6 + index * (innerHeight / 2);
    return `<text class="axis-label" x="8" y="${y}">${formatter(value)}</text>`;
  }).join('');
}

function renderDateLabels(rows, width, height, padding) {
  const step = Math.max(1, Math.ceil(rows.length / 8));
  const innerWidth = width - padding.left - padding.right;
  return rows.map((row, index) => {
    if (index % step !== 0 && index !== rows.length - 1) return '';
    const x = padding.left + (index / Math.max(1, rows.length - 1)) * innerWidth;
    const label = String(row.metricDate || row.metric_date).slice(5);
    return `<text class="axis-label x-label" x="${x.toFixed(1)}" y="${height - 7}">${label}</text>`;
  }).join('');
}

function renderTrendSeries(rows, config) {
  const width = Math.max(520, rows.length * 72);
  const height = 150;
  const padding = { top: 14, right: 22, bottom: 26, left: 62 };
  const max = Math.max(1, ...rows.map((row) => Number(row[config.key] || 0)));
  const latest = rows.at(-1) || {};
  const latestValue = Number(latest[config.key] || 0);
  return `
    <section class="trend-card">
      <div class="trend-card-head">
        <strong><i class="${config.className}"></i>${config.label}</strong>
        <span>${config.format(latestValue)}</span>
      </div>
      <div class="chart-scroll">
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${config.label} daily trend">
          <line class="chart-axis" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"></line>
          <line class="chart-axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}"></line>
          ${renderAxisLabels(max, config.format, height, padding)}
          ${renderDateLabels(rows, width, height, padding)}
          <polyline class="trend-line ${config.className}" points="${linePoints(rows, config.key, width, height, padding, max)}"></polyline>
        </svg>
      </div>
    </section>
  `;
}

function renderDailyTrends(data) {
  const rows = data.dailyTrends || [];
  if (rows.length === 0) {
    trendChartEl.innerHTML = '<div class="empty">No daily trend data yet.</div>';
    return;
  }
  trendChartEl.innerHTML = `
    ${renderTrendSeries(rows, { key: 'downloads', label: 'Downloads', className: 'downloads', format: (value) => formatNumber(Math.round(value)) })}
    ${renderTrendSeries(rows, { key: 'views', label: 'Views', className: 'views', format: (value) => formatNumber(Math.round(value)) })}
    ${renderTrendSeries(rows, { key: 'usageMs', label: 'Usage Time', className: 'usage', format: formatDuration })}
  `;
}

function renderFeatures(data) {
  const rows = (data.featureUsage || []).slice(0, 10);
  if (rows.length === 0) {
    featureListEl.innerHTML = '<div class="empty">No feature usage yet.</div>';
    return;
  }
  const max = Math.max(1, ...rows.map((row) => Number(row.durationMs || row.useCount || 0)));
  featureListEl.innerHTML = rows.map((row) => {
    const value = Number(row.durationMs || row.useCount || 0);
    const width = Math.max(3, (value / max) * 100);
    return `
      <div class="feature-row">
        <div class="feature-top">
          <span class="feature-name">${row.feature}</span>
          <span>${formatNumber(row.useCount)} uses · ${formatDuration(row.durationMs)}</span>
        </div>
        <div class="feature-track"><div class="feature-fill" style="width:${width}%"></div></div>
      </div>
    `;
  }).join('');
}

function renderFeatureUsers(data) {
  const rows = data.featureDailyUsers || [];
  if (rows.length === 0) {
    featureUserTableEl.innerHTML = '<tr><td colspan="4" class="empty">No feature users yet.</td></tr>';
    return;
  }
  featureUserTableEl.innerHTML = rows.map((row) => `
    <tr>
      <td>${row.metricDate}</td>
      <td>${row.feature}</td>
      <td>${formatNumber(row.activeDevices)}</td>
      <td>${formatNumber(row.useCount)}</td>
    </tr>
  `).join('');
}

function shortDeviceId(value) {
  const text = String(value || '');
  if (text.length <= 14) return text;
  return `${text.slice(0, 8)}...${text.slice(-4)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatLocation(metadata) {
  const geo = metadata?.geo || {};
  const deviceInfo = metadata?.deviceInfo || {};
  const location = [geo.city, geo.region, geo.country].filter(Boolean).join(', ');
  return location || geo.timezone || deviceInfo.timezone || '';
}

function formatUserMeta(user) {
  const metadata = user.metadata || {};
  const deviceInfo = metadata.deviceInfo || {};
  const parts = [
    user.platform,
    user.appVersion,
    formatLocation(metadata),
    metadata.ip,
    deviceInfo.language,
  ].filter(Boolean);
  return parts.length ? parts.map(escapeHtml).join(' · ') : 'No client metadata yet';
}

function projectMapPoint(lat, lon) {
  return {
    x: ((Number(lon) + 180) / 360) * 1000,
    y: ((90 - Number(lat)) / 180) * 500,
  };
}

function renderWorldMap(data) {
  const locations = data.userLocations || [];
  const totalIps = locations.reduce((total, location) => total + (location.ips?.length || 0), 0);
  mapSummaryEl.textContent = `${formatNumber(locations.length)} locations · ${formatNumber(totalIps)} IPs`;
  if (locations.length === 0) {
    worldMapEl.innerHTML = '<div class="empty">No user IP locations yet. New client syncs will populate this map.</div>';
    return;
  }

  const markers = locations.map((location) => {
    const point = projectMapPoint(location.lat, location.lon);
    const radius = Math.min(18, 6 + Number(location.users || 0) * 3);
    const title = `${location.label}${location.country ? `, ${location.country}` : ''} · ${formatNumber(location.users)} users${location.ips?.length ? ` · ${location.ips.join(', ')}` : ''}`;
    return `
      <g class="map-marker" transform="translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})">
        <circle r="${radius}" tabindex="0">
          <title>${escapeHtml(title)}</title>
        </circle>
        <text y="${-(radius + 7)}">${escapeHtml(location.country || '')}</text>
      </g>
    `;
  }).join('');

  const list = locations.slice(0, 8).map((location) => `
    <div class="map-location">
      <strong>${escapeHtml(location.label)}${location.country ? `, ${escapeHtml(location.country)}` : ''}</strong>
      <span>${formatNumber(location.users)} users${location.timezone ? ` · ${escapeHtml(location.timezone)}` : ''}${location.ips?.length ? ` · ${location.ips.map(escapeHtml).join(', ')}` : ''}</span>
    </div>
  `).join('');

  worldMapEl.innerHTML = `
    <svg viewBox="0 0 1000 500" role="img" aria-label="World map of user IP locations">
      <rect class="map-ocean" width="1000" height="500" rx="8"></rect>
      <path class="map-land" d="M145 130c56-45 147-45 209-8 31 18 37 54 17 81-29 39-85 25-127 46-54 27-120 0-136-48-9-27 10-51 37-71Z"></path>
      <path class="map-land" d="M275 270c46-8 95 18 105 64 11 48-31 89-58 125-32-28-56-68-70-111-11-34-7-70 23-78Z"></path>
      <path class="map-land" d="M455 115c60-35 159-29 213 17 36 30 29 78-14 96-53 22-122-2-164 38-33 31-93 14-113-25-23-45 24-101 78-126Z"></path>
      <path class="map-land" d="M642 140c69-42 180-42 238 10 35 31 24 76-23 91-64 20-141-10-193 29-40 30-91 6-98-40-5-34 28-68 76-90Z"></path>
      <path class="map-land" d="M505 255c50 0 89 36 93 84 4 45-29 82-68 112-38-35-69-84-68-132 1-39 16-64 43-64Z"></path>
      <path class="map-land" d="M770 325c47-23 104-10 130 31 22 35 10 76-26 98-46 28-109 12-132-32-18-36-7-78 28-97Z"></path>
      ${markers}
    </svg>
    <div class="map-list">${list}</div>
  `;
}

function renderDailyUserUsage(data) {
  const rows = data.dailyUserUsageByDay || [];
  if (rows.length === 0) {
    dailyUserUsageTableEl.innerHTML = '<tr><td colspan="5" class="empty">No user usage yet.</td></tr>';
    return;
  }
  dailyUserUsageTableEl.innerHTML = rows.map((row) => `
    <tr>
      <td>${row.metricDate}</td>
      <td>${formatNumber(row.users)}</td>
      <td title="Total ${formatDuration(row.totalDurationMs)} · Raw ${formatDuration(row.rawDurationMs)}">${formatDuration(row.avgDurationMs)}</td>
      <td>${Number(row.avgUses || 0).toFixed(1)}</td>
      <td>${formatNumber(row.events)}</td>
    </tr>
  `).join('');
}

function renderUserDetail(user) {
  if (!user) {
    userDetailEl.innerHTML = '<div class="empty">Select a user to inspect their metrics.</div>';
    return;
  }

  const features = user.features || [];
  const daily = user.daily || [];
  const maxFeature = Math.max(1, ...features.map((row) => Number(row.durationMs || row.useCount || 0)));
  const clientMeta = formatUserMeta(user);

  userDetailEl.innerHTML = `
    <div class="user-detail-head">
      <div>
        <h3 title="${escapeHtml(user.deviceId)}">${shortDeviceId(user.deviceId)}</h3>
        <p>${clientMeta}</p>
      </div>
      <div class="user-seen">
        <span>First ${formatShortDate(user.firstSeenAt)}</span>
        <span>Last ${formatShortDate(user.lastSeenAt)}</span>
      </div>
    </div>

    <div class="user-metrics">
      ${metric('Usage', formatDuration(user.totals?.durationMs), `raw ${formatDuration(user.totals?.rawDurationMs)}`)}
      ${metric('Active Days', formatNumber(user.totals?.activeDays), 'selected range')}
      ${metric('Uses', formatNumber(user.totals?.useCount), 'feature counts')}
      ${metric('Events', formatNumber(user.totals?.eventCount), 'raw events')}
      ${metric('Backups', formatNumber(user.totals?.backups), 'cloud snapshots')}
    </div>

    <div class="user-detail-grid">
      <section>
        <h4>Feature Breakdown</h4>
        <div class="feature-list compact-list">
          ${features.length ? features.slice(0, 8).map((row) => {
            const value = Number(row.durationMs || row.useCount || 0);
            const width = Math.max(3, (value / maxFeature) * 100);
            return `
              <div class="feature-row">
                <div class="feature-top">
                  <span class="feature-name">${row.feature}</span>
                  <span>${formatDuration(row.durationMs)} · ${formatNumber(row.useCount)} uses</span>
                </div>
                <div class="feature-track"><div class="feature-fill" style="width:${width}%"></div></div>
              </div>
            `;
          }).join('') : '<div class="empty">No feature metrics for this range.</div>'}
        </div>
      </section>

      <section>
        <h4>Daily Usage</h4>
        <div class="table-wrap compact user-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Duration</th>
                <th>Uses</th>
                <th>Events</th>
              </tr>
            </thead>
            <tbody>
              ${daily.length ? daily.slice(0, 12).map((row) => `
                <tr>
                  <td>${row.metricDate}</td>
                  <td title="Raw ${formatDuration(row.rawDurationMs)}">${formatDuration(row.durationMs)}</td>
                  <td>${formatNumber(row.useCount)}</td>
                  <td>${formatNumber(row.eventCount)}</td>
                </tr>
              `).join('') : '<tr><td colspan="4" class="empty">No daily usage.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function renderUsers(data) {
  const users = data.users || [];
  usersSummaryEl.textContent = `${formatNumber(users.length)} users`;
  if (users.length === 0) {
    userListEl.innerHTML = '<div class="empty">No users yet.</div>';
    renderUserDetail(null);
    return;
  }

  if (!selectedUserId || !users.some((user) => user.deviceId === selectedUserId)) {
    selectedUserId = users[0].deviceId;
  }
  localStorage.setItem(storage.selectedUser, selectedUserId);
  const selected = users.find((user) => user.deviceId === selectedUserId);

  userListEl.innerHTML = users.map((user) => `
    <button class="user-row ${user.deviceId === selectedUserId ? 'is-active' : ''}" type="button" data-user-id="${user.deviceId}">
      <span title="${user.deviceId}">${shortDeviceId(user.deviceId)}</span>
      <strong>${formatDuration(user.totals?.durationMs)}</strong>
      <small>${formatNumber(user.totals?.eventCount)} events · ${formatNumber(user.totals?.backups)} backups</small>
    </button>
  `).join('');

  for (const button of userListEl.querySelectorAll('[data-user-id]')) {
    button.addEventListener('click', () => {
      selectedUserId = button.dataset.userId;
      localStorage.setItem(storage.selectedUser, selectedUserId);
      renderUsers(data);
    });
  }

  renderUserDetail(selected);
}

function renderDownloads(data) {
  const downloads = data.downloads || {};
  const productSite = downloads.productSite || {};
  const github = downloads.github || {};
  const productAssets = productSite.assets || [];
  const githubAssets = github.assets || [];
  downloadSummaryEl.textContent = `${formatNumber(downloads.total)} total`;

  const rows = [
    {
      label: 'Product website',
      value: productSite.total,
      sub: `${formatNumber(productSite.range)} in selected range`,
    },
    {
      label: `GitHub${github.repo ? ` · ${github.repo}` : ''}`,
      value: github.count,
      sub: github.error || 'release asset downloads',
      level: 0,
    },
    ...productAssets.slice(0, 4).map((asset) => ({
      label: `Website · ${asset.asset}`,
      value: asset.count,
      sub: 'selected range',
      level: 0,
    })),
    ...githubAssets.slice(0, 4).map((asset) => ({
      label: asset.asset,
      value: asset.count,
      sub: `GitHub asset · ${asset.release}`,
      level: 1,
    })),
  ];

  downloadListEl.innerHTML = rows.map((row) => `
    <div class="download-row ${row.level ? 'is-child' : ''}">
      <div>
        <strong>${row.label}</strong>
        <span>${row.sub || ''}</span>
      </div>
      <b>${formatNumber(row.value)}</b>
    </div>
  `).join('');
}

function renderReach(data) {
  const views = data.views || {};
  const productSite = views.productSite || {};
  const github = views.github || {};
  const paths = productSite.paths || [];
  reachSummaryEl.textContent = `${formatNumber(views.total)} total views`;

  const rows = [
    {
      label: 'Product website views',
      value: productSite.total,
      sub: `${formatNumber(productSite.range)} in selected range`,
    },
    {
      label: `GitHub views${github.viewsWindowDays ? ` · ${github.viewsWindowDays} days` : ''}`,
      value: github.views,
      sub: github.viewsError || 'repository traffic views',
    },
    {
      label: 'GitHub unique views',
      value: github.uniqueViews,
      sub: github.viewsError || 'repository traffic uniques',
    },
    {
      label: `GitHub stars${github.repo ? ` · ${github.repo}` : ''}`,
      value: github.stars,
      sub: 'repository stargazers',
    },
    ...paths.slice(0, 4).map((path) => ({
      label: `Website · ${path.path}`,
      value: path.count,
      sub: 'selected range',
    })),
  ];

  reachListEl.innerHTML = rows.map((row) => `
    <div class="download-row">
      <div>
        <strong>${row.label}</strong>
        <span>${row.sub || ''}</span>
      </div>
      <b>${formatNumber(row.value)}</b>
    </div>
  `).join('');
}

function renderEvents(data) {
  const rows = data.eventUsage || [];
  if (rows.length === 0) {
    eventTableEl.innerHTML = '<tr><td colspan="6" class="empty">No events yet.</td></tr>';
    return;
  }
  eventTableEl.innerHTML = rows.map((row) => `
    <tr>
      <td>${row.feature}</td>
      <td>${row.eventName}</td>
      <td>${formatNumber(row.activeDevices)}</td>
      <td>${formatNumber(row.useCount)}</td>
      <td>${formatDuration(row.durationMs)}</td>
      <td>${formatNumber(row.eventCount)}</td>
    </tr>
  `).join('');
}

function render(data) {
  renderMetrics(data);
  renderDaily(data);
  renderDailyTrends(data);
  renderFeatures(data);
  renderFeatureUsers(data);
  renderDailyUserUsage(data);
  renderUsers(data);
  renderDownloads(data);
  renderReach(data);
  renderEvents(data);
  renderWorldMap(data);
  generatedAtEl.textContent = `Generated ${formatDate(data.generatedAt)}`;
}

async function loadDashboard() {
  const days = daysInput.value;
  localStorage.setItem(storage.days, days);

  setStatus('Loading...');
  const url = new URL('/api/metrics', window.location.origin);
  url.searchParams.set('days', days);
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  render(data);
  setStatus('Live', 'ok');
}

daysInput.value = getStored(storage.days, '30');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  loadDashboard().catch((error) => {
    setStatus(error instanceof Error ? error.message : String(error), 'error');
  });
});

loadDashboard().catch(() => {
  setStatus('Dashboard API is not configured.');
});
