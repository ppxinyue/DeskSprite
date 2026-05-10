import type { TimelineCategory, TimelineEntry } from '@/lib/db';

export type BackgroundMarkerWithTime = TimelineEntry['backgroundMarkers'][number] & {
  entryId: number;
  startedAt: string;
  endedAt: string;
};

export const TIMELINE_CATEGORIES: TimelineCategory[] = ['coding', 'chat', 'browser', 'office', 'entertainment', 'other'];

export function getTimelineDurationMs(entry: TimelineEntry): number {
  if (entry.foregroundVisible === false) return 0;
  return Math.max(0, new Date(entry.endedAt).getTime() - new Date(entry.startedAt).getTime());
}

export function getTimelineDayBounds(dateKey: string): { start: number; end: number } {
  const start = new Date(`${dateKey}T00:00:00`).getTime();
  return { start, end: start + 86_400_000 };
}

export function clipTimelineEntriesToDate(dateKey: string, entries: TimelineEntry[]): TimelineEntry[] {
  const { start: dayStart, end: dayEnd } = getTimelineDayBounds(dateKey);
  const clippedEntries: TimelineEntry[] = [];
  for (const entry of entries) {
    const entryStart = new Date(entry.startedAt).getTime();
    const entryEnd = new Date(entry.endedAt).getTime();
    const clippedStart = Math.max(entryStart, dayStart);
    const clippedEnd = Math.min(entryEnd, dayEnd);
    const backgroundMarkers: TimelineEntry['backgroundMarkers'] = [];
    for (const marker of entry.backgroundMarkers) {
      const markerStart = new Date(marker.startedAt ?? entry.startedAt).getTime();
      const markerEnd = new Date(marker.endedAt ?? entry.endedAt).getTime();
      const clippedMarkerStart = Math.max(markerStart, dayStart);
      const clippedMarkerEnd = Math.min(markerEnd, dayEnd);
      if (clippedMarkerEnd <= clippedMarkerStart) continue;
      backgroundMarkers.push({
        ...marker,
        startedAt: new Date(clippedMarkerStart).toISOString(),
        endedAt: new Date(clippedMarkerEnd).toISOString(),
      });
    }

    const hasForeground = clippedEnd > clippedStart;
    if (!hasForeground && backgroundMarkers.length === 0) continue;
    const backgroundStart = hasForeground ? clippedStart : Math.min(...backgroundMarkers.map((marker) => new Date(marker.startedAt ?? entry.startedAt).getTime()));
    const backgroundEnd = hasForeground ? clippedEnd : Math.max(...backgroundMarkers.map((marker) => new Date(marker.endedAt ?? entry.endedAt).getTime()));

    clippedEntries.push({
      ...entry,
      date: dateKey,
      startedAt: new Date(backgroundStart).toISOString(),
      endedAt: new Date(backgroundEnd).toISOString(),
      backgroundMarkers,
      foregroundVisible: hasForeground,
    });
  }
  return clippedEntries.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

export function getVisibleTimelineCategories(entries: TimelineEntry[]): TimelineCategory[] {
  return TIMELINE_CATEGORIES.filter((category) => entries.some((entry) => entry.foregroundVisible !== false && entry.category === category));
}

export function getTimelineCategoryStats(entries: TimelineEntry[]): Record<TimelineCategory, number> {
  const stats = Object.fromEntries(TIMELINE_CATEGORIES.map((category) => [category, 0])) as Record<TimelineCategory, number>;
  for (const entry of entries) {
    stats[entry.category] += getTimelineDurationMs(entry);
  }
  return stats;
}

export function getShortForegroundRows(entries: TimelineEntry[]): BackgroundMarkerWithTime[] {
  return entries
    .flatMap((entry) => entry.backgroundMarkers
      .filter((marker) => marker.type === 'foreground-short')
      .map((marker) => ({
        ...marker,
        entryId: entry.id,
        startedAt: marker.startedAt ?? entry.startedAt,
        endedAt: marker.endedAt ?? entry.endedAt,
      })))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}
