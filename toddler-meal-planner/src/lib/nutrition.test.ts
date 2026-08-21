import { describe, expect, it } from 'vitest';
import { ANCHOR } from '../data/cycle';
import { getFood } from '../data/foods';
import { addDays } from './date';
import {
  MILK_SLOTS,
  MILK_TARGET_MAX_OZ,
  MILK_TARGET_MIN_OZ,
  SUPPLEMENTS,
  conflictingMilkSlots,
  dayPrepMinutes,
  dayTags,
  dayWarnings,
  hasIronAnchor,
  ironAnchorSlots,
  isIronAnchor,
  milkConflictsWith,
  milkTotalStatus,
  needsVitaminCPairing,
  unpairedIronSlots,
} from './nutrition';
import { resolveDay } from './rotation';

/** Day N of the cycle, 1-based, as the meal plan numbers them. */
const planDay = (n: number) => resolveDay(addDays(ANCHOR, n - 1));

describe('iron anchors', () => {
  it('recognises the anchors the plan names', () => {
    expect(isIronAnchor(getFood('chana-sattu-halwa'))).toBe(true);
    expect(isIronAnchor(getFood('rajma-rice'))).toBe(true);
    expect(isIronAnchor(getFood('kala-chana-rice'))).toBe(true);
    expect(isIronAnchor(getFood('ragi-porridge'))).toBe(true);
    expect(isIronAnchor(getFood('banana-raisins'))).toBe(true);
    expect(isIronAnchor(getFood('paneer-cucumber'))).toBe(false);
    expect(isIronAnchor(getFood('papaya-chikoo'))).toBe(false);
  });

  it('finds one on every scheduled day', () => {
    for (let n = 1; n <= 7; n += 1) {
      expect(hasIronAnchor(planDay(n)), `day ${n}`).toBe(true);
      expect(ironAnchorSlots(planDay(n)).length, `day ${n}`).toBeGreaterThan(0);
    }
  });

  it('warns when swaps strip the iron out of a day', () => {
    const day = resolveDay(ANCHOR);
    expect(dayWarnings(day)).toEqual([]);

    // Day 1 leans on the khichdi at lunch and the oatmeal at breakfast.
    const stripped = resolveDay(ANCHOR, {
      breakfast: 'suji-upma',
      lunch: 'curd-rice',
      dinner: 'veg-pulao-yogurt',
    });
    expect(hasIronAnchor(stripped)).toBe(false);
    expect(dayWarnings(stripped)).toHaveLength(1);
    expect(dayWarnings(stripped)[0]?.kind).toBe('noIronAnchor');
  });
});

describe('vitamin C pairing', () => {
  it('badges iron foods that bring no vitamin C of their own', () => {
    expect(needsVitaminCPairing(getFood('ragi-porridge'))).toBe(true);
    expect(needsVitaminCPairing(getFood('chana-sattu-halwa'))).toBe(true);
    expect(needsVitaminCPairing(getFood('kala-chana-rice'))).toBe(true);
  });

  it('does not badge iron foods that already include the vitamin C', () => {
    // Rajma is served with chopped tomato, khichdi with a squeeze of lemon.
    expect(needsVitaminCPairing(getFood('rajma-rice'))).toBe(false);
    expect(needsVitaminCPairing(getFood('moong-khichdi'))).toBe(false);
    expect(needsVitaminCPairing(getFood('poha'))).toBe(false);
  });

  it('does not badge foods with no iron to absorb', () => {
    expect(needsVitaminCPairing(getFood('curd-rice'))).toBe(false);
    expect(needsVitaminCPairing(getFood('avocado-toast'))).toBe(false);
  });

  it('stays quiet when something else in the day already supplies vitamin C', () => {
    // Day 1: the orange at morning snack covers the day.
    expect(unpairedIronSlots(planDay(1))).toEqual([]);
    // Day 3: papaya at morning snack, tomato with the rajma.
    expect(unpairedIronSlots(planDay(3))).toEqual([]);
  });

  it('speaks up on the two days that schedule no vitamin C at all', () => {
    expect(unpairedIronSlots(planDay(2)).length).toBeGreaterThan(0);
    expect(unpairedIronSlots(planDay(5)).length).toBeGreaterThan(0);
  });
});

describe('milk timing', () => {
  it('warns when milk lands on an iron meal, because calcium blocks iron', () => {
    // Day 2 breakfast is ragi porridge — an iron anchor.
    const day2 = planDay(2);
    expect(milkConflictsWith(day2, 'morning')?.id).toBe('ragi-porridge');
    expect(conflictingMilkSlots(day2)).toContain('morning');

    // Day 2 dinner is dal + roti, so bedtime milk collides too.
    expect(milkConflictsWith(day2, 'bedtime')?.id).toBe('dal-roti');
  });

  it('stays quiet when the paired meal carries no iron', () => {
    // Day 4 afternoon snack is sweet potato fingers — fat and vitamin C, no iron.
    expect(milkConflictsWith(planDay(4), 'afternoon')).toBeNull();
    expect(conflictingMilkSlots(planDay(4))).not.toContain('afternoon');
  });

  it('re-checks against swaps rather than the printed plan', () => {
    const swapped = resolveDay(ANCHOR, { afternoonSnack: 'chana-sattu-halwa' });
    expect(milkConflictsWith(swapped, 'afternoon')?.id).toBe('chana-sattu-halwa');
  });

  it('covers all three milk slots', () => {
    expect(MILK_SLOTS).toEqual(['morning', 'afternoon', 'bedtime']);
  });

  it('scores the daily total against the 18-22 oz target', () => {
    expect(milkTotalStatus(0)).toBe('under');
    expect(milkTotalStatus(MILK_TARGET_MIN_OZ - 1)).toBe('under');
    expect(milkTotalStatus(MILK_TARGET_MIN_OZ)).toBe('onTarget');
    expect(milkTotalStatus(20)).toBe('onTarget');
    expect(milkTotalStatus(MILK_TARGET_MAX_OZ)).toBe('onTarget');
    expect(milkTotalStatus(MILK_TARGET_MAX_OZ + 1)).toBe('over');
  });
});

describe('supplements', () => {
  it('tracks the three the plan raises with a pediatrician', () => {
    expect(SUPPLEMENTS.map((s) => s.id)).toEqual(['vitaminD', 'b12', 'dha']);
    for (const supplement of SUPPLEMENTS) {
      expect(supplement.name.trim()).not.toBe('');
      expect(supplement.detail.trim()).not.toBe('');
    }
  });
});

describe('day summaries', () => {
  it('collects every tag in the day without duplicates', () => {
    const tags = dayTags(planDay(1));
    expect(new Set(tags).size).toBe(tags.length);
    expect(tags).toContain('iron');
    expect(tags).toContain('omega3');
  });

  it('adds up the cooking time', () => {
    const day = planDay(1);
    const expected =
      day.meals.breakfast.prepMinutes +
      day.meals.morningSnack.prepMinutes +
      day.meals.lunch.prepMinutes +
      day.meals.afternoonSnack.prepMinutes +
      day.meals.dinner.prepMinutes;
    expect(dayPrepMinutes(day)).toBe(expected);
  });
});
