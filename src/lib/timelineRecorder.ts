export type TimelineBackgroundMarker = {
  type: string;
  name: string;
  detail: string;
  startedAt?: string;
  endedAt?: string;
};

export type TimelineSnapshot = {
  supported: boolean;
  appName: string;
  windowTitle: string;
  url?: string | null;
  background?: TimelineBackgroundMarker[];
  error?: string | null;
};

export type TimelinePersistPayload = {
  id: number | null;
  startedAt: number;
  endedAt: number;
  appName: string;
  windowTitle: string;
  url: string | null;
  backgroundMarkers: TimelineBackgroundMarker[];
  foregroundVisible?: boolean;
};

export type TimelinePersistResult = {
  id: number;
  date: string;
} | null;

export type TimelineDebugPayload = Record<string, unknown> & {
  stage: string;
};

export type TimelineRecorderState = {
  active: TimelineSegmentState;
  candidate: TimelineSegmentState;
  paused: TimelineSegmentState;
};

const DESKCAT_TIMELINE_APPS = new Set(['deskcat', 'pawpal', 'electron']);

type TimelineSegmentState = {
  key: string;
  firstSeenAt: number;
  lastSeenAt: number;
  segmentId: number | null;
  appName: string;
  windowTitle: string;
  url: string | null;
  backgroundMarkers: TimelineBackgroundMarker[];
};

export function getTimelineSnapshotKey(appName: string, windowTitle: string, url: string | null) {
  const normalizedApp = appName.trim().toLowerCase();
  const normalizedUrl = url?.trim();
  if (normalizedUrl) {
    try {
      const parsed = new URL(normalizedUrl);
      return `${normalizedApp}\n${parsed.origin}${parsed.pathname}`;
    } catch {
      return `${normalizedApp}\n${normalizedUrl}`;
    }
  }
  const browserLike = /(safari|chrome|chromium|brave|edge|arc|firefox|vivaldi)/i.test(appName);
  if (browserLike && windowTitle.trim()) return `${normalizedApp}\n${windowTitle.trim().toLowerCase()}`;
  return normalizedApp;
}

function emptySegment(): TimelineSegmentState {
  return {
    key: '',
    firstSeenAt: 0,
    lastSeenAt: 0,
    segmentId: null,
    appName: '',
    windowTitle: '',
    url: null,
    backgroundMarkers: [],
  };
}

function mergeBackgroundMarkers(
  existing: TimelineBackgroundMarker[],
  next: TimelineBackgroundMarker[] | undefined,
  checkedAt: number,
) {
  if (!next || next.length === 0) return existing;
  const checkedIso = new Date(checkedAt).toISOString();
  const merged = existing.slice();
  for (const marker of next) {
    const previous = findLastMatchingBackgroundMarker(merged, marker);
    if (previous && previous.type === marker.type && previous.name === marker.name && previous.detail === marker.detail) {
      previous.endedAt = checkedIso;
    } else {
      merged.push({ ...marker, startedAt: checkedIso, endedAt: checkedIso });
    }
  }
  return merged.slice(-24);
}

function findLastMatchingBackgroundMarker(markers: TimelineBackgroundMarker[], marker: TimelineBackgroundMarker) {
  for (let index = markers.length - 1; index >= 0; index -= 1) {
    const candidate = markers[index];
    if (candidate.type === marker.type && candidate.name === marker.name && candidate.detail === marker.detail) return candidate;
  }
  return null;
}

function normalizeTimelineForeground(appName: string, windowTitle: string, url: string | null) {
  const normalizedApp = appName.trim().toLowerCase();
  if (!DESKCAT_TIMELINE_APPS.has(normalizedApp)) return { appName, windowTitle, url };
  return {
    appName: 'DeskCat',
    windowTitle: windowTitle || 'DeskCat',
    url: null,
  };
}

function mergeRecordedBackgroundMarkers(existing: TimelineBackgroundMarker[], next: TimelineBackgroundMarker[]) {
  if (next.length === 0) return existing;
  const merged = existing.slice();
  for (const marker of next) {
    const previous = findLastMatchingBackgroundMarker(merged, marker);
    if (previous) {
      if (marker.startedAt && (!previous.startedAt || marker.startedAt < previous.startedAt)) previous.startedAt = marker.startedAt;
      if (marker.endedAt && (!previous.endedAt || marker.endedAt > previous.endedAt)) previous.endedAt = marker.endedAt;
    } else {
      merged.push({ ...marker });
    }
  }
  return merged.slice(-24);
}

function appendShortForegroundMarker(
  existing: TimelineBackgroundMarker[],
  segment: TimelineSegmentState,
  endedAt: number,
) {
  if (!segment.key) return existing;
  const start = segment.firstSeenAt;
  const end = Math.max(segment.lastSeenAt || start, endedAt);
  if (end <= start) return existing;
  const detail = segment.url || segment.windowTitle || segment.appName;
  const marker: TimelineBackgroundMarker = {
    type: 'foreground-short',
    name: segment.appName,
    detail,
    startedAt: new Date(start).toISOString(),
    endedAt: new Date(end).toISOString(),
  };
  return [...existing, marker].slice(-24);
}

export class TimelineRecorder {
  private active = emptySegment();
  private candidate = emptySegment();
  private paused = emptySegment();
  private backgroundOnly = emptySegment();
  private readonly options: {
    minSegmentMs: number;
    maxSampleGapMs: number;
    persist: (payload: TimelinePersistPayload) => Promise<TimelinePersistResult>;
    log?: (payload: TimelineDebugPayload) => void;
  };

  constructor(options: {
    minSegmentMs: number;
    maxSampleGapMs?: number;
    persist: (payload: TimelinePersistPayload) => Promise<TimelinePersistResult>;
    log?: (payload: TimelineDebugPayload) => void;
    initialState?: Partial<TimelineRecorderState> | null;
  }) {
    this.options = {
      ...options,
      maxSampleGapMs: options.maxSampleGapMs ?? Number.POSITIVE_INFINITY,
    };
    if (options.initialState) {
      this.active = normalizeSegmentState(options.initialState.active);
      this.candidate = normalizeSegmentState(options.initialState.candidate);
      this.paused = normalizeSegmentState(options.initialState.paused);
      if (this.active.key) {
        this.log({
          stage: 'restore',
          message: 'Timeline active segment restored',
          appName: this.active.appName,
          windowTitle: this.active.windowTitle,
          url: this.active.url,
          key: this.active.key,
          durationMs: this.active.lastSeenAt - this.active.firstSeenAt,
          minSegmentMs: this.options.minSegmentMs,
        });
      }
    }
  }

  async handleSnapshot(snapshot: TimelineSnapshot, checkedAt = Date.now()) {
    if (!snapshot.supported || snapshot.error) {
      this.log({ stage: 'sample:skip', message: 'unsupported or error', error: snapshot.error ?? 'unsupported' });
      return;
    }

    const foreground = normalizeTimelineForeground(
      snapshot.appName?.trim() || 'Unknown',
      snapshot.windowTitle?.trim() || '',
      snapshot.url?.trim() || null,
    );
    const appName = foreground.appName;
    const windowTitle = foreground.windowTitle;
    const url = foreground.url;
    const key = getTimelineSnapshotKey(appName, windowTitle, url);

    this.log({
      stage: 'sample',
      appName,
      windowTitle,
      url,
      key,
      message: `background=${snapshot.background?.length ?? 0}`,
    });

    if (this.active.key && checkedAt - this.active.lastSeenAt > this.options.maxSampleGapMs) {
      await this.persistActive(this.active.lastSeenAt);
      this.log({
        stage: 'active:stale-split',
        message: 'sampling gap longer than minimum segment duration',
        appName: this.active.appName,
        windowTitle: this.active.windowTitle,
        url: this.active.url,
        key: this.active.key,
        durationMs: this.active.lastSeenAt - this.active.firstSeenAt,
        gapMs: checkedAt - this.active.lastSeenAt,
        minSegmentMs: this.options.maxSampleGapMs,
      });
      this.active = emptySegment();
      this.candidate = emptySegment();
    }

    if (!this.active.key) {
      this.active = {
        key,
        firstSeenAt: checkedAt,
        lastSeenAt: checkedAt,
        segmentId: null,
        appName,
        windowTitle,
        url,
        backgroundMarkers: mergeBackgroundMarkers([], snapshot.background, checkedAt),
      };
      this.log({ stage: 'active:start', appName, windowTitle, url, key, minSegmentMs: this.options.minSegmentMs });
      return;
    }

    if (this.active.key !== key) {
      if (this.candidate.key !== key) {
        await this.foldCandidateIntoActive(checkedAt);
        this.candidate = {
          key,
          firstSeenAt: checkedAt,
          lastSeenAt: checkedAt,
          segmentId: null,
          appName,
          windowTitle,
          url,
          backgroundMarkers: mergeBackgroundMarkers([], snapshot.background, checkedAt),
        };
        this.log({ stage: 'candidate:start', message: 'different from active', appName, windowTitle, url, key, minSegmentMs: this.options.minSegmentMs });
        return;
      }

      this.candidate.lastSeenAt = checkedAt;
      this.candidate.windowTitle = windowTitle;
      this.candidate.url = url;
      this.candidate.backgroundMarkers = mergeBackgroundMarkers(this.candidate.backgroundMarkers, snapshot.background, checkedAt);

      const candidateDuration = checkedAt - this.candidate.firstSeenAt;
      if (candidateDuration < this.options.minSegmentMs) {
        this.log({ stage: 'candidate:hold', appName, windowTitle, url, key, durationMs: candidateDuration, minSegmentMs: this.options.minSegmentMs });
        return;
      }

      this.log({ stage: 'candidate:confirm', appName, windowTitle, url, key, durationMs: candidateDuration, minSegmentMs: this.options.minSegmentMs });
      await this.persistActive(this.candidate.firstSeenAt);
      this.active = { ...this.candidate };
      this.candidate = emptySegment();
      return;
    }

    if (this.candidate.key) {
      this.log({
        stage: 'candidate:discard',
        message: 'returned to active before minimum',
        appName: this.candidate.appName,
        windowTitle: this.candidate.windowTitle,
        url: this.candidate.url,
        key: this.candidate.key,
        durationMs: this.candidate.lastSeenAt - this.candidate.firstSeenAt,
        minSegmentMs: this.options.minSegmentMs,
      });
      await this.foldCandidateIntoActive(checkedAt, false);
    }

    this.candidate = emptySegment();
    this.active.lastSeenAt = checkedAt;
    this.active.windowTitle = windowTitle;
    this.active.url = url;
    this.active.backgroundMarkers = mergeBackgroundMarkers(this.active.backgroundMarkers, snapshot.background, checkedAt);
    await this.persistActive(checkedAt);
  }

  async stop(endedAt = Date.now()) {
    this.log({ stage: 'stop', message: 'Timeline sampler stopped' });
    await this.foldCandidateIntoActive(endedAt);
    await this.persistActive(this.active.lastSeenAt || endedAt);
    if (this.paused.key) await this.persistPaused();
  }

  async pauseForeground(endedAt = Date.now()) {
    await this.foldCandidateIntoActive(endedAt);
    if (this.active.key) {
      this.active.lastSeenAt = endedAt;
      await this.persistActive(endedAt);
      this.paused = { ...this.active };
    }
    this.active = emptySegment();
    this.candidate = emptySegment();
    this.log({ stage: 'pause', message: 'Timeline foreground paused' });
  }

  resumeForeground(resumedAt = Date.now(), maxPauseMs = this.options.minSegmentMs) {
    if (!this.paused.key) return;
    const pauseDurationMs = Math.max(0, resumedAt - this.paused.lastSeenAt);
    if (pauseDurationMs <= maxPauseMs) {
      this.active = {
        ...this.paused,
        lastSeenAt: resumedAt,
      };
      this.log({
        stage: 'resume',
        message: 'Timeline foreground resumed and continued',
        appName: this.active.appName,
        windowTitle: this.active.windowTitle,
        url: this.active.url,
        key: this.active.key,
        durationMs: pauseDurationMs,
        minSegmentMs: maxPauseMs,
      });
      this.paused = emptySegment();
      return;
    }
    this.log({
      stage: 'resume:split',
      message: 'Timeline foreground resumed after long pause',
      appName: this.paused.appName,
      windowTitle: this.paused.windowTitle,
      url: this.paused.url,
      key: this.paused.key,
      durationMs: pauseDurationMs,
      minSegmentMs: maxPauseMs,
    });
    this.paused = emptySegment();
  }

  getState(): TimelineRecorderState {
    return {
      active: cloneSegment(this.active),
      candidate: cloneSegment(this.candidate),
      paused: cloneSegment(this.paused),
    };
  }

  async handleBackgroundMarkers(markers: TimelineBackgroundMarker[] | undefined, checkedAt = Date.now()) {
    if (!markers || markers.length === 0) return;
    if (this.paused.key) {
      this.paused.backgroundMarkers = mergeBackgroundMarkers(this.paused.backgroundMarkers, markers, checkedAt);
      await this.persistPaused();
      return;
    }
    await this.persistBackgroundOnly(markers, checkedAt);
  }

  private async foldCandidateIntoActive(endedAt: number, persist = true) {
    if (!this.active.key || !this.candidate.key) return;
    this.active.backgroundMarkers = appendShortForegroundMarker(this.active.backgroundMarkers, this.candidate, endedAt);
    this.active.backgroundMarkers = mergeRecordedBackgroundMarkers(this.active.backgroundMarkers, this.candidate.backgroundMarkers);
    this.log({
      stage: 'candidate:fold',
      message: 'short foreground folded into active segment',
      appName: this.candidate.appName,
      windowTitle: this.candidate.windowTitle,
      url: this.candidate.url,
      key: this.candidate.key,
      durationMs: Math.max(0, (this.candidate.lastSeenAt || endedAt) - this.candidate.firstSeenAt),
      minSegmentMs: this.options.minSegmentMs,
    });
    this.candidate = emptySegment();
    if (persist) await this.persistActive(this.active.lastSeenAt || endedAt);
  }

  private async persistActive(endedAt: number) {
    if (!this.active.key) {
      this.log({ stage: 'persist:skip', message: 'no active segment' });
      return;
    }

    const durationMs = endedAt - this.active.firstSeenAt;
    if (durationMs < this.options.minSegmentMs) {
      this.log({
        stage: 'persist:skip',
        message: 'active segment below minimum',
        appName: this.active.appName,
        windowTitle: this.active.windowTitle,
        url: this.active.url,
        key: this.active.key,
        durationMs,
        minSegmentMs: this.options.minSegmentMs,
      });
      return;
    }

    const entry = await this.options.persist({
      id: this.active.segmentId,
      startedAt: this.active.firstSeenAt,
      endedAt,
      appName: this.active.appName,
      windowTitle: this.active.windowTitle,
      url: this.active.url,
      backgroundMarkers: this.active.backgroundMarkers,
    });

    if (entry) {
      this.active.segmentId = entry.id;
      this.log({
        stage: 'persist:ok',
        message: `entry=${entry.id}`,
        appName: this.active.appName,
        windowTitle: this.active.windowTitle,
        url: this.active.url,
        key: this.active.key,
        durationMs,
        minSegmentMs: this.options.minSegmentMs,
      });
    } else {
      this.log({
        stage: 'persist:null',
        message: 'upsert returned null',
        appName: this.active.appName,
        key: this.active.key,
        durationMs,
        minSegmentMs: this.options.minSegmentMs,
      });
    }
  }

  private async persistPaused() {
    if (!this.paused.key || !this.paused.segmentId) return;
    await this.options.persist({
      id: this.paused.segmentId,
      startedAt: this.paused.firstSeenAt,
      endedAt: this.paused.lastSeenAt,
      appName: this.paused.appName,
      windowTitle: this.paused.windowTitle,
      url: this.paused.url,
      backgroundMarkers: this.paused.backgroundMarkers,
    });
  }

  private async persistBackgroundOnly(markers: TimelineBackgroundMarker[], checkedAt: number) {
    if (!this.backgroundOnly.key) {
      this.backgroundOnly = {
        key: '__background__',
        firstSeenAt: checkedAt,
        lastSeenAt: checkedAt,
        segmentId: null,
        appName: 'Background',
        windowTitle: 'Background processes',
        url: null,
        backgroundMarkers: mergeBackgroundMarkers([], markers, checkedAt),
      };
      return;
    }
    this.backgroundOnly.lastSeenAt = checkedAt;
    this.backgroundOnly.backgroundMarkers = mergeBackgroundMarkers(this.backgroundOnly.backgroundMarkers, markers, checkedAt);
    if (this.backgroundOnly.lastSeenAt - this.backgroundOnly.firstSeenAt < this.options.minSegmentMs) return;
    const entry = await this.options.persist({
      id: this.backgroundOnly.segmentId,
      startedAt: this.backgroundOnly.firstSeenAt,
      endedAt: this.backgroundOnly.lastSeenAt,
      appName: this.backgroundOnly.appName,
      windowTitle: this.backgroundOnly.windowTitle,
      url: null,
      backgroundMarkers: this.backgroundOnly.backgroundMarkers,
      foregroundVisible: false,
    });
    if (entry) this.backgroundOnly.segmentId = entry.id;
  }

  private log(payload: TimelineDebugPayload) {
    this.options.log?.(payload);
  }
}

function cloneSegment(segment: TimelineSegmentState): TimelineSegmentState {
  return {
    ...segment,
    backgroundMarkers: segment.backgroundMarkers.map((marker) => ({ ...marker })),
  };
}

function normalizeSegmentState(value: unknown): TimelineSegmentState {
  if (!value || typeof value !== 'object') return emptySegment();
  const source = value as Partial<TimelineSegmentState>;
  if (typeof source.key !== 'string' || !source.key) return emptySegment();
  return {
    key: source.key,
    firstSeenAt: typeof source.firstSeenAt === 'number' && Number.isFinite(source.firstSeenAt) ? source.firstSeenAt : 0,
    lastSeenAt: typeof source.lastSeenAt === 'number' && Number.isFinite(source.lastSeenAt) ? source.lastSeenAt : 0,
    segmentId: typeof source.segmentId === 'number' ? source.segmentId : null,
    appName: typeof source.appName === 'string' ? source.appName : 'Unknown',
    windowTitle: typeof source.windowTitle === 'string' ? source.windowTitle : '',
    url: typeof source.url === 'string' ? source.url : null,
    backgroundMarkers: Array.isArray(source.backgroundMarkers)
      ? source.backgroundMarkers.map((marker) => ({
        type: String(marker?.type ?? ''),
        name: String(marker?.name ?? ''),
        detail: String(marker?.detail ?? ''),
        startedAt: typeof marker?.startedAt === 'string' ? marker.startedAt : undefined,
        endedAt: typeof marker?.endedAt === 'string' ? marker.endedAt : undefined,
      })).filter((marker) => marker.type && marker.name)
      : [],
  };
}
