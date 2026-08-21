import { useCallback, useEffect, useState } from 'react';
import { isISODate, todayISO, type ISODate } from './date';

/**
 * Hash routing, hand-rolled — four screens do not justify a router library,
 * and real URLs mean the Android back button works once the app is installed
 * to the home screen.
 */
export type Tab = 'today' | 'week' | 'trackers' | 'groceries';

export type Route =
  | { tab: 'today'; date: ISODate }
  | { tab: 'week' }
  | { tab: 'trackers' }
  | { tab: 'groceries' };

export function parseHash(hash: string): Route | null {
  const path = hash.replace(/^#\/?/, '');
  if (path === '' || path === 'today') return { tab: 'today', date: todayISO() };
  if (path === 'week') return { tab: 'week' };
  if (path === 'trackers') return { tab: 'trackers' };
  if (path === 'groceries') return { tab: 'groceries' };

  const day = /^day\/(.+)$/.exec(path);
  if (day?.[1] && isISODate(day[1])) return { tab: 'today', date: day[1] };

  return null;
}

export function routeToHash(route: Route): string {
  if (route.tab !== 'today') return `#/${route.tab}`;
  return route.date === todayISO() ? '#/today' : `#/day/${route.date}`;
}

export function useRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(
    () => parseHash(window.location.hash) ?? { tab: 'today', date: todayISO() },
  );

  useEffect(() => {
    const onChange = (): void => {
      setRoute(parseHash(window.location.hash) ?? { tab: 'today', date: todayISO() });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    const hash = routeToHash(next);
    if (window.location.hash === hash) return;
    // Setting the hash pushes a history entry, so Back walks the screens.
    window.location.hash = hash;
  }, []);

  return [route, navigate];
}
