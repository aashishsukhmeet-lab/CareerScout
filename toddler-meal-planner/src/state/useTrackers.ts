import { useCallback, useMemo } from 'react';
import type { SupplementId } from '../lib/nutrition';
import {
  MILK_SLOTS,
  MILK_SLOT_OUNCES,
  SUPPLEMENTS,
  milkTotalStatus,
  type MilkSlot,
} from '../lib/nutrition';
import { addDays, type ISODate } from '../lib/date';
import { milkStore, supplementStore, useStore } from '../lib/storage';

export interface DayTrackers {
  isMilkLogged: (slot: MilkSlot) => boolean;
  toggleMilk: (slot: MilkSlot) => void;
  totalOz: number;
  milkStatus: 'under' | 'onTarget' | 'over';
  isSupplementTaken: (id: SupplementId) => boolean;
  toggleSupplement: (id: SupplementId) => void;
  supplementCount: number;
  /** Most recent last, oldest first — for the little history strip. */
  history: HistoryEntry[];
}

export interface HistoryEntry {
  date: ISODate;
  ounces: number;
  supplements: number;
}

/**
 * Milk and supplement logs for one date.
 *
 * Everything is keyed by date, which is what makes "resets at midnight" true
 * without a timer: tomorrow is simply a key that has nothing in it yet.
 */
export function useTrackers(date: ISODate, historyDays = 7): DayTrackers {
  const milk = useStore(milkStore);
  const supplements = useStore(supplementStore);

  const milkToday = milk[date];
  const supplementsToday = supplements[date];

  const isMilkLogged = useCallback((slot: MilkSlot) => milkToday?.[slot] === true, [milkToday]);

  const toggleMilk = useCallback(
    (slot: MilkSlot) => {
      const current = milkStore.get();
      const forDate = { ...current[date] };
      if (forDate[slot]) delete forDate[slot];
      else forDate[slot] = true;
      milkStore.set(withDate(current, date, forDate));
    },
    [date],
  );

  const totalOz = useMemo(
    () => MILK_SLOTS.reduce((sum, slot) => sum + (milkToday?.[slot] ? MILK_SLOT_OUNCES[slot] : 0), 0),
    [milkToday],
  );

  const isSupplementTaken = useCallback(
    (id: SupplementId) => supplementsToday?.[id] === true,
    [supplementsToday],
  );

  const toggleSupplement = useCallback(
    (id: SupplementId) => {
      const current = supplementStore.get();
      const forDate = { ...current[date] };
      if (forDate[id]) delete forDate[id];
      else forDate[id] = true;
      supplementStore.set(withDate(current, date, forDate));
    },
    [date],
  );

  const supplementCount = SUPPLEMENTS.filter((s) => supplementsToday?.[s.id] === true).length;

  const history = useMemo(() => {
    return Array.from({ length: historyDays }, (_, i) => {
      const day = addDays(date, i - (historyDays - 1));
      const milkThatDay = milk[day];
      const supplementsThatDay = supplements[day];
      return {
        date: day,
        ounces: MILK_SLOTS.reduce(
          (sum, slot) => sum + (milkThatDay?.[slot] ? MILK_SLOT_OUNCES[slot] : 0),
          0,
        ),
        supplements: SUPPLEMENTS.filter((s) => supplementsThatDay?.[s.id] === true).length,
      };
    });
  }, [date, historyDays, milk, supplements]);

  return {
    isMilkLogged,
    toggleMilk,
    totalOz,
    milkStatus: milkTotalStatus(totalOz),
    isSupplementTaken,
    toggleSupplement,
    supplementCount,
    history,
  };
}

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
