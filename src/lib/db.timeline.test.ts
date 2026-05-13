import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCloudBackupPayload,
  getDeveloperAnalyticsDashboard,
  getTimelineEntries,
  insertApiConfig,
  recordTelemetryEvent,
  setSetting,
  upsertTimelineEntry,
} from './db.ts';

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  clear() {
    this.store.clear();
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: storage,
  configurable: true,
});

test('timeline query includes entries whose background markers overlap the selected day', async () => {
  storage.clear();
  await upsertTimelineEntry({
    startedAt: new Date('2026-05-10T15:00:00.000Z').getTime(),
    endedAt: new Date('2026-05-10T15:30:00.000Z').getTime(),
    appName: 'Codex',
    windowTitle: 'Codex',
    backgroundMarkers: [
      {
        type: 'terminal',
        name: 'Terminal',
        detail: 'pnpm electron:dev',
        startedAt: '2026-05-10T15:30:00.000Z',
        endedAt: '2026-05-10T17:00:00.000Z',
      },
    ],
  });

  const entries = await getTimelineEntries('2026-05-11');

  assert.equal(entries.length, 1);
  assert.equal(entries[0].backgroundMarkers[0].type, 'terminal');
  assert.equal(entries[0].backgroundMarkers[0].endedAt, '2026-05-10T17:00:00.000Z');
});

test('cloud backup payload redacts provider and settings secrets', async () => {
  storage.clear();

  await insertApiConfig('openai', 'https://api.example.test/v1', 'gpt-test', 'keychain-ref', 1, 'OpenAI', 'openai', 'sk-secret');
  await setSetting('customTtsApiKey', 'tts-secret');

  const payload = await getCloudBackupPayload();

  assert.ok(payload);
  assert.equal(payload.snapshot.apiConfigs[0].api_key, '[redacted]');
  assert.equal(payload.snapshot.apiConfigs[0].keyring_ref, '[keychain]');
  assert.equal(payload.snapshot.settings.customTtsApiKey, '[redacted]');
});

test('developer analytics dashboard aggregates local telemetry without user UI', async () => {
  storage.clear();

  await recordTelemetryEvent({ eventName: 'chat.open', feature: 'chat' });
  await recordTelemetryEvent({ eventName: 'chat.session', feature: 'chat', durationMs: 12_000 });
  await recordTelemetryEvent({ eventName: 'voice.input', feature: 'voice', count: 2 });

  const dashboard = await getDeveloperAnalyticsDashboard(7);

  assert.equal(dashboard.totalUsers, 1);
  assert.equal(dashboard.featureUsage.find((item) => item.feature === 'chat')?.totalCount, 2);
  assert.equal(dashboard.featureUsage.find((item) => item.feature === 'chat')?.totalDurationMs, 12_000);
  assert.equal(dashboard.featureUsage.find((item) => item.feature === 'voice')?.totalCount, 2);
});
