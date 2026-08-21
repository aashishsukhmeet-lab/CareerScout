import { FOODS, getFood } from '../data/foods';
import type { Food, FoodId, Slot } from '../data/types';

/**
 * Swap ordering.
 *
 * Tapping Swap walks a fixed ring of foods eligible for that slot and
 * eventually returns to the scheduled food, so a wrong tap is always one more
 * tap from being undone. The ring is derived from the scheduled food (not the
 * currently shown one), so it never wanders as you tap.
 *
 * Ordering is deterministic — no randomness anywhere in the app — and prefers
 * candidates that share tags with what they are replacing, so swapping does
 * not quietly flatten the day's nutrition profile.
 */

/** Losing the day's iron anchor is the failure that actually matters. */
const IRON_MATCH_BONUS = 3;

function overlapScore(scheduled: Food, candidate: Food): number {
  const shared = candidate.tags.filter((tag) => scheduled.tags.includes(tag));
  const ironBonus =
    scheduled.tags.includes('iron') && candidate.tags.includes('iron') ? IRON_MATCH_BONUS : 0;
  return shared.length + ironBonus;
}

/** Every food that may occupy this slot, in library order. */
export function eligibleFoods(slot: Slot): Food[] {
  return FOODS.filter((food) => food.slots.includes(slot));
}

/**
 * The scheduled food first, then its alternates ranked by tag overlap.
 * Ties break on library order, so the ring is stable across devices and reloads.
 */
export function swapRing(slot: Slot, scheduledId: FoodId): Food[] {
  const scheduled = getFood(scheduledId);
  const alternates = eligibleFoods(slot)
    .filter((food) => food.id !== scheduledId)
    .map((food, index) => ({ food, index, score: overlapScore(scheduled, food) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.food);

  return [scheduled, ...alternates];
}

/**
 * The next food in the ring after `currentId`. Wraps back to the scheduled
 * food at the end. An unknown `currentId` (stale localStorage) restarts the
 * ring rather than throwing.
 */
export function nextSwap(slot: Slot, scheduledId: FoodId, currentId: FoodId): Food {
  const ring = swapRing(slot, scheduledId);
  const position = ring.findIndex((food) => food.id === currentId);
  const next = ring[(position + 1) % ring.length];
  if (!next) {
    // Unreachable while the ring always contains the scheduled food.
    throw new Error(`Empty swap ring for slot "${slot}"`);
  }
  return next;
}
