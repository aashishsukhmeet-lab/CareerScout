import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  formatLong,
  isISODate,
  parseISODate,
  todayISO,
} from './date';

describe('parseISODate', () => {
  it('parses a well-formed date', () => {
    expect(parseISODate('2026-08-20')).toEqual({ year: 2026, month: 8, day: 20 });
  });

  it('rejects malformed input', () => {
    expect(() => parseISODate('2026-8-20')).toThrow(/expected YYYY-MM-DD/);
    expect(() => parseISODate('20 Aug 2026')).toThrow();
    expect(() => parseISODate('')).toThrow();
  });

  it('rejects days that do not exist rather than rolling them over', () => {
    expect(() => parseISODate('2026-02-30')).toThrow(/no such calendar day/);
    expect(() => parseISODate('2026-13-01')).toThrow();
    expect(isISODate('2027-02-29')).toBe(false);
    expect(isISODate('2028-02-29')).toBe(true); // 2028 is a leap year
  });
});

describe('addDays / daysBetween', () => {
  it('round-trips', () => {
    expect(addDays('2026-08-20', 0)).toBe('2026-08-20');
    expect(addDays('2026-08-20', 1)).toBe('2026-08-21');
    expect(addDays('2026-08-20', -1)).toBe('2026-08-19');
  });

  it('crosses month, year and leap boundaries', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
    expect(daysBetween('2028-01-01', '2029-01-01')).toBe(366);
  });

  it('is signed', () => {
    expect(daysBetween('2026-08-20', '2026-08-27')).toBe(7);
    expect(daysBetween('2026-08-27', '2026-08-20')).toBe(-7);
  });

  it('counts exactly one day across a DST transition', () => {
    // US spring forward (23-hour local day) and fall back (25-hour local day).
    expect(daysBetween('2027-03-13', '2027-03-15')).toBe(2);
    expect(daysBetween('2027-11-06', '2027-11-08')).toBe(2);
    // EU transitions, on different dates.
    expect(daysBetween('2027-03-27', '2027-03-29')).toBe(2);
    expect(daysBetween('2027-10-30', '2027-11-01')).toBe(2);
  });
});

describe('todayISO', () => {
  it('reads the local calendar date, not the UTC one', () => {
    // 2026-08-20 at 23:30 local time is still the 20th locally.
    const lateEvening = new Date(2026, 7, 20, 23, 30, 0);
    expect(todayISO(lateEvening)).toBe('2026-08-20');
    const earlyMorning = new Date(2026, 7, 21, 0, 5, 0);
    expect(todayISO(earlyMorning)).toBe('2026-08-21');
  });

  it('pads single-digit months and days', () => {
    expect(todayISO(new Date(2027, 0, 5, 12, 0, 0))).toBe('2027-01-05');
  });
});

describe('formatLong', () => {
  it('labels the calendar date, not a timezone-shifted one', () => {
    // Would read "19 August" if the formatter used local time on a UTC-anchored Date.
    expect(formatLong('2026-08-20')).toMatch(/20/);
    expect(formatLong('2026-08-20')).toMatch(/Aug/i);
  });
});
