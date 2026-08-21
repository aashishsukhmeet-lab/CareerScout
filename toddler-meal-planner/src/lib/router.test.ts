import { describe, expect, it } from 'vitest';
import { parseHash, routeToHash } from './router';
import { todayISO } from './date';

describe('parseHash', () => {
  it('lands on Today for an empty hash — the default screen, no navigation', () => {
    for (const hash of ['', '#', '#/', '#/today']) {
      expect(parseHash(hash), hash).toEqual({ tab: 'today', date: todayISO() });
    }
  });

  it('reads the other three tabs', () => {
    expect(parseHash('#/week')).toEqual({ tab: 'week' });
    expect(parseHash('#/trackers')).toEqual({ tab: 'trackers' });
    expect(parseHash('#/groceries')).toEqual({ tab: 'groceries' });
  });

  it('opens a specific day', () => {
    expect(parseHash('#/day/2026-08-24')).toEqual({ tab: 'today', date: '2026-08-24' });
  });

  it('rejects a hash it does not recognise instead of guessing', () => {
    expect(parseHash('#/nope')).toBeNull();
    expect(parseHash('#/day/tomorrow')).toBeNull();
    expect(parseHash('#/day/2026-02-30')).toBeNull();
    expect(parseHash('#/day/')).toBeNull();
  });
});

describe('routeToHash', () => {
  it('round-trips every route', () => {
    const routes = [
      { tab: 'today', date: todayISO() },
      { tab: 'week' },
      { tab: 'trackers' },
      { tab: 'groceries' },
      { tab: 'today', date: '2026-12-25' },
    ] as const;
    for (const route of routes) {
      expect(parseHash(routeToHash(route)), routeToHash(route)).toEqual(route);
    }
  });

  it('writes today as #/today, not as a dated URL', () => {
    // Otherwise a link shared or bookmarked today would pin to that date.
    expect(routeToHash({ tab: 'today', date: todayISO() })).toBe('#/today');
    expect(routeToHash({ tab: 'today', date: '2026-12-25' })).toBe('#/day/2026-12-25');
  });
});
