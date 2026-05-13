import assert from 'node:assert/strict';
import test from 'node:test';
import { hasPendingCloudSync, recordTelemetryEvent, setSetting } from './db.ts';

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

test('pending cloud sync requires an endpoint and queued data', async () => {
  storage.clear();

  assert.equal(await hasPendingCloudSync(), false);

  await recordTelemetryEvent({ eventName: 'app.open', feature: 'app' });
  assert.equal(await hasPendingCloudSync(), false);

  await setSetting('cloudSyncEndpoint', 'https://example.test/sync');
  assert.equal(await hasPendingCloudSync(), true);
});

