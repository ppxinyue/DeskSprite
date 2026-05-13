import { recordTelemetryEvent, type TelemetryFeature } from '@/lib/db';

type TelemetryMetadata = Record<string, unknown>;

export function trackFeatureUse(
  feature: TelemetryFeature,
  eventName: string,
  metadata: TelemetryMetadata = {},
) {
  return recordTelemetryEvent({
    feature,
    eventName,
    metadata,
  }).catch(() => null);
}

export function createFeatureTimer(
  feature: TelemetryFeature,
  eventName: string,
  metadata: TelemetryMetadata = {},
) {
  const startedAt = Date.now();
  let stopped = false;
  return {
    stop(extraMetadata: TelemetryMetadata = {}) {
      if (stopped) return Promise.resolve(null);
      stopped = true;
      const endedAt = Date.now();
      return recordTelemetryEvent({
        feature,
        eventName,
        durationMs: Math.max(0, endedAt - startedAt),
        metadata: {
          ...metadata,
          ...extraMetadata,
          startedAt: new Date(startedAt).toISOString(),
          endedAt: new Date(endedAt).toISOString(),
        },
      }).catch(() => null);
    },
  };
}

