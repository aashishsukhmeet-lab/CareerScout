import { describe, expect, it, vi } from 'vitest';
import { HISTORY_DAYS, createStore, prune } from './storage';
import { addDays } from './date';

const TODAY = '2026-08-21';

describe('prune', () => {
  it('keeps today and everything inside the window', () => {
    const record = {
      [TODAY]: 1,
      [addDays(TODAY, -1)]: 2,
      [addDays(TODAY, -HISTORY_DAYS)]: 3,
    };
    expect(Object.keys(prune(record, TODAY))).toHaveLength(3);
  });

  it('drops days past the window', () => {
    const record = {
      [addDays(TODAY, -HISTORY_DAYS)]: 'keep',
      [addDays(TODAY, -HISTORY_DAYS - 1)]: 'drop',
      [addDays(TODAY, -400)]: 'drop',
    };
    expect(prune(record, TODAY)).toEqual({ [addDays(TODAY, -HISTORY_DAYS)]: 'keep' });
  });

  it("keeps future dates, since swapping tomorrow's dinner tonight is a real thing", () => {
    const record = { [addDays(TODAY, 1)]: 'a', [addDays(TODAY, 90)]: 'b' };
    expect(prune(record, TODAY)).toEqual(record);
  });

  it('discards keys that are not dates rather than choking on them', () => {
    const record = { [TODAY]: 'ok', 'not-a-date': 'bad', '': 'bad', '2026-02-30': 'bad' };
    expect(prune(record, TODAY)).toEqual({ [TODAY]: 'ok' });
  });

  it('takes a custom window', () => {
    const record = { [addDays(TODAY, -5)]: 'a', [addDays(TODAY, -6)]: 'b' };
    expect(Object.keys(prune(record, TODAY, 5))).toEqual([addDays(TODAY, -5)]);
  });

  it('leaves an empty record empty', () => {
    expect(prune({}, TODAY)).toEqual({});
  });
});

describe('createStore', () => {
  it('holds a value and hands it back', () => {
    const store = createStore('test-value', { a: 1 });
    expect(store.get()).toEqual({ a: 1 });
    store.set({ a: 2 });
    expect(store.get()).toEqual({ a: 2 });
  });

  it('tells every subscriber about a change', () => {
    const store = createStore('test-notify', 0);
    const first = vi.fn();
    const second = vi.fn();
    store.subscribe(first);
    store.subscribe(second);

    store.set(1);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('stops telling a subscriber that unsubscribed', () => {
    const store = createStore('test-unsub', 0);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.set(1);
    unsubscribe();
    store.set(2);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.get()).toBe(2);
  });

  it('returns a stable snapshot between writes, as useSyncExternalStore needs', () => {
    const store = createStore('test-stable', { count: 0 });
    expect(store.get()).toBe(store.get());
  });

  it('carries on when localStorage is unavailable', () => {
    // This suite runs with no `localStorage` at all, which is the same shape
    // of failure as iOS private browsing. Nothing above should have thrown.
    expect(typeof globalThis.localStorage).toBe('undefined');
    const store = createStore('test-no-storage', 'value');
    expect(() => store.set('changed')).not.toThrow();
    expect(store.get()).toBe('changed');
  });
});
