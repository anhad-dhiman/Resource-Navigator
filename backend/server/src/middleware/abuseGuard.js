import { HttpError } from './errors.js';

export const PAUSED_MESSAGE =
  'Search is paused for 30 minutes because of repeated searches that were not about community services. ' +
  'If you need help now, call or text 2-1-1, or call 9-1-1 in an emergency.';

/**
 * Counts unrelated or meaningless searches per client and pauses a client that
 * makes too many. Only the client key (IP address), timestamps and a count are
 * kept, in memory; never the query.
 * @param {{maxStrikes?: number, windowMs?: number, blockMs?: number, maxEntries?: number, now?: () => number}} [options]
 */
export function createAbuseGuard({
  maxStrikes = 3,
  windowMs = 15 * 60_000,
  blockMs = 30 * 60_000,
  maxEntries = 10_000,
  now = Date.now,
} = {}) {
  const entries = new Map(); // key -> { strikes: number[], blockedUntil: number }

  function prune(t) {
    for (const [key, e] of entries) {
      if (e.blockedUntil <= t && e.strikes.every((s) => s <= t - windowMs)) entries.delete(key);
    }
    // Still too many: drop the oldest entries (Map keeps insertion order).
    for (const key of entries.keys()) {
      if (entries.size <= maxEntries) break;
      entries.delete(key);
    }
  }

  return {
    /** @returns {number} Milliseconds left on a pause, or 0 if not paused. */
    pausedFor(key) {
      const e = entries.get(key);
      return e ? Math.max(0, e.blockedUntil - now()) : 0;
    },

    /**
     * Records one unrelated search.
     * @returns {{paused: boolean, strikesLeft: number}}
     */
    strike(key) {
      const t = now();
      if (entries.size >= maxEntries) prune(t);
      const e = entries.get(key) ?? { strikes: [], blockedUntil: 0 };
      e.strikes = [...e.strikes.filter((s) => s > t - windowMs), t];
      if (e.strikes.length >= maxStrikes) {
        e.blockedUntil = t + blockMs;
        e.strikes = [];
      }
      entries.set(key, e);
      return { paused: e.blockedUntil > t, strikesLeft: Math.max(0, maxStrikes - e.strikes.length) };
    },

    size: () => entries.size,
  };
}

/** Rejects requests from a paused client with 429 and a Retry-After header. */
export function rejectPaused(guard) {
  return (req, res, next) => {
    const ms = guard.pausedFor(req.ip);
    if (ms > 0) {
      res.set('Retry-After', String(Math.ceil(ms / 1000)));
      throw new HttpError(429, 'SEARCH_PAUSED', PAUSED_MESSAGE);
    }
    next();
  };
}
