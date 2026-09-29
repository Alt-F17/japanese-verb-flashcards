export const CAP_OPTIONS = [5, 10, 15, 20];
export const MAX_CAP = 20;

export const DEFAULT_SETTINGS = { stopwatch: false, stopwatchCap: MAX_CAP };

export function normalizeSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    stopwatch: typeof s.stopwatch === 'boolean' ? s.stopwatch : DEFAULT_SETTINGS.stopwatch,
    stopwatchCap: CAP_OPTIONS.includes(s.stopwatchCap) ? s.stopwatchCap : DEFAULT_SETTINGS.stopwatchCap,
  };
}

export const startStopwatch = (now) => ({ ms: 0, since: now });

export const isRunning = (sw) => sw.since !== null;

export const pauseStopwatch = (sw, now) =>
  isRunning(sw) ? { ms: sw.ms + Math.max(0, now - sw.since), since: null } : sw;

export const resumeStopwatch = (sw, now) => (isRunning(sw) ? sw : { ...sw, since: now });

export function elapsedMs(sw, now, capSec) {
  const ms = sw.ms + (isRunning(sw) ? Math.max(0, now - sw.since) : 0);
  return Math.min(ms, capSec * 1000);
}

export const isCapped = (sw, now, capSec) => elapsedMs(sw, now, capSec) >= capSec * 1000;

export function formatElapsed(ms, capSec) {
  if (ms >= capSec * 1000) return `${capSec}s`;
  return `${(Math.floor(ms / 100) / 10).toFixed(1)}s`;
}
