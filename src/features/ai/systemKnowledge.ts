import { invoke } from '@tauri-apps/api/core';
import type { Message } from './types';

interface DeviceKnowledge {
  appName?: string;
  appVersion?: string;
  platform?: string;
  arch?: string;
  osType?: string;
  osRelease?: string;
  osVersion?: string;
  cpuModel?: string;
  cpuCount?: number;
  totalMemoryBytes?: number;
  freeMemoryBytes?: number;
  uptimeSeconds?: number;
  locale?: string;
  timezone?: string;
  primaryDisplay?: {
    bounds?: { width?: number; height?: number };
    scaleFactor?: number;
  };
  displays?: Array<{
    bounds?: { width?: number; height?: number };
    scaleFactor?: number;
  }>;
}

interface WeatherKnowledge {
  status: 'available' | 'unavailable';
  summary: string;
  source?: 'browser-location' | 'ip-location';
}

interface ScheduleKnowledge {
  calendar?: Array<{
    calendar?: string;
    title?: string;
    startsAt?: string;
    endsAt?: string;
    location?: string;
  }>;
  reminders?: Array<{
    list?: string;
    title?: string;
    dueAt?: string;
  }>;
  calendarStatus?: 'ok' | 'error';
  remindersStatus?: 'ok' | 'error';
  calendarError?: string;
  remindersError?: string;
  error?: string;
}

const SYSTEM_KNOWLEDGE_TRIGGER =
  /(现在|今天|日期|几点|时间|星期|时区|天气|温度|下雨|下雪|风|空气|设备|电脑|系统|mac|windows|屏幕|显示器|内存|cpu|芯片|电量|网络|位置|日历|日程|待办|提醒|会议|安排|calendar|schedule|event|meeting|todo|task|reminder|time|date|today|weather|temperature|rain|snow|wind|device|system|computer|screen|display|memory|cpu|battery|network|timezone)/i;

const WEATHER_TRIGGER = /(天气|温度|下雨|下雪|风|空气|weather|temperature|rain|snow|wind)/i;
const DEVICE_TRIGGER = /(设备|电脑|系统|mac|windows|屏幕|显示器|内存|cpu|芯片|电量|网络|device|system|computer|screen|display|memory|cpu|battery|network)/i;
const SCHEDULE_TRIGGER = /(日历|日程|待办|提醒|会议|安排|calendar|schedule|event|meeting|todo|task|reminder)/i;

let weatherCache: { key: string; value: WeatherKnowledge; expiresAt: number } | null = null;

export function shouldQuerySystemKnowledge(
  messages: Message[],
  enabled: boolean,
): boolean {
  if (!enabled) return false;
  const queryText = getLatestUserQueryText(messages);
  return SYSTEM_KNOWLEDGE_TRIGGER.test(queryText);
}

export async function buildSystemKnowledgePrompt(
  messages: Message[],
  enabled: boolean,
): Promise<string> {
  if (!shouldQuerySystemKnowledge(messages, enabled)) return '';
  const queryText = getLatestUserQueryText(messages);

  const now = new Date();
  const lines = [
    '[System Knowledge Base]',
    'Use this local context only when it is relevant to the user question. If a requested source is unavailable, explain the specific permission/setup issue briefly and continue with any available context. Do not tell the user to "check it yourself".',
    `Current time: ${now.toLocaleString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`,
    `ISO time: ${now.toISOString()}`,
    `Locale: ${navigator.language || 'unknown'}`,
    `Network: ${navigator.onLine ? 'online' : 'offline'}`,
    `User agent: ${navigator.userAgent || 'unknown'}`,
  ];

  if (DEVICE_TRIGGER.test(queryText)) {
    const device = await readDeviceKnowledge();
    if (device) lines.push(...formatDeviceKnowledge(device));
    const battery = await readBatteryKnowledge();
    if (battery) lines.push(battery);
  }

  if (WEATHER_TRIGGER.test(queryText)) {
    const weather = await readWeatherKnowledge();
    lines.push(`Weather: ${weather.summary}`);
  }

  if (SCHEDULE_TRIGGER.test(queryText)) {
    const schedule = await readScheduleKnowledge();
    const scheduleLines = formatScheduleKnowledge(schedule);
    if (scheduleLines.length > 0) lines.push(...scheduleLines);
  }

  return lines.join('\n');
}

async function readBatteryKnowledge(): Promise<string | null> {
  const maybeNavigator = navigator as Navigator & {
    getBattery?: () => Promise<{ charging: boolean; level: number; chargingTime: number; dischargingTime: number }>;
  };
  if (!maybeNavigator.getBattery) return null;
  try {
    const battery = await maybeNavigator.getBattery();
    return `Battery: ${Math.round(battery.level * 100)}%, ${battery.charging ? 'charging' : 'not charging'}`;
  } catch {
    return null;
  }
}

export async function withSystemKnowledge(
  messages: Message[],
  enabled: boolean,
): Promise<Message[]> {
  const context = await buildSystemKnowledgePrompt(messages, enabled);
  if (!context) return messages;
  const firstSystemIndex = messages.findIndex((message) => message.role === 'system');
  if (firstSystemIndex === -1) return [{ role: 'system', content: context }, ...messages];
  return messages.map((message, index) => (
    index === firstSystemIndex
      ? { ...message, content: `${message.content}\n\n${context}` }
      : message
  ));
}

async function readDeviceKnowledge(): Promise<DeviceKnowledge | null> {
  try {
    return await invoke<DeviceKnowledge>('read_system_knowledge_device_info');
  } catch {
    return null;
  }
}

async function readScheduleKnowledge(): Promise<ScheduleKnowledge | null> {
  try {
    return await invoke<ScheduleKnowledge>('read_system_knowledge_schedule_info');
  } catch {
    return null;
  }
}

function formatDeviceKnowledge(device: DeviceKnowledge): string[] {
  const primarySize = device.primaryDisplay?.bounds?.width && device.primaryDisplay?.bounds?.height
    ? `${device.primaryDisplay.bounds.width}x${device.primaryDisplay.bounds.height}@${device.primaryDisplay.scaleFactor || 1}x`
    : 'unknown';
  return [
    `Device: ${device.osType || device.platform || 'unknown'} ${device.osRelease || ''} ${device.arch || ''}`.trim(),
    `App: ${device.appName || 'DeskCat'} ${device.appVersion || ''}`.trim(),
    `CPU: ${device.cpuModel || 'unknown'} (${device.cpuCount || 0} cores)`,
    `Memory: ${formatBytes(device.freeMemoryBytes)} free / ${formatBytes(device.totalMemoryBytes)} total`,
    `Display: ${primarySize}; displays=${device.displays?.length || 0}`,
    `System uptime: ${formatDuration(device.uptimeSeconds || 0)}`,
  ];
}

async function readWeatherKnowledge(): Promise<WeatherKnowledge> {
  const position = await getBrowserPosition() ?? await getIpPosition();
  if (!position) {
    return {
      status: 'unavailable',
      summary: 'unavailable because location could not be resolved. Ask the user to enable Location Services for the app or provide a city name.',
    };
  }
  const cacheKey = `${position.source}:${position.latitude},${position.longitude}`;
  if (weatherCache && weatherCache.key === cacheKey && weatherCache.expiresAt > Date.now()) {
    return weatherCache.value;
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(position.latitude));
  url.searchParams.set('longitude', String(position.longitude));
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,snowfall,weather_code,wind_speed_10m');
  url.searchParams.set('timezone', 'auto');

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 2500);
    const response = await fetch(url, { signal: controller.signal });
    window.clearTimeout(timer);
    if (!response.ok) throw new Error(response.statusText);
    const data = await response.json();
    const current = data.current || {};
    const units = data.current_units || {};
    const value = {
      status: 'available',
      source: position.source,
      summary: [
        `source ${position.source}`,
        `${current.temperature_2m ?? 'unknown'}${units.temperature_2m || 'C'}`,
        `feels like ${current.apparent_temperature ?? 'unknown'}${units.apparent_temperature || 'C'}`,
        `humidity ${current.relative_humidity_2m ?? 'unknown'}${units.relative_humidity_2m || '%'}`,
        `wind ${current.wind_speed_10m ?? 'unknown'}${units.wind_speed_10m || 'km/h'}`,
        `precipitation ${current.precipitation ?? 0}${units.precipitation || 'mm'}`,
      ].join(', '),
    } satisfies WeatherKnowledge;
    weatherCache = { key: cacheKey, value, expiresAt: Date.now() + 10 * 60_000 };
    return value;
  } catch {
    return {
      status: 'unavailable',
      summary: 'unavailable because the weather service request failed. Ask the user for a city or try again later.',
    };
  }
}

function formatScheduleKnowledge(schedule: ScheduleKnowledge | null): string[] {
  if (!schedule) return [
    'Schedule integration status: unavailable. Do not claim to know the user calendar or reminders. Briefly say DeskCat could not read the schedule integration status.',
  ];
  const calendarStatus = schedule.calendarStatus || (schedule.calendarError ? 'error' : 'ok');
  const remindersStatus = schedule.remindersStatus || (schedule.remindersError ? 'error' : 'ok');
  const lines = [
    'Schedule: next 7 days calendar events and next 14 days incomplete reminders, including undated reminders.',
    `Calendar access: ${calendarStatus}.`,
    `Reminders access: ${remindersStatus}.`,
    'If access is ok and no items are listed, say no matching items were found. Do not describe an ok source as inaccessible.',
  ];
  const calendar = (schedule.calendar || []).slice(0, 8);
  const reminders = (schedule.reminders || []).slice(0, 8);

  if (calendarStatus === 'error') {
    lines.push(`Calendar access error: ${schedule.calendarError || schedule.error || 'unknown error'}.`);
  } else if (calendar.length === 0) {
    lines.push('Calendar events: none found in the next 7 days.');
  } else {
    if (calendar.length > 0) {
      lines.push('Calendar events:');
      for (const item of calendar) {
        lines.push(`- ${item.title || 'Untitled'}; ${item.startsAt || 'unknown time'}${item.endsAt ? ` - ${item.endsAt}` : ''}${item.location ? `; location: ${item.location}` : ''}${item.calendar ? `; calendar: ${item.calendar}` : ''}`);
      }
    }
  }

  if (remindersStatus === 'error') {
    lines.push(`Reminders access error: ${schedule.remindersError || schedule.error || 'unknown error'}.`);
  } else if (reminders.length === 0) {
    lines.push('Incomplete reminders: none found in the next 14 days or without a due date.');
  } else {
    if (reminders.length > 0) {
      lines.push('Incomplete reminders:');
      for (const item of reminders) {
        lines.push(`- ${item.title || 'Untitled'}; due: ${item.dueAt || 'undated'}${item.list ? `; list: ${item.list}` : ''}`);
      }
    }
  }

  if (schedule.error && (calendarStatus === 'error' || remindersStatus === 'error')) {
    lines.push(`Schedule access note: ${schedule.error}. Mention only the source marked error; continue using any source marked ok.`);
  }
  return lines;
}

function getLatestUserQueryText(messages: Message[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') return messages[index].content || '';
  }
  return '';
}

function getBrowserPosition(): Promise<{ latitude: number; longitude: number; source: 'browser-location' } | null> {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: Number(position.coords.latitude.toFixed(4)),
        longitude: Number(position.coords.longitude.toFixed(4)),
        source: 'browser-location',
      }),
      () => resolve(null),
      { maximumAge: 30 * 60_000, timeout: 1800, enableHighAccuracy: false },
    );
  });
}

async function getIpPosition(): Promise<{ latitude: number; longitude: number; source: 'ip-location' } | null> {
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 1800);
    const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    window.clearTimeout(timer);
    if (!response.ok) return null;
    const data = await response.json();
    const latitude = Number(data.latitude);
    const longitude = Number(data.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return {
      latitude: Number(latitude.toFixed(4)),
      longitude: Number(longitude.toFixed(4)),
      source: 'ip-location',
    };
  } catch {
    return null;
  }
}

function formatBytes(value?: number): string {
  if (!value || value <= 0) return 'unknown';
  const gb = value / 1024 / 1024 / 1024;
  return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'unknown';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [
    days ? `${days}d` : '',
    hours ? `${hours}h` : '',
    minutes ? `${minutes}m` : '',
  ].filter(Boolean).join(' ') || `${Math.round(seconds)}s`;
}
