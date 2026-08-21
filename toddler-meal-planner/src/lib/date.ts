/**
 * Calendar-date helpers.
 *
 * A date here is a plain `YYYY-MM-DD` calendar day — no clock time, no
 * timezone. That is the whole trick behind "both phones show the same plan":
 * two devices agree on what day it is locally, and everything downstream is a
 * pure function of that string.
 *
 * All arithmetic goes through UTC midnight timestamps, so a device sitting in
 * a DST transition still gets exactly 1 day between consecutive dates.
 */

/** A calendar date in `YYYY-MM-DD` form. */
export type ISODate = string;

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

interface DateParts {
  year: number;
  month: number;
  day: number;
}

export function parseISODate(value: ISODate): DateParts {
  const match = ISO_DATE_RE.exec(value);
  if (!match) {
    throw new Error(`Invalid date "${value}" — expected YYYY-MM-DD`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const roundTrip = new Date(timestamp);
  // Catches 2026-02-30 and friends, which Date.UTC silently rolls over.
  if (
    roundTrip.getUTCFullYear() !== year ||
    roundTrip.getUTCMonth() !== month - 1 ||
    roundTrip.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date "${value}" — no such calendar day`);
  }
  return { year, month, day };
}

export function isISODate(value: string): boolean {
  try {
    parseISODate(value);
    return true;
  } catch {
    return false;
  }
}

/** UTC-midnight timestamp for a calendar date. Internal arithmetic only. */
function toTimestamp(value: ISODate): number {
  const { year, month, day } = parseISODate(value);
  return Date.UTC(year, month - 1, day);
}

function fromTimestamp(timestamp: number): ISODate {
  const d = new Date(timestamp);
  const year = String(d.getUTCFullYear()).padStart(4, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * The device's local calendar date. Two phones in the same house always agree;
 * a phone that has flown to another timezone shows that timezone's date, which
 * is the behaviour you want — you cook by the day you are standing in.
 */
export function todayISO(now: Date = new Date()): ISODate {
  const year = String(now.getFullYear()).padStart(4, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export function daysBetween(from: ISODate, to: ISODate): number {
  return (toTimestamp(to) - toTimestamp(from)) / MS_PER_DAY;
}

export function addDays(date: ISODate, delta: number): ISODate {
  return fromTimestamp(toTimestamp(date) + delta * MS_PER_DAY);
}

/** A `Date` pinned to UTC midnight, for passing to Intl formatters. */
function toFormatterDate(date: ISODate): Date {
  return new Date(toTimestamp(date));
}

const longFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const shortFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  timeZone: 'UTC',
});

const dayMonthFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** "Thursday, 21 August" (locale-dependent). */
export function formatLong(date: ISODate): string {
  return longFormatter.format(toFormatterDate(date));
}

/** "Thu" */
export function formatWeekdayShort(date: ISODate): string {
  return shortFormatter.format(toFormatterDate(date));
}

/** "21 Aug" */
export function formatDayMonth(date: ISODate): string {
  return dayMonthFormatter.format(toFormatterDate(date));
}
