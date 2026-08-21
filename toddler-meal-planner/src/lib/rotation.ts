import { ANCHOR, CYCLE, CYCLE_LENGTH } from '../data/cycle';
import { getFood } from '../data/foods';
import { SLOTS } from '../data/types';
import type { DayPlan, Food, FoodId, ResolvedDay, Slot } from '../data/types';
import { addDays, daysBetween, type ISODate } from './date';

/**
 * Deterministic date-based rotation.
 *
 * dayIndex = daysSince(ANCHOR) mod CYCLE_LENGTH
 *
 * No randomness, no device state, no clock time — only the calendar date goes
 * in. Given the same date, every phone computes the same plan, forever, with
 * no account and nothing to sync. That is the entire "both of us see the same
 * thing" mechanism.
 */
export function dayIndexFor(date: ISODate): number {
  const delta = daysBetween(ANCHOR, date);
  // JS `%` keeps the sign of the dividend, so dates before the anchor would
  // come out negative. Normalise into [0, CYCLE_LENGTH).
  return ((delta % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH;
}

/** 1-based position, for display: "Day 3 of 7". */
export function dayNumberFor(date: ISODate): number {
  return dayIndexFor(date) + 1;
}

export function dayPlanFor(date: ISODate): DayPlan {
  const plan = CYCLE[dayIndexFor(date)];
  if (!plan) {
    // Only reachable if CYCLE is empty, which is a data bug worth shouting about.
    throw new Error(`No day plan at index ${dayIndexFor(date)} — is CYCLE empty?`);
  }
  return plan;
}

/**
 * Per-date swap overrides: `{ lunch: 'lobia-rice' }`. Persisted per date in
 * localStorage by the Today screen; the resolver itself stays pure.
 */
export type DayOverrides = Partial<Record<Slot, FoodId>>;

/**
 * The full picture for one date: which day of the cycle it is and the actual
 * Food object in each slot, with any swaps already applied.
 *
 * An override naming a food that no longer exists (library edited after a swap
 * was saved) falls back to the scheduled food rather than throwing — a stale
 * localStorage entry should never blank the screen at 6am.
 */
export function resolveDay(date: ISODate, overrides: DayOverrides = {}): ResolvedDay {
  const plan = dayPlanFor(date);
  const meals = {} as Record<Slot, Food>;

  for (const slot of SLOTS) {
    const scheduled = plan.meals[slot];
    const override = overrides[slot];
    let food: Food;
    try {
      food = override ? getFood(override) : getFood(scheduled);
    } catch {
      food = getFood(scheduled);
    }
    meals[slot] = food;
  }

  return {
    date,
    dayIndex: dayIndexFor(date),
    dayNumber: dayNumberFor(date),
    cycleLength: CYCLE_LENGTH,
    label: plan.label,
    meals,
  };
}

/**
 * `count` consecutive dates starting at `start`. Defaults to one full cycle,
 * which is what the Week screen and the grocery list both want.
 */
export function datesFrom(start: ISODate, count: number = CYCLE_LENGTH): ISODate[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

/** Re-exported so screens import the constant from one place. */
export { ANCHOR, CYCLE_LENGTH };
