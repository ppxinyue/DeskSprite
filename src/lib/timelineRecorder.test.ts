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

function createHarness(minSegmentMs = 60_000, maxSampleGapMs?: number) {
  let nextId = 1;
  const persisted: TimelinePersistPayload[] = [];
  const pushed: Array<{ kind: string; date: string }> = [];
  const logs: TimelineDebugPayload[] = [];
  const recorder = new TimelineRecorder({
    minSegmentMs,
    maxSampleGapMs,
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
  const shortMarkers = persisted.at(-1)?.backgroundMarkers.filter((marker) => marker.type === 'foreground-short') ?? [];
  assert.equal(shortMarkers.length, 1);
  assert.equal(shortMarkers[0].name, 'WeChat');
  assert.equal(pushed.length, 3);
  assert.ok(logs.some((item) => item.stage === 'candidate:discard'));
});

test('keeps multiple short foreground switches as details on the active segment', async () => {
  const { recorder, persisted } = createHarness(10 * 60_000);

  await recorder.handleSnapshot(snapshot('Codex', 'task1'), 0);
  await recorder.handleSnapshot(snapshot('Codex', 'task1'), 10 * 60_000);
  await recorder.handleSnapshot(snapshot('WeChat', '微信'), 11 * 60_000);
  await recorder.handleSnapshot(snapshot('Arc', 'Docs', { url: 'https://example.com/docs' }), 15 * 60_000);
  await recorder.handleSnapshot(snapshot('Codex', 'task1'), 20 * 60_000);
  await recorder.handleSnapshot(snapshot('Codex', 'task1'), 21 * 60_000);

  const latest = persisted.at(-1);
  assert.equal(latest?.appName, 'Codex');
  assert.equal(latest?.startedAt, 0);
  assert.equal(latest?.endedAt, 21 * 60_000);
  const shortMarkers = latest?.backgroundMarkers.filter((marker) => marker.type === 'foreground-short') ?? [];
  assert.equal(shortMarkers.length, 2);
  assert.deepEqual(shortMarkers.map((marker) => marker.name), ['WeChat', 'Arc']);
});

test('keeps repeated short switches to the same app as separate visits', async () => {
  const { recorder, persisted } = createHarness(10 * 60_000);

  await recorder.handleSnapshot(snapshot('Codex', 'task1'), 0);
  await recorder.handleSnapshot(snapshot('Codex', 'task1'), 10 * 60_000);
  await recorder.handleSnapshot(snapshot('WeChat', '微信'), 11 * 60_000);
  await recorder.handleSnapshot(snapshot('Codex', 'task1'), 12 * 60_000);
  await recorder.handleSnapshot(snapshot('Codex', 'task1'), 20 * 60_000);
  await recorder.handleSnapshot(snapshot('WeChat', '微信'), 33 * 60_000);
  await recorder.handleSnapshot(snapshot('Codex', 'task1'), 34 * 60_000);
  await recorder.handleSnapshot(snapshot('Codex', 'task1'), 35 * 60_000);

  const shortMarkers = persisted.at(-1)?.backgroundMarkers.filter((marker) => marker.type === 'foreground-short') ?? [];
  assert.equal(shortMarkers.length, 2);
  assert.deepEqual(shortMarkers.map((marker) => marker.name), ['WeChat', 'WeChat']);
  assert.equal(shortMarkers[0].startedAt, new Date(11 * 60_000).toISOString());
  assert.equal(shortMarkers[0].endedAt, new Date(12 * 60_000).toISOString());
  assert.equal(shortMarkers[1].startedAt, new Date(33 * 60_000).toISOString());
  assert.equal(shortMarkers[1].endedAt, new Date(34 * 60_000).toISOString());
});

test('records DeskCat/Electron foreground as DeskCat activity', async () => {
  const { recorder, persisted } = createHarness();

  await recorder.handleSnapshot(snapshot('Electron', ''), 0);
  await recorder.handleSnapshot(snapshot('Electron', 'Settings'), 60_000);

  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].appName, 'DeskCat');
  assert.equal(persisted[0].windowTitle, 'Settings');
  assert.equal(persisted[0].startedAt, 0);
  assert.equal(persisted[0].endedAt, 60_000);
});

test('keeps background markers sampled while DeskCat is foreground', async () => {
  const { recorder, persisted } = createHarness();

  await recorder.handleSnapshot(snapshot('Electron', 'DeskCat settings', {
    background: [
      { type: 'terminal', name: 'Terminal', detail: 'pnpm electron:dev' },
      { type: 'music', name: 'NeteaseMusic', detail: 'running' },
    ],
  }), 0);
  await recorder.handleSnapshot(snapshot('Electron', 'DeskCat settings', {
    background: [
      { type: 'terminal', name: 'Terminal', detail: 'pnpm electron:dev' },
      { type: 'music', name: 'NeteaseMusic', detail: 'running' },
    ],
  }), 65_000);

  const latest = persisted.at(-1);
  assert.equal(latest?.appName, 'DeskCat');
  assert.equal(latest?.endedAt, 65_000);
  assert.equal(latest?.backgroundMarkers.some((marker) => marker.type === 'terminal' && marker.detail === 'pnpm electron:dev'), true);
  assert.equal(latest?.backgroundMarkers.some((marker) => marker.type === 'music' && marker.name === 'NeteaseMusic'), true);
});

test('does not extend previous foreground duration when DeskCat has not passed the minimum', async () => {
  const { recorder, persisted } = createHarness();

  await recorder.handleSnapshot(snapshot('Codex', 'Codex'), 0);
  await recorder.handleSnapshot(snapshot('Codex', 'Codex'), 65_000);
  await recorder.handleSnapshot(snapshot('Electron', 'DeskCat settings', {
    background: [{ type: 'terminal', name: 'Terminal', detail: 'pnpm electron:dev' }],
  }), 180_000);

  assert.equal(persisted.at(-1)?.startedAt, 0);
  assert.equal(persisted.at(-1)?.endedAt, 65_000);
});

test('confirms a new app only after it passes the minimum duration', async () => {
  const { recorder, persisted, logs } = createHarness();

  await recorder.handleSnapshot(snapshot('Codex', 'task1'), 0);
  await recorder.handleSnapshot(snapshot('Codex', 'task1'), 60_000);
  await recorder.handleSnapshot(snapshot('Visual Studio Code', 'DeskCat'), 85_000);
  await recorder.handleSnapshot(snapshot('Visual Studio Code', 'DeskCat'), 120_000);
  await recorder.handleSnapshot(snapshot('Visual Studio Code', 'DeskCat'), 145_000);
  await recorder.handleSnapshot(snapshot('Visual Studio Code', 'DeskCat'), 205_000);

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

test('extends interleaved terminal and music markers instead of repeatedly pushing duplicates', async () => {
  const { recorder, persisted } = createHarness();

  for (const checkedAt of [0, 60_000, 120_000, 180_000]) {
    await recorder.handleSnapshot(snapshot('Codex', 'task1', {
      background: [
        { type: 'terminal', name: 'Terminal', detail: 'pnpm electron:dev' },
        { type: 'music', name: 'Music', detail: 'Track A - Artist' },
      ],
    }), checkedAt);
  }

  const markers = persisted.at(-1)?.backgroundMarkers ?? [];
  const terminalMarkers = markers.filter((marker) => marker.type === 'terminal' && marker.detail === 'pnpm electron:dev');
  const musicMarkers = markers.filter((marker) => marker.type === 'music' && marker.detail === 'Track A - Artist');
  assert.equal(terminalMarkers.length, 1);
  assert.equal(musicMarkers.length, 1);
  assert.equal(terminalMarkers[0].startedAt, new Date(0).toISOString());
  assert.equal(terminalMarkers[0].endedAt, new Date(180_000).toISOString());
  assert.equal(musicMarkers[0].endedAt, new Date(180_000).toISOString());
});

test('persists short foreground candidate when sampling stops before returning to active app', async () => {
  const { recorder, persisted } = createHarness();

  await recorder.handleSnapshot(snapshot('Codex', 'task1'), 0);
  await recorder.handleSnapshot(snapshot('Codex', 'task1'), 70_000);
  await recorder.handleSnapshot(snapshot('WeChat', '微信'), 90_000);
  await recorder.stop(120_000);

  const latest = persisted.at(-1);
  const shortMarkers = latest?.backgroundMarkers.filter((marker) => marker.type === 'foreground-short') ?? [];
  assert.equal(latest?.appName, 'Codex');
  assert.equal(shortMarkers.length, 1);
  assert.equal(shortMarkers[0].name, 'WeChat');
  assert.equal(shortMarkers[0].startedAt, new Date(90_000).toISOString());
});

test('persists short foreground candidate when DeskCat becomes foreground before returning to active app', async () => {
  const { recorder, persisted } = createHarness();

  await recorder.handleSnapshot(snapshot('Codex', 'task1'), 0);
  await recorder.handleSnapshot(snapshot('Codex', 'task1'), 70_000);
  await recorder.handleSnapshot(snapshot('WeChat', '微信'), 90_000);
  await recorder.handleSnapshot(snapshot('Electron', 'DeskCat settings'), 120_000);

  const shortMarkers = persisted.at(-1)?.backgroundMarkers.filter((marker) => marker.type === 'foreground-short') ?? [];
  assert.equal(shortMarkers.length, 1);
  assert.equal(shortMarkers[0].name, 'WeChat');
});

test('persists background-only markers when no foreground segment can carry them', async () => {
  const { recorder, persisted } = createHarness();

  await recorder.handleBackgroundMarkers([
    { type: 'terminal', name: 'Terminal', detail: 'pnpm electron:dev' },
  ], 0);
  await recorder.handleBackgroundMarkers([
    { type: 'terminal', name: 'Terminal', detail: 'pnpm electron:dev' },
    { type: 'music', name: 'NeteaseMusic', detail: 'running' },
  ], 60_000);

  const latest = persisted.at(-1);
  assert.equal(latest?.foregroundVisible, false);
  assert.equal(latest?.appName, 'Background');
  assert.equal(latest?.backgroundMarkers.some((marker) => marker.type === 'terminal'), true);
  assert.equal(latest?.backgroundMarkers.some((marker) => marker.type === 'music'), true);
});

test('pauses foreground while still extending background markers', async () => {
  const { recorder, persisted } = createHarness();

  await recorder.handleSnapshot(snapshot('Codex', 'Codex', {
    background: [{ type: 'terminal', name: 'Terminal', detail: 'pnpm electron:dev' }],
  }), 0);
  await recorder.handleSnapshot(snapshot('Codex', 'Codex', {
    background: [{ type: 'terminal', name: 'Terminal', detail: 'pnpm electron:dev' }],
  }), 65_000);
  await recorder.pauseForeground(70_000);
  await recorder.handleBackgroundMarkers([
    { type: 'terminal', name: 'Terminal', detail: 'pnpm electron:dev' },
    { type: 'music', name: 'NeteaseMusic', detail: 'playing' },
  ], 130_000);
  recorder.resumeForeground(130_000, 60_000);

  const latest = persisted.at(-1);
  assert.equal(latest?.endedAt, 70_000);
  assert.equal(latest?.backgroundMarkers.some((marker) => marker.type === 'music' && marker.name === 'NeteaseMusic'), true);
  assert.equal(latest?.backgroundMarkers.some((marker) => marker.type === 'terminal' && marker.endedAt === new Date(130_000).toISOString()), true);
});

test('continues foreground after a short pause no longer than the minimum segment duration', async () => {
  const { recorder, persisted, logs } = createHarness(360_000);

  await recorder.handleSnapshot(snapshot('Codex', 'Codex'), 0);
  await recorder.handleSnapshot(snapshot('Codex', 'Codex'), 120_000);
  await recorder.pauseForeground(120_000);
  recorder.resumeForeground(300_000, 360_000);
  await recorder.handleSnapshot(snapshot('Codex', 'Codex'), 390_000);

  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].startedAt, 0);
  assert.equal(persisted[0].endedAt, 390_000);
  assert.ok(logs.some((item) => item.stage === 'resume'));
});

test('splits foreground after a pause longer than the minimum segment duration', async () => {
  const { recorder, persisted, logs } = createHarness(360_000);

  await recorder.handleSnapshot(snapshot('Codex', 'Codex'), 0);
  await recorder.handleSnapshot(snapshot('Codex', 'Codex'), 120_000);
  await recorder.pauseForeground(120_000);
  recorder.resumeForeground(600_001, 360_000);
  await recorder.handleSnapshot(snapshot('Codex', 'Codex'), 600_001);
  await recorder.handleSnapshot(snapshot('Codex', 'Codex'), 960_001);

  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].startedAt, 600_001);
  assert.equal(persisted[0].endedAt, 960_001);
  assert.ok(logs.some((item) => item.stage === 'resume:split'));
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

test('restores an unfinished active segment after sampler restart', async () => {
  const first = createHarness(360_000);

  await first.recorder.handleSnapshot(snapshot('Codex', 'Codex'), 0);
  await first.recorder.handleSnapshot(snapshot('Codex', 'Codex'), 240_000);
  const state = first.recorder.getState();
  await first.recorder.stop(240_000);

  assert.equal(first.persisted.length, 0);

  const persisted: TimelinePersistPayload[] = [];
  const logs: TimelineDebugPayload[] = [];
  const restored = new TimelineRecorder({
    minSegmentMs: 360_000,
    initialState: state,
    log: (payload) => logs.push(payload),
    persist: async (payload): Promise<TimelinePersistResult> => {
      persisted.push({ ...payload, backgroundMarkers: payload.backgroundMarkers.map((marker) => ({ ...marker })) });
      return { id: payload.id ?? 1, date: new Date(payload.endedAt).toISOString().slice(0, 10) };
    },
  });

  await restored.handleSnapshot(snapshot('Codex', 'Codex'), 390_000);

  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].startedAt, 0);
  assert.equal(persisted[0].endedAt, 390_000);
  assert.ok(logs.some((item) => item.stage === 'restore'));
});

test('splits an active segment when sampling resumes after a gap longer than the minimum duration', async () => {
  const { recorder, persisted, logs } = createHarness(60_000, 60_000);
  const resumedAt = 14 * 60 * 60_000;

  await recorder.handleSnapshot(snapshot('Codex', 'Codex'), 0);
  await recorder.handleSnapshot(snapshot('Codex', 'Codex'), 60_000);
  await recorder.handleSnapshot(snapshot('Codex', 'Codex'), resumedAt);
  await recorder.handleSnapshot(snapshot('Codex', 'Codex'), resumedAt + 60_000);

  assert.equal(persisted.length, 3);
  assert.equal(persisted[0].startedAt, 0);
  assert.equal(persisted[0].endedAt, 60_000);
  assert.equal(persisted[1].startedAt, 0);
  assert.equal(persisted[1].endedAt, 60_000);
  assert.equal(persisted[2].startedAt, resumedAt);
  assert.equal(persisted[2].endedAt, resumedAt + 60_000);
  assert.equal(persisted.some((item) => item.startedAt === 0 && item.endedAt === resumedAt), false);
  assert.ok(logs.some((item) => item.stage === 'active:stale-split'));
});
