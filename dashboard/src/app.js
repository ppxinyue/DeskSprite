const daysInput = document.querySelector('#days');
const form = document.querySelector('#settings-form');
const statusEl = document.querySelector('#status');
const generatedAtEl = document.querySelector('#generated-at');
const metricsEl = document.querySelector('#metrics');
const dailyChartEl = document.querySelector('#daily-chart');
const dailySummaryEl = document.querySelector('#daily-summary');
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
const recentListEl = document.querySelector('#recent-list');

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
  dailyChartEl.innerHTML = rows.map((row) => {
    const dauHeight = Math.max(2, (Number(row.dau || 0) / maxDau) * 184);
    const timeHeight = Math.max(2, (Number(row.total_duration_ms || 0) / maxDuration) * 184);
    const label = String(row.metric_date).slice(5);
    return `
      <div class="bar" title="${row.metric_date} · DAU ${row.dau} · ${formatDuration(row.total_duration_ms)}">
        <div class="bar-stack">
          <div class="bar-dau" style="height:${dauHeight}px"></div>
          <div class="bar-time" style="height:${timeHeight}px"></div>
        </div>
        <div class="bar-label">${label}</div>
      </div>
    `;
  }).join('');
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

function renderDailyUserUsage(data) {
  const rows = data.dailyUserUsage || [];
  if (rows.length === 0) {
    dailyUserUsageTableEl.innerHTML = '<tr><td colspan="5" class="empty">No user usage yet.</td></tr>';
    return;
  }
  dailyUserUsageTableEl.innerHTML = rows.map((row) => `
    <tr>
      <td>${row.metricDate}</td>
      <td title="${row.deviceId}">${shortDeviceId(row.deviceId)}</td>
      <td title="Raw ${formatDuration(row.rawDurationMs)}">${formatDuration(row.durationMs)}</td>
      <td>${formatNumber(row.useCount)}</td>
      <td>${formatNumber(row.eventCount)}</td>
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
  const recent = user.recentEvents || [];
  const maxFeature = Math.max(1, ...features.map((row) => Number(row.durationMs || row.useCount || 0)));

  userDetailEl.innerHTML = `
    <div class="user-detail-head">
      <div>
        <h3 title="${user.deviceId}">${shortDeviceId(user.deviceId)}</h3>
        <p>${user.platform || 'unknown platform'} · ${user.appVersion || 'unknown version'}</p>
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

    <section class="user-recent">
      <h4>Recent Events</h4>
      <div class="recent-list">
        ${recent.length ? recent.slice(0, 8).map((row) => `
          <div class="recent-item">
            <div class="recent-title">${row.feature} · ${row.event_name}</div>
            <div class="recent-meta">${formatDate(row.received_at || row.client_created_at)} · ${formatDuration(row.duration_ms)}</div>
          </div>
        `).join('') : '<div class="empty">No recent events for this user.</div>'}
      </div>
    </section>
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
    },
    ...productAssets.slice(0, 4).map((asset) => ({
      label: `Website · ${asset.asset}`,
      value: asset.count,
      sub: 'selected range',
    })),
    ...githubAssets.slice(0, 4).map((asset) => ({
      label: `GitHub · ${asset.asset}`,
      value: asset.count,
      sub: asset.release,
    })),
  ];

  downloadListEl.innerHTML = rows.map((row) => `
    <div class="download-row">
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

function renderRecent(data) {
  const rows = data.recentEvents || [];
  if (rows.length === 0) {
    recentListEl.innerHTML = '<div class="empty">No recent events.</div>';
    return;
  }
  recentListEl.innerHTML = rows.slice(0, 12).map((row) => `
    <div class="recent-item">
      <div class="recent-title">${row.feature} · ${row.event_name}</div>
      <div class="recent-meta">${formatDate(row.received_at || row.client_created_at)} · ${row.device_id} · ${formatDuration(row.duration_ms)}</div>
    </div>
  `).join('');
}

function render(data) {
  renderMetrics(data);
  renderDaily(data);
  renderFeatures(data);
  renderFeatureUsers(data);
  renderDailyUserUsage(data);
  renderUsers(data);
  renderDownloads(data);
  renderReach(data);
  renderEvents(data);
  renderRecent(data);
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
