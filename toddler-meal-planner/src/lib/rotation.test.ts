import { describe, expect, it } from 'vitest';
import { ANCHOR, CYCLE, CYCLE_LENGTH } from '../data/cycle';
import { SLOTS } from '../data/types';
import { addDays, type ISODate } from './date';
import { datesFrom, dayIndexFor, dayNumberFor, dayPlanFor, resolveDay } from './rotation';

/** Every date in a range, inclusive. */
function dateRange(start: ISODate, days: number): ISODate[] {
  return Array.from({ length: days }, (_, i) => addDays(start, i));
}

describe('the anchor', () => {
  it('puts Day 1 of the cycle on the anchor date', () => {
    expect(dayIndexFor(ANCHOR)).toBe(0);
    expect(dayNumberFor(ANCHOR)).toBe(1);
    expect(dayPlanFor(ANCHOR).id).toBe('day-1');
  });

  it('advances one day of the cycle per calendar day', () => {
    for (let i = 0; i < CYCLE_LENGTH; i += 1) {
      expect(dayIndexFor(addDays(ANCHOR, i))).toBe(i);
    }
  });

  it('wraps back to Day 1 after a full cycle', () => {
    expect(dayIndexFor(addDays(ANCHOR, CYCLE_LENGTH))).toBe(0);
    expect(dayIndexFor(addDays(ANCHOR, CYCLE_LENGTH * 52))).toBe(0);
  });
});

describe('determinism — the whole point of the app', () => {
  it('returns an identical plan every time it is asked about a date', () => {
    // Stands in for "my phone and my wife's phone, opened at different moments".
    const date = '2026-11-03';
    const first = resolveDay(date);
    for (let call = 0; call < 100; call += 1) {
      expect(resolveDay(date)).toEqual(first);
    }
  });

  it('depends on nothing but the date string', () => {
    // No Math.random, no Date.now, no device state anywhere in the path: if
    // this held only by luck, running it 500 times across two years would
    // catch it.
    const dates = dateRange('2026-08-20', 500);
    const firstPass = dates.map((d) => JSON.stringify(resolveDay(d)));
    const secondPass = dates.map((d) => JSON.stringify(resolveDay(d)));
    expect(secondPass).toEqual(firstPass);
  });

  it('gives the same answer regardless of the device timezone', () => {
    const dates = dateRange('2026-08-20', 60);
    const zones = [
      'UTC',
      'America/Los_Angeles', // UTC-7/8
      'Asia/Kolkata', // UTC+5:30, half-hour offset
      'Pacific/Kiritimati', // UTC+14, the far edge
      'Pacific/Niue', // UTC-11, the other edge
      'Australia/Lord_Howe', // UTC+10:30/11, half-hour DST shift
    ];
    const original = process.env.TZ;
    try {
      const perZone = zones.map((tz) => {
        process.env.TZ = tz;
        return dates.map((d) => `${d}:${dayIndexFor(d)}`);
      });
      for (const result of perZone) {
        expect(result).toEqual(perZone[0]);
      }
    } finally {
      process.env.TZ = original;
    }
  });

  it('holds across DST transitions', () => {
    // A 23-hour local day must not skip a day of the cycle, and a 25-hour one
    // must not repeat it.
    for (const transition of ['2027-03-14', '2027-11-07', '2027-03-28', '2027-10-31']) {
      const before = dayIndexFor(addDays(transition, -1));
      const on = dayIndexFor(transition);
      const after = dayIndexFor(addDays(transition, 1));
      expect(on).toBe((before + 1) % CYCLE_LENGTH);
      expect(after).toBe((on + 1) % CYCLE_LENGTH);
    }
  });
});

describe('the rotation over long spans', () => {
  it('never leaves the valid range, over four years either side of the anchor', () => {
    for (const date of dateRange(addDays(ANCHOR, -730), 1461)) {
      const index = dayIndexFor(date);
      expect(Number.isInteger(index)).toBe(true);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(CYCLE_LENGTH);
    }
  });

  it('advances by exactly one, every single day, with no gaps or repeats', () => {
    const dates = dateRange(addDays(ANCHOR, -400), 1200);
    for (let i = 1; i < dates.length; i += 1) {
      const previous = dayIndexFor(dates[i - 1] as ISODate);
      const current = dayIndexFor(dates[i] as ISODate);
      expect(current).toBe((previous + 1) % CYCLE_LENGTH);
    }
  });

  it('is periodic — the same weekday-of-cycle, a cycle apart', () => {
    for (const date of dateRange('2026-08-20', 365)) {
      expect(dayIndexFor(addDays(date, CYCLE_LENGTH))).toBe(dayIndexFor(date));
      expect(dayIndexFor(addDays(date, CYCLE_LENGTH * 10))).toBe(dayIndexFor(date));
    }
  });

  it('handles dates before the anchor without going negative', () => {
    expect(dayIndexFor(addDays(ANCHOR, -1))).toBe(CYCLE_LENGTH - 1);
    expect(dayIndexFor(addDays(ANCHOR, -CYCLE_LENGTH))).toBe(0);
    for (const date of dateRange('2020-01-01', 400)) {
      expect(dayIndexFor(date)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('resolveDay', () => {
  it('fills all five slots with real foods', () => {
    const day = resolveDay(ANCHOR);
    expect(Object.keys(day.meals)).toHaveLength(SLOTS.length);
    for (const slot of SLOTS) {
      expect(day.meals[slot].name.length).toBeGreaterThan(0);
      expect(day.meals[slot].slots).toContain(slot);
    }
  });

  it('reports its position in the cycle', () => {
    const day = resolveDay(addDays(ANCHOR, 2));
    expect(day.date).toBe(addDays(ANCHOR, 2));
    expect(day.dayIndex).toBe(2);
    expect(day.dayNumber).toBe(3);
    expect(day.cycleLength).toBe(CYCLE_LENGTH);
    expect(day.label).toBe(CYCLE[2]?.label);
  });

  it('applies swap overrides to the named slot only', () => {
    const scheduled = resolveDay(ANCHOR);
    const swapped = resolveDay(ANCHOR, { lunch: 'rajma-rice' });
    expect(swapped.meals.lunch.id).toBe('rajma-rice');
    expect(swapped.meals.breakfast.id).toBe(scheduled.meals.breakfast.id);
    expect(swapped.meals.dinner.id).toBe(scheduled.meals.dinner.id);
  });

  it('falls back to the scheduled food when a saved swap points at a deleted food', () => {
    // A stale localStorage entry must never blank the screen at 6am.
    const scheduled = resolveDay(ANCHOR);
    const stale = resolveDay(ANCHOR, { lunch: 'food-that-was-removed' });
    expect(stale.meals.lunch.id).toBe(scheduled.meals.lunch.id);
  });
});

describe('datesFrom', () => {
  it('returns one full cycle of consecutive dates by default', () => {
    const dates = datesFrom('2026-08-20');
    expect(dates).toHaveLength(CYCLE_LENGTH);
    expect(dates[0]).toBe('2026-08-20');
    expect(dates.at(-1)).toBe(addDays('2026-08-20', CYCLE_LENGTH - 1));
  });

  it('covers each day of the cycle exactly once', () => {
    const indices = datesFrom('2026-11-19').map(dayIndexFor);
    expect(new Set(indices).size).toBe(CYCLE_LENGTH);
  });

  it('takes an explicit count', () => {
    expect(datesFrom('2026-08-20', 3)).toEqual(['2026-08-20', '2026-08-21', '2026-08-22']);
    expect(datesFrom('2026-08-20', 0)).toEqual([]);
  });
});
