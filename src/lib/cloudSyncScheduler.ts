import { hasPendingCloudSync, syncCloudBackup } from '@/lib/db';

const STARTUP_SYNC_DELAY_MS = 12_000;
const PERIODIC_SYNC_INTERVAL_MS = 5 * 60_000;
const MIN_SYNC_GAP_MS = 30_000;

let started = false;
let startupTimer: number | null = null;
let periodicTimer: number | null = null;
let inFlight: Promise<void> | null = null;
let lastAttemptAt = 0;

async function runCloudSync(reason: string, force = false) {
  const now = Date.now();
  if (inFlight) return inFlight;
  if (!force && now - lastAttemptAt < MIN_SYNC_GAP_MS) return;

  inFlight = (async () => {
    try {
      if (!(await hasPendingCloudSync())) return;
      lastAttemptAt = Date.now();
      const result = await syncCloudBackup();
      if (!result.ok) {
        console.warn(`Cloud sync skipped (${reason}):`, result.lastSyncError);
      }
    } catch (error) {
      console.warn(`Cloud sync failed (${reason}):`, error);
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function startCloudSyncScheduler() {
  if (started || typeof window === 'undefined') return;
  started = true;

  startupTimer = window.setTimeout(() => {
    void runCloudSync('startup');
  }, STARTUP_SYNC_DELAY_MS);

  periodicTimer = window.setInterval(() => {
    void runCloudSync('periodic');
  }, PERIODIC_SYNC_INTERVAL_MS);

  const handleOnline = () => {
    void runCloudSync('online', true);
  };
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') void runCloudSync('visibility-hidden', true);
  };
  const handleBeforeUnload = () => {
    void runCloudSync('beforeunload', true);
  };

  window.addEventListener('online', handleOnline);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    if (startupTimer !== null) window.clearTimeout(startupTimer);
    if (periodicTimer !== null) window.clearInterval(periodicTimer);
    window.removeEventListener('online', handleOnline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    startupTimer = null;
    periodicTimer = null;
    started = false;
  };
}

export function flushCloudSync(reason = 'manual') {
  return runCloudSync(reason, true);
}
