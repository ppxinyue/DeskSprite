const copy = {
  en: {
    navMotion: 'Motion',
    navFeatures: 'Features',
    navDownload: 'Download',
    heroEyebrow: 'PRODUCT / MACOS / AI COMPANION',
    heroSubtitle: 'Not just a desktop companion — a reflection of how you work.',
    heroFootnote: 'Move your cursor. The cats follow.',
    liveUsersLabel: 'Total users',
    liveDownloadsLabel: 'Downloads',
    siteDownloadsLabel: 'Product site',
    motionTitle: 'Lives quietly in the corner. Ready when you are.',
    manifestoLabel: 'WHY IT EXISTS',
    manifestoTitle: 'You have more productivity tools than ever. None of them know what you actually did today.',
    manifestoBody:
      'DeskCat is different — a lightweight desktop AI companion that lives quietly in the corner of your screen, always present, never intrusive.',
    featuresLabel: 'FOUR IN ONE',
    featuresTitle: 'Desktop companion · AI chat · Focus guard · Smart timeline.',
    companionTitle: 'Companion, not clutter',
    companionBody:
      'A customizable desktop pet with its own look and persona. It stays out of your way until you need it.',
    chatTitle: 'AI chat, your way',
    chatBody:
      'Ships with a free built-in model. Plug in any provider you prefer — OpenAI, Claude, or whatever fits your stack.',
    focusTitle: 'Focus mode that actually works',
    focusBody:
      'Switch windows, open a chat app — DeskCat notices and nudges you back. Coding mode turns agent state into quiet color signals.',
    timelineTitle: 'A timeline you did not have to write',
    timelineBody:
      'DeskCat tracks foreground apps, background activity, terminal sessions, and browser tabs, then hands you a daily summary.',
    downloadTitle: 'Choose your Mac.',
    downloadBody:
      'DeskCat is available for both Apple Silicon and Intel Macs. Current builds are ad-hoc signed for early testing.',
    footerLine: 'Desktop companion · AI chat · Focus guard · Smart timeline',
    footerTop: 'Back to top',
  },
  zh: {
    navMotion: '动态',
    navFeatures: '功能',
    navDownload: '下载',
    heroEyebrow: '产品 / MACOS / AI 灵宠',
    heroSubtitle: '不只是桌面宠物，是你工作状态的镜子。',
    heroFootnote: '移动鼠标，猫猫会跟上来。',
    liveUsersLabel: '当前总计用户数',
    liveDownloadsLabel: '下载量',
    siteDownloadsLabel: '产品网站',
    motionTitle: '住在屏幕角落里，安静在线，随时可用。',
    manifestoLabel: '为什么需要它',
    manifestoTitle: '效率工具越来越多，但没有一个真正懂你今天做了什么。',
    manifestoBody:
      'DeskCat 是一款轻量级桌面 AI 助手，住在你屏幕的角落里。它陪你专注、提醒你休息，悄悄记录你一天做了什么。',
    featuresLabel: '四合一',
    featuresTitle: '桌面宠物 · AI 对话 · 专注守护 · 智能记录。',
    companionTitle: '情感陪伴，有温度的存在',
    companionBody: '个性化桌面宠物，支持形象与 persona 定制。它不打扰你，但你需要时它一直在。',
    chatTitle: 'AI 对话，随用随得',
    chatBody: '内置免费模型，开箱即用；也支持自定义接入任意 AI provider，用你熟悉的模型。',
    focusTitle: '专注守护，帮你守住状态',
    focusBody:
      '切屏、打开微信，DeskCat 会轻轻提醒你回来。Coding 模式把 agent 状态变成安静的颜色信号。',
    timelineTitle: '智能记录，读懂你的一天',
    timelineBody:
      '自动追踪前台应用、后台活动、终端会话与浏览记录，每天生成完整时间线与工作摘要。',
    downloadTitle: '选择你的 Mac。',
    downloadBody: 'DeskCat 同时支持 Apple Silicon 和 Intel Mac。当前版本为早期测试构建，已做 ad-hoc 签名。',
    footerLine: '桌面宠物 · AI 对话 · 专注守护 · 智能记录',
    footerTop: '回到顶部',
  },
};

const catAssets = [
  'assets/cats/idle-1.gif',
  'assets/cats/idle-2.gif',
  'assets/cats/idle-3.gif',
  'assets/cats/yawning.gif',
  'assets/cats/sleeping.gif',
  'assets/cats/playing.gif',
  'assets/cats/playing-2.gif',
  'assets/cats/playing-3.gif',
  'assets/cats/drinking.gif',
  'assets/cats/working.gif',
  'assets/cats/idle-clean-1.gif',
  'assets/cats/idle-clean-2.gif',
  'assets/cats/blink.gif',
  'assets/cats/grooming.gif',
  'assets/cats/cat-3448.gif',
  'assets/cats/cat-3449.gif',
  'assets/cats/cat-3450.gif',
  'assets/cats/sleeping-2.gif',
  'assets/cats/rest-3452.gif',
  'assets/cats/rest-3453.gif',
  'assets/cats/rest-3454.gif',
  'assets/cats/rest-3455.gif',
  'assets/cats/rest-3456.gif',
  'assets/cats/rest-3457.gif',
  'assets/cats/rest-3458.gif',
  'assets/cats/rest-idle.gif',
  'assets/cats/peering.png',
  'assets/cats/idle4.png',
  'assets/cats/back.png',
  'assets/cats/happy.png',
];

const revealItems = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  },
  { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
);

for (const item of revealItems) observer.observe(item);

const mediaObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      entry.target.classList.toggle('is-current', entry.isIntersecting);
    }
  },
  { rootMargin: '-18% 0px -18% 0px', threshold: 0.24 },
);

for (const panel of document.querySelectorAll('.media-panel')) mediaObserver.observe(panel);

const languageButton = document.querySelector('[data-lang-toggle]');
let currentLanguage = localStorage.getItem('deskcat-site-lang') || 'en';

function applyLanguage(lang) {
  currentLanguage = lang;
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.body.dataset.lang = lang;
  for (const node of document.querySelectorAll('[data-i18n]')) {
    const key = node.dataset.i18n;
    node.textContent = copy[lang][key] || node.textContent;
  }
  languageButton.textContent = lang === 'en' ? '中文' : 'EN';
  localStorage.setItem('deskcat-site-lang', lang);
}

languageButton.addEventListener('click', () => {
  applyLanguage(currentLanguage === 'en' ? 'zh' : 'en');
});

applyLanguage(currentLanguage);

const totalUsersEl = document.querySelector('[data-total-users]');
const totalDownloadsEl = document.querySelector('[data-total-downloads]');
const productDownloadsEl = document.querySelector('[data-product-downloads]');
const githubDownloadsEl = document.querySelector('[data-github-downloads]');
const publicStatsUrl =
  document.querySelector('meta[name="deskcat-public-stats-url"]')?.content ||
  window.DESKCAT_PUBLIC_STATS_URL ||
  '';

function formatStatNumber(value) {
  return new Intl.NumberFormat(currentLanguage === 'zh' ? 'zh-CN' : 'en-US').format(Number(value || 0));
}

async function refreshPublicStats() {
  if (!publicStatsUrl || !totalUsersEl) return;
  const response = await fetch(publicStatsUrl, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || `Stats failed: ${response.status}`);
  totalUsersEl.textContent = formatStatNumber(data.totalUsers);
  if (totalDownloadsEl) totalDownloadsEl.textContent = formatStatNumber(data.totalDownloads);
  if (productDownloadsEl) productDownloadsEl.textContent = formatStatNumber(data.productSiteDownloads);
  if (githubDownloadsEl) githubDownloadsEl.textContent = formatStatNumber(data.githubDownloads);
}

function trackDownload(link) {
  if (!publicStatsUrl) return;
  const payload = JSON.stringify({
    asset: link.dataset.downloadAsset || link.getAttribute('download') || link.href.split('/').pop(),
    href: link.href,
    locale: currentLanguage,
    referrer: document.referrer || null,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(publicStatsUrl, new Blob([payload], { type: 'application/json' }));
    return;
  }

  fetch(publicStatsUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

refreshPublicStats().catch(() => {
  if (totalUsersEl) totalUsersEl.textContent = '--';
  if (totalDownloadsEl) totalDownloadsEl.textContent = '--';
  if (productDownloadsEl) productDownloadsEl.textContent = '--';
  if (githubDownloadsEl) githubDownloadsEl.textContent = '--';
});
window.setInterval(() => {
  refreshPublicStats().catch(() => {});
}, 30_000);

const trail = document.querySelector('[data-cat-trail]');
const field = document.querySelector('[data-cat-field]');
let lastSpawn = 0;
let assetIndex = 0;
const activeRegions = new Set();
const regionSize = 75;

function spawnCat(x, y) {
  const region = `${Math.round(x / regionSize)}:${Math.round(y / regionSize)}`;
  if (activeRegions.has(region)) return;
  activeRegions.add(region);

  const cat = document.createElement('img');
  cat.className = 'trail-cat';
  cat.src = catAssets[assetIndex % catAssets.length];
  cat.alt = '';
  cat.style.left = `${x}px`;
  cat.style.top = `${y}px`;
  cat.style.setProperty('--dx', `${Math.round(Math.random() * 90 - 45)}px`);
  cat.style.setProperty('--rot', `${Math.round(Math.random() * 36 - 18)}deg`);
  cat.style.width = `${Math.round(96 + Math.random() * 82)}px`;
  cat.style.height = cat.style.width;
  assetIndex += 1;
  trail.append(cat);
  window.setTimeout(() => {
    cat.remove();
    activeRegions.delete(region);
  }, 4400);
}

field.addEventListener('pointermove', (event) => {
  const now = performance.now();
  if (now - lastSpawn < 140) return;
  lastSpawn = now;
  spawnCat(event.clientX, event.clientY);
});

field.addEventListener('pointerenter', (event) => {
  for (let i = 0; i < 4; i += 1) {
    window.setTimeout(() => spawnCat(event.clientX + i * 16, event.clientY + i * 8), i * 70);
  }
});

if (new URLSearchParams(window.location.search).has('demoTrail')) {
  const points = [
    [260, 430],
    [390, 520],
    [560, 470],
    [760, 585],
    [950, 500],
    [1140, 610],
  ];
  points.forEach(([x, y], index) => {
    window.setTimeout(() => spawnCat(x, y), index * 140);
  });
}

for (const link of document.querySelectorAll('.download-button')) {
  link.addEventListener('click', () => {
    trackDownload(link);
    link.animate(
      [
        { transform: 'translateY(-3px) scale(1)' },
        { transform: 'translateY(-3px) scale(0.985)' },
        { transform: 'translateY(-3px) scale(1)' },
      ],
      { duration: 260, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
    );
  });
}
