import assert from 'node:assert/strict';
import test from 'node:test';
import type { TimelineEntry } from './db.ts';
import { clipTimelineEntriesToDate, getShortForegroundRows, getTimelineCategoryStats, getVisibleTimelineCategories } from './timelineView.ts';

function entry(partial: Partial<TimelineEntry>): TimelineEntry {
  return {
    id: partial.id ?? 1,
    date: partial.date ?? '2026-05-11',
    startedAt: partial.startedAt ?? '2026-05-11T00:00:00.000Z',
    endedAt: partial.endedAt ?? '2026-05-11T01:00:00.000Z',
    appName: partial.appName ?? 'Codex',
    windowTitle: partial.windowTitle ?? 'Codex',
    url: partial.url ?? null,
    domain: partial.domain ?? null,
    category: partial.category ?? 'coding',
    backgroundMarkers: partial.backgroundMarkers ?? [],
    foregroundVisible: partial.foregroundVisible,
  };
}

test('clips cross-day background markers into the selected day even when foreground is outside the day', () => {
  const clipped = clipTimelineEntriesToDate('2026-05-11', [
    entry({
      startedAt: '2026-05-10T15:00:00.000Z',
      endedAt: '2026-05-10T15:30:00.000Z',
      backgroundMarkers: [
        {
          type: 'terminal',
          name: 'Terminal',
          detail: 'pnpm electron:dev',
          startedAt: '2026-05-10T15:30:00.000Z',
          endedAt: '2026-05-10T17:00:00.000Z',
        },
      ],
    }),
  ]);

  assert.equal(clipped.length, 1);
  assert.equal(clipped[0].foregroundVisible, false);
  assert.equal(clipped[0].backgroundMarkers.length, 1);
  assert.equal(clipped[0].backgroundMarkers[0].startedAt, '2026-05-10T16:00:00.000Z');
  assert.equal(clipped[0].backgroundMarkers[0].endedAt, '2026-05-10T17:00:00.000Z');
});

test('keeps short foreground switches as detail rows after day clipping', () => {
  const clipped = clipTimelineEntriesToDate('2026-05-11', [
    entry({
      startedAt: '2026-05-11T00:00:00.000Z',
      endedAt: '2026-05-11T00:20:00.000Z',
      backgroundMarkers: [
        {
          type: 'foreground-short',
          name: 'WeChat',
          detail: '微信',
          startedAt: '2026-05-11T00:04:00.000Z',
          endedAt: '2026-05-11T00:05:30.000Z',
        },
      ],
    }),
  ]);
  const shortRows = getShortForegroundRows(clipped);

  assert.equal(shortRows.length, 1);
  assert.equal(shortRows[0].name, 'WeChat');
  assert.equal(shortRows[0].startedAt, '2026-05-11T00:04:00.000Z');
  assert.equal(shortRows[0].endedAt, '2026-05-11T00:05:30.000Z');
});

test('category legend stats are calculated from visible timeline blocks only', () => {
  const stats = getTimelineCategoryStats([
    entry({
      id: 1,
      category: 'coding',
      startedAt: '2026-05-11T00:00:00.000Z',
      endedAt: '2026-05-11T00:30:00.000Z',
    }),
    entry({
      id: 2,
      category: 'browser',
      appName: 'Microsoft Edge',
      startedAt: '2026-05-11T01:00:00.000Z',
      endedAt: '2026-05-11T01:10:00.000Z',
    }),
    entry({
      id: 3,
      category: 'coding',
      foregroundVisible: false,
      startedAt: '2026-05-11T02:00:00.000Z',
      endedAt: '2026-05-11T03:00:00.000Z',
      backgroundMarkers: [
        { type: 'terminal', name: 'Terminal', detail: 'pnpm electron:dev' },
      ],
    }),
  ]);
  const visible = getVisibleTimelineCategories([
    entry({ id: 1, category: 'coding' }),
    entry({ id: 2, category: 'browser', appName: 'Microsoft Edge' }),
    entry({ id: 3, category: 'chat', appName: 'WeChat', foregroundVisible: false }),
  ]);

  assert.equal(stats.coding, 30 * 60_000);
  assert.equal(stats.browser, 10 * 60_000);
  assert.equal(stats.chat, 0);
  assert.deepEqual(visible, ['coding', 'browser']);
});
