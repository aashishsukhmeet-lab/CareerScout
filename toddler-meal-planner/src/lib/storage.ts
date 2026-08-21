import { useSyncExternalStore } from 'react';
import { daysBetween, isISODate, type ISODate } from './date';

/**
 * The only state that persists. Everything else — which meal is on which day,
 * the nutrition rules, the whole plan — is recomputed from the date, so there
 * is nothing to sync between phones and nothing to lose.
 *
 * Every read is defensive. localStorage throws outright in iOS private
 * browsing, and a half-written or hand-edited value should never be the reason
 * the screen is blank at 6am: on anything unexpected we fall back to empty and
 * carry on.
 */

const PREFIX = 'meals:v1:';

/** Rolling history kept for the trackers, per the brief. */
export const HISTORY_DAYS = 30;

function read(name: string): unknown {
  try {
    const raw = localStorage.getItem(PREFIX + name);
    if (raw === null) return undefined;
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function write(name: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + name, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled. The app still works for this
    // session; it just will not remember. Failing loudly here would be worse.
  }
}

/** A date-keyed bag of per-day state, e.g. `{ '2026-08-21': { lunch: true } }`. */
export type ByDate<T> = Record<ISODate, T>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Drops days older than `days` before `today`, and anything that is not a
 * valid date key. Future dates are kept — swapping tomorrow's dinner tonight
 * is a thing you would want to do.
 */
export function prune<T>(record: ByDate<T>, today: ISODate, days = HISTORY_DAYS): ByDate<T> {
  const kept: ByDate<T> = {};
  for (const [date, value] of Object.entries(record)) {
    if (!isISODate(date)) continue;
    const age = daysBetween(date, today);
    if (age > days) continue;
    kept[date] = value;
  }
  return kept;
}

/** Reads a date-keyed record, discarding anything that is not shaped right. */
function readByDate<T>(name: string, isValid: (value: unknown) => value is T): ByDate<T> {
  const raw = read(name);
  if (!isPlainObject(raw)) return {};
  const result: ByDate<T> = {};
  for (const [date, value] of Object.entries(raw)) {
    if (isISODate(date) && isValid(value)) result[date] = value;
  }
  return result;
}

/**
 * A tiny observable box around one localStorage key, so two screens reading
 * the same data (say Today's swaps and the Week overview) never disagree.
 */
export interface Store<T> {
  get: () => T;
  set: (next: T) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createStore<T>(name: string, initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<() => void>();

  const notify = (): void => {
    for (const listener of listeners) listener();
  };

  return {
    get: () => value,
    set: (next) => {
      value = next;
      write(name, next);
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

// ------------------------------------------------------------- the four stores

function isStringRecord(value: unknown): value is Record<string, string> {
  return isPlainObject(value) && Object.values(value).every((v) => typeof v === 'string');
}

function isBoolRecord(value: unknown): value is Record<string, boolean> {
  return isPlainObject(value) && Object.values(value).every((v) => typeof v === 'boolean');
}

/** `{ '2026-08-21': { lunch: 'lobia-rice' } }` — swaps, per date only. */
export const swapStore = createStore<ByDate<Record<string, string>>>(
  'swaps',
  readByDate('swaps', isStringRecord),
);

/** `{ '2026-08-21': { lunch: true } }` — the "Made it" toggles. */
export const madeStore = createStore<ByDate<Record<string, boolean>>>(
  'made',
  readByDate('made', isBoolRecord),
);

/** `{ '2026-08-21': { morning: true } }` — milk logged, per slot. */
export const milkStore = createStore<ByDate<Record<string, boolean>>>(
  'milk',
  readByDate('milk', isBoolRecord),
);

/** `{ '2026-08-21': { vitaminD: true } }` — supplements ticked. */
export const supplementStore = createStore<ByDate<Record<string, boolean>>>(
  'supplements',
  readByDate('supplements', isBoolRecord),
);

/**
 * Grocery ticks, scoped to the week they were made for. Changing week clears
 * them, so last week's checkmarks never haunt this week's list.
 */
export interface GroceryState {
  weekStart: ISODate | null;
  checked: Record<string, boolean>;
}

function readGroceries(): GroceryState {
  const raw = read('groceries');
  if (!isPlainObject(raw)) return { weekStart: null, checked: {} };
  const weekStart =
    typeof raw.weekStart === 'string' && isISODate(raw.weekStart) ? raw.weekStart : null;
  const checked = isBoolRecord(raw.checked) ? raw.checked : {};
  return { weekStart, checked };
}

export const groceryStore = createStore<GroceryState>('groceries', readGroceries());

/**
 * Trims the date-keyed stores to the rolling window. Called once on startup —
 * cheap, and it keeps localStorage from growing without bound.
 */
function pruneStore<T>(store: Store<ByDate<T>>, today: ISODate): void {
  const current = store.get();
  const trimmed = prune(current, today);
  if (Object.keys(trimmed).length !== Object.keys(current).length) store.set(trimmed);
}

export function pruneHistory(today: ISODate): void {
  pruneStore(swapStore, today);
  pruneStore(madeStore, today);
  pruneStore(milkStore, today);
  pruneStore(supplementStore, today);
}
