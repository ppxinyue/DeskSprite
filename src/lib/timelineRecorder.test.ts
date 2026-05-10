import assert from 'node:assert/strict';
import test from 'node:test';
import { TimelineRecorder, getTimelineSnapshotKey, type TimelineDebugPayload, type TimelinePersistPayload, type TimelinePersistResult, type TimelineSnapshot } from './timelineRecorder.ts';

function snapshot(appName: string, windowTitle: string, options: Partial<TimelineSnapshot> = {}): TimelineSnapshot {
  return {
    supported: true,
    appName,
    windowTitle,
    url: options.url ?? null,
    background: options.background ?? [],
    error: null,
  };
}

function createHarness(minSegmentMs = 60_000) {
  let nextId = 1;
  const persisted: TimelinePersistPayload[] = [];
  const pushed: Array<{ kind: string; date: string }> = [];
  const logs: TimelineDebugPayload[] = [];
  const recorder = new TimelineRecorder({
    minSegmentMs,
    log: (payload) => logs.push(payload),
    persist: async (payload): Promise<TimelinePersistResult> => {
      persisted.push({ ...payload, backgroundMarkers: payload.backgroundMarkers.map((marker) => ({ ...marker })) });
      const id = payload.id ?? nextId++;
      const date = new Date(payload.endedAt).toISOString().slice(0, 10);
      pushed.push({ kind: 'timeline', date });
      return { id, date };
    },
  });
  return { recorder, persisted, pushed, logs };
}

test('keeps a codex segment intact when user briefly switches to WeChat', async () => {
  const { recorder, persisted, pushed, logs } = createHarness();

  await recorder.handleSnapshot(snapshot('Codex', 'task1'), 0);
  await recorder.handleSnapshot(snapshot('Codex', 'task2'), 60_000);
  await recorder.handleSnapshot(snapshot('WeChat', 'WeChat'), 242_000);
  await recorder.handleSnapshot(snapshot('Codex', 'task2'), 252_000);
  await recorder.handleSnapshot(snapshot('Codex', 'task2'), 1_260_000);

  assert.equal(persisted.length, 3);
  assert.equal(persisted.every((item) => item.appName === 'Codex'), true);
  assert.equal(persisted.at(-1)?.startedAt, 0);
  assert.equal(persisted.at(-1)?.endedAt, 1_260_000);
  assert.equal(pushed.length, 3);
  assert.ok(logs.some((item) => item.stage === 'candidate:discard'));
});

test('confirms a new app only after it passes the minimum duration', async () => {
  const { recorder, persisted, logs } = createHarness();

  await recorder.handleSnapshot(snapshot('Codex', 'task1'), 0);
  await recorder.handleSnapshot(snapshot('Codex', 'task1'), 60_000);
  await recorder.handleSnapshot(snapshot('Visual Studio Code', 'DeskSprite'), 85_000);
  await recorder.handleSnapshot(snapshot('Visual Studio Code', 'DeskSprite'), 120_000);
  await recorder.handleSnapshot(snapshot('Visual Studio Code', 'DeskSprite'), 145_000);
  await recorder.handleSnapshot(snapshot('Visual Studio Code', 'DeskSprite'), 205_000);

  assert.ok(logs.some((item) => item.stage === 'candidate:confirm'));
  assert.equal(persisted[1].appName, 'Codex');
  assert.equal(persisted[1].startedAt, 0);
  assert.equal(persisted[1].endedAt, 85_000);
  assert.equal(persisted.at(-1)?.appName, 'Visual Studio Code');
});

test('uses browser URL path as the stable key so title changes do not split a visit', async () => {
  const { recorder, persisted } = createHarness();

  await recorder.handleSnapshot(snapshot('Arc', 'Docs loading', { url: 'https://example.com/docs' }), 0);
  await recorder.handleSnapshot(snapshot('Arc', 'Docs ready', { url: 'https://example.com/docs' }), 61_000);
  await recorder.handleSnapshot(snapshot('Arc', 'Docs edited title', { url: 'https://example.com/docs' }), 120_000);

  assert.equal(getTimelineSnapshotKey('Arc', 'anything', 'https://example.com/docs?x=1'), 'arc\nhttps://example.com/docs');
  assert.equal(persisted.length, 2);
  assert.equal(persisted.at(-1)?.windowTitle, 'Docs edited title');
  assert.equal(persisted.at(-1)?.startedAt, 0);
});

test('records background music and terminal markers without blocking foreground persistence', async () => {
  const { recorder, persisted } = createHarness();

  await recorder.handleSnapshot(snapshot('Codex', 'task1', {
    background: [
      { type: 'terminal', name: 'Terminal', detail: 'pnpm electron:dev' },
      { type: 'music', name: 'Spotify', detail: 'Track A - Artist' },
    ],
  }), 0);
  await recorder.handleSnapshot(snapshot('Codex', 'task1', {
    background: [
      { type: 'terminal', name: 'Terminal', detail: 'pnpm electron:dev' },
      { type: 'music', name: 'Spotify', detail: 'Track A - Artist' },
    ],
  }), 60_000);
  await recorder.handleSnapshot(snapshot('Codex', 'task1', {
    background: [
      { type: 'terminal', name: 'Terminal', detail: 'pnpm electron:dev' },
      { type: 'music', name: 'Spotify', detail: 'Track B - Artist' },
    ],
  }), 120_000);

  const markers = persisted.at(-1)?.backgroundMarkers ?? [];
  assert.equal(markers.some((marker) => marker.type === 'terminal' && marker.detail === 'pnpm electron:dev'), true);
  assert.equal(markers.some((marker) => marker.type === 'music' && marker.detail === 'Track A - Artist'), true);
  assert.equal(markers.some((marker) => marker.type === 'music' && marker.detail === 'Track B - Artist'), true);
});

test('does not persist unsupported/error snapshots or below-threshold segments', async () => {
  const { recorder, persisted, logs } = createHarness();

  await recorder.handleSnapshot({ supported: true, appName: '', windowTitle: '', error: 'osascript failed' }, 0);
  await recorder.handleSnapshot(snapshot('Codex', 'short'), 10_000);
  await recorder.stop(40_000);

  assert.equal(persisted.length, 0);
  assert.ok(logs.some((item) => item.stage === 'sample:skip'));
  assert.ok(logs.some((item) => item.stage === 'persist:skip'));
});
