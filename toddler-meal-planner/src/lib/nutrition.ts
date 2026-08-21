import { SLOTS } from '../data/types';
import type { Food, ResolvedDay, Slot, Tag } from '../data/types';

/**
 * The nutrition rules from toddler-7-day-meal-plan.md, encoded.
 *
 * Deliberately absent: calories, macros, protein totals. The plan document is
 * explicit that protein already runs at roughly double requirement at this
 * age, so counting it would be noise competing for attention with the actual
 * gaps — iron, DHA, choline and total fat.
 */

// ---------------------------------------------------------------- iron anchor

/** A food is an iron anchor if it carries the iron tag. */
export function isIronAnchor(food: Food): boolean {
  return food.tags.includes('iron');
}

/**
 * The heavy lifters the plan names by hand: chana, rajma, ragi, palak, sattu
 * halwa, raisins. Everyday dal carries iron too, but is not one of these.
 *
 * The distinction exists because dal is in most meals. Keying milk warnings
 * off the iron tag would put a warning on nearly every pour, which is the
 * fastest way to teach someone to ignore all of them.
 */
export function isWeeklyIronAnchor(food: Food): boolean {
  return food.weeklyIronAnchor === true;
}

export function weeklyIronAnchorSlots(day: ResolvedDay): Slot[] {
  return SLOTS.filter((slot) => isWeeklyIronAnchor(day.meals[slot]));
}

/**
 * Every day in the rotation ships with at least one iron anchor. This check
 * earns its keep after swaps: trade the rajma out for curd rice and the Week
 * view should say so.
 */
export function hasIronAnchor(day: ResolvedDay): boolean {
  return SLOTS.some((slot) => isIronAnchor(day.meals[slot]));
}

export function ironAnchorSlots(day: ResolvedDay): Slot[] {
  return SLOTS.filter((slot) => isIronAnchor(day.meals[slot]));
}

// ------------------------------------------------------------ vitamin C pairing

/**
 * Iron without vitamin C alongside is iron that mostly leaves again. Foods
 * that carry iron but no built-in C source are flagged in the data with
 * `needsVitaminC`; this is the badge test.
 */
export function needsVitaminCPairing(food: Food): boolean {
  return food.needsVitaminC === true;
}

export function hasVitaminC(food: Food): boolean {
  return food.tags.includes('vitaminC');
}

/**
 * Slots that want a lemon/orange alongside AND have no vitamin C food
 * elsewhere in the day to lean on. Used to decide how loudly to show the badge.
 */
export function unpairedIronSlots(day: ResolvedDay): Slot[] {
  const dayHasVitaminC = SLOTS.some((slot) => hasVitaminC(day.meals[slot]));
  if (dayHasVitaminC) return [];
  return SLOTS.filter((slot) => needsVitaminCPairing(day.meals[slot]));
}

// ---------------------------------------------------------------- milk timing

export type MilkSlot = 'morning' | 'afternoon' | 'bedtime';

export const MILK_SLOTS: readonly MilkSlot[] = ['morning', 'afternoon', 'bedtime'] as const;

export const MILK_SLOT_LABELS: Record<MilkSlot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  bedtime: 'Bedtime',
};

/** Typical pour per slot, from the plan's milk schedule table. */
export const MILK_SLOT_OUNCES: Record<MilkSlot, number> = {
  morning: 6,
  afternoon: 6,
  bedtime: 7,
};

/** 18–22 oz/day of whole milk. Not reduced-fat, through age 2. */
export const MILK_TARGET_MIN_OZ = 18;
export const MILK_TARGET_MAX_OZ = 22;

/**
 * Which meal each milk slot lands next to, per the plan's schedule:
 * morning milk with or after breakfast, afternoon milk at the afternoon snack,
 * bedtime milk after dinner.
 */
export const MILK_SLOT_MEAL: Record<MilkSlot, Slot> = {
  morning: 'breakfast',
  afternoon: 'afternoonSnack',
  bedtime: 'dinner',
};

/**
 * Calcium blocks iron absorption, so milk landing on an iron meal wastes the
 * iron. Water with that meal instead — that is the warning this drives.
 *
 * Scoped to the plan's named weekly anchors, not every iron-tagged food. With
 * dal in most meals, the broader test fires on three pours a day and stops
 * being read; this way it lands roughly once a day, on the meal where losing
 * the iron actually costs something.
 */
export function milkConflictsWith(day: ResolvedDay, milkSlot: MilkSlot): Food | null {
  const food = day.meals[MILK_SLOT_MEAL[milkSlot]];
  return isWeeklyIronAnchor(food) ? food : null;
}

export function conflictingMilkSlots(day: ResolvedDay): MilkSlot[] {
  return MILK_SLOTS.filter((slot) => milkConflictsWith(day, slot) !== null);
}

export function milkTotalStatus(totalOz: number): 'under' | 'onTarget' | 'over' {
  if (totalOz < MILK_TARGET_MIN_OZ) return 'under';
  if (totalOz > MILK_TARGET_MAX_OZ) return 'over';
  return 'onTarget';
}

// ------------------------------------------------------------- supplements

/**
 * The three the plan says to discuss with a pediatrician. Daily checkboxes,
 * reset at midnight.
 */
export const SUPPLEMENTS = [
  {
    id: 'vitaminD',
    name: 'Vitamin D',
    detail: '400 IU — the standard daily dose',
  },
  {
    id: 'b12',
    name: 'B12',
    detail: 'The classic vegetarian gap, even with dairy',
  },
  {
    id: 'dha',
    name: 'Algae DHA',
    detail: 'Without fish, the only direct source — flax only converts 1–5%',
  },
] as const;

export type SupplementId = (typeof SUPPLEMENTS)[number]['id'];

/**
 * The plan's "Daily Add-Ins" — the three things that go into whatever is
 * already being cooked. Easy to forget precisely because they belong to no
 * particular meal, which is why Today shows them every day.
 */
export const DAILY_ADD_INS = [
  {
    id: 'ghee',
    name: 'Ghee',
    detail: 'In nearly everything — he needs the fat, not less of it',
  },
  {
    id: 'omega3',
    name: 'Ground flax, chia or walnut',
    detail: 'Half a teaspoon stirred into porridge, oatmeal or yogurt',
  },
  {
    id: 'zinc',
    name: 'Pumpkin seed powder',
    detail: 'A sprinkle, for zinc',
  },
] as const;

// ------------------------------------------------------------------ day tags

/** Every tag present across a day's five meals, deduped. */
export function dayTags(day: ResolvedDay): Tag[] {
  const seen = new Set<Tag>();
  for (const slot of SLOTS) {
    for (const tag of day.meals[slot].tags) seen.add(tag);
  }
  return [...seen];
}

/** Total hands-on cooking time for the day, in minutes. */
export function dayPrepMinutes(day: ResolvedDay): number {
  return SLOTS.reduce((total, slot) => total + day.meals[slot].prepMinutes, 0);
}

/** The one balance check that ships: a day with no iron anchor is flagged. */
export interface DayWarning {
  kind: 'noIronAnchor';
  message: string;
}

export function dayWarnings(day: ResolvedDay): DayWarning[] {
  const warnings: DayWarning[] = [];
  if (!hasIronAnchor(day)) {
    warnings.push({
      kind: 'noIronAnchor',
      message: 'No iron anchor today — swap dal, chana or ragi into a slot.',
    });
  }
  return warnings;
}
