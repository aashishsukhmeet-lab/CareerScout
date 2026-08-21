import { useCallback, useMemo } from 'react';
import { dayPlanFor, resolveDay } from '../lib/rotation';
import type { DayOverrides } from '../lib/rotation';
import { madeStore, swapStore, useStore } from '../lib/storage';
import { nextSwap } from '../lib/swap';
import type { ResolvedDay, Slot } from '../data/types';
import type { ISODate } from '../lib/date';

export interface DayState {
  day: ResolvedDay;
  /** True when this slot is showing something other than the scheduled food. */
  isSwapped: (slot: Slot) => boolean;
  /** Advance to the next eligible food for the slot. Wraps to the original. */
  swap: (slot: Slot) => void;
  /** Jump straight back to what the plan actually says. */
  resetSwap: (slot: Slot) => void;
  isMade: (slot: Slot) => boolean;
  toggleMade: (slot: Slot) => void;
  madeCount: number;
}

/**
 * Everything the Today screen needs for one date, with swaps and "Made it"
 * read from and written back to localStorage.
 *
 * Both are stored per date, never per day-of-cycle: swapping today's lunch
 * must not silently rewrite the same weekday next week.
 */
export function useDay(date: ISODate): DayState {
  const swaps = useStore(swapStore);
  const made = useStore(madeStore);

  const overrides = swaps[date] as DayOverrides | undefined;
  const madeToday = made[date];

  const day = useMemo(() => resolveDay(date, overrides ?? {}), [date, overrides]);

  const isSwapped = useCallback(
    (slot: Slot) => day.meals[slot].id !== dayPlanFor(date).meals[slot],
    [day, date],
  );

  const swap = useCallback(
    (slot: Slot) => {
      const scheduled = dayPlanFor(date).meals[slot];
      const next = nextSwap(slot, scheduled, day.meals[slot].id);
      const current = swapStore.get();
      const forDate = { ...current[date] };

      // Landing back on the scheduled food clears the entry rather than
      // storing a no-op, so the saved data stays readable.
      if (next.id === scheduled) delete forDate[slot];
      else forDate[slot] = next.id;

      swapStore.set(withDate(current, date, forDate));
    },
    [date, day],
  );

  const resetSwap = useCallback(
    (slot: Slot) => {
      const current = swapStore.get();
      const forDate = { ...current[date] };
      delete forDate[slot];
      swapStore.set(withDate(current, date, forDate));
    },
    [date],
  );

  const isMade = useCallback((slot: Slot) => madeToday?.[slot] === true, [madeToday]);

  const toggleMade = useCallback(
    (slot: Slot) => {
      const current = madeStore.get();
      const forDate = { ...current[date] };
      if (forDate[slot]) delete forDate[slot];
      else forDate[slot] = true;
      madeStore.set(withDate(current, date, forDate));
    },
    [date],
  );

  const madeCount = madeToday ? Object.values(madeToday).filter(Boolean).length : 0;

  return { day, isSwapped, swap, resetSwap, isMade, toggleMade, madeCount };
}

/** Sets one date's entry, dropping the key entirely when it empties out. */
function withDate<T extends Record<string, unknown>>(
  record: Record<string, T>,
  date: ISODate,
  value: T,
): Record<string, T> {
  const next = { ...record };
  if (Object.keys(value).length === 0) delete next[date];
  else next[date] = value;
  return next;
}
