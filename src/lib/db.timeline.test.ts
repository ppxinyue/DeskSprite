import assert from 'node:assert/strict';
import test from 'node:test';
import { getTimelineEntries, upsertTimelineEntry } from './db.ts';

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
