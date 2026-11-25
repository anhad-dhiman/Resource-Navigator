import { describe, expect, it } from 'vitest';
import { createAbuseGuard } from '../src/middleware/abuseGuard.js';

describe('createAbuseGuard', () => {
  it('pauses after 3 strikes within 15 minutes, for 30 minutes', () => {
    let t = 0;
    const g = createAbuseGuard({ now: () => t });
    expect(g.strike('a')).toEqual({ paused: false, strikesLeft: 2 });
    expect(g.strike('a')).toEqual({ paused: false, strikesLeft: 1 });
    expect(g.strike('a')).toEqual({ paused: true, strikesLeft: 3 });
    expect(g.pausedFor('a')).toBe(30 * 60_000);
    expect(g.pausedFor('b')).toBe(0);
    t += 30 * 60_000;
    expect(g.pausedFor('a')).toBe(0);
  });

  it('forgets strikes older than the window', () => {
    let t = 0;
    const g = createAbuseGuard({ now: () => t });
    g.strike('a');
    g.strike('a');
    t += 15 * 60_000 + 1;
    expect(g.strike('a')).toEqual({ paused: false, strikesLeft: 2 });
  });

  it('keeps memory bounded', () => {
    let t = 0;
    const g = createAbuseGuard({ maxEntries: 100, now: () => t });
    for (let i = 0; i < 1000; i++) {
      g.strike(`ip-${i}`);
      t += 1;
    }
    expect(g.size()).toBeLessThanOrEqual(101);
  });
});
