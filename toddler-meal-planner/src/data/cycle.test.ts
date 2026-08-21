import { describe, expect, it } from 'vitest';
import { ANCHOR, CYCLE, CYCLE_LENGTH } from './cycle';
import { foodExists, getFood } from './foods';
import { SLOTS } from './types';
import { isISODate } from '../lib/date';

describe('cycle integrity', () => {
  it('derives CYCLE_LENGTH from the data, so a 10- or 14-day plan is a data edit', () => {
    expect(CYCLE_LENGTH).toBe(CYCLE.length);
    expect(CYCLE_LENGTH).toBeGreaterThan(0);
  });

  it('has a valid anchor date', () => {
    expect(isISODate(ANCHOR)).toBe(true);
  });

  it('has unique day ids', () => {
    const ids = CYCLE.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('fills all five slots on every day', () => {
    for (const day of CYCLE) {
      for (const slot of SLOTS) {
        expect(day.meals[slot], `${day.id}.${slot}`).toBeTruthy();
      }
      expect(Object.keys(day.meals).sort()).toEqual([...SLOTS].sort());
    }
  });

  it('references only foods that exist', () => {
    for (const day of CYCLE) {
      for (const slot of SLOTS) {
        expect(foodExists(day.meals[slot]), `${day.id}.${slot} -> ${day.meals[slot]}`).toBe(true);
      }
    }
  });

  it('only puts a food in a slot it is allowed to occupy', () => {
    for (const day of CYCLE) {
      for (const slot of SLOTS) {
        const food = getFood(day.meals[slot]);
        expect(food.slots, `${food.id} in ${day.id}.${slot}`).toContain(slot);
      }
    }
  });

  it('labels every day', () => {
    for (const day of CYCLE) {
      expect(day.label.trim(), day.id).not.toBe('');
    }
  });
});

describe('the cycle matches toddler-7-day-meal-plan.md', () => {
  it('runs seven days', () => {
    expect(CYCLE_LENGTH).toBe(7);
  });

  it('keeps the named iron anchors from the plan on their stated days', () => {
    const dayHas = (dayNumber: number, foodId: string): boolean =>
      SLOTS.some((slot) => CYCLE[dayNumber - 1]?.meals[slot] === foodId);

    // "Chana sattu halwa — Days 5, 7. Your best single item."
    expect(dayHas(5, 'chana-sattu-halwa')).toBe(true);
    expect(dayHas(7, 'chana-sattu-halwa')).toBe(true);
    // "Ragi porridge — Days 2, 4" (day 4 is the ragi/millet khichdi at dinner)
    expect(dayHas(2, 'ragi-porridge')).toBe(true);
    expect(dayHas(4, 'ragi-khichdi')).toBe(true);
    // "Rajma — Day 3", "Kala chana — Day 6"
    expect(dayHas(3, 'rajma-rice')).toBe(true);
    expect(dayHas(6, 'kala-chana-rice')).toBe(true);
    // "Palak — Days 6, 7"
    expect(dayHas(6, 'stuffed-paratha-curd')).toBe(true);
    expect(dayHas(7, 'palak-paneer-rice')).toBe(true);
    // "Raisins — Day 2"
    expect(dayHas(2, 'banana-raisins')).toBe(true);
  });

  it('gives every day at least one iron anchor', () => {
    for (const day of CYCLE) {
      const ironSlots = SLOTS.filter((slot) => getFood(day.meals[slot]).tags.includes('iron'));
      expect(ironSlots.length, `${day.id} has no iron anchor`).toBeGreaterThan(0);
    }
  });

  it('either carries vitamin C or flags its iron meals for pairing, every day', () => {
    // The plan says to pair each iron anchor with lemon / orange / tomato.
    // Some days do that with a scheduled food; the rest rely on the badge.
    for (const day of CYCLE) {
      const foods = SLOTS.map((slot) => getFood(day.meals[slot]));
      const carriesC = foods.some((f) => f.tags.includes('vitaminC'));
      const flagsPairing = foods.some((f) => f.needsVitaminC === true);
      expect(carriesC || flagsPairing, `${day.id} pairs its iron with nothing`).toBe(true);
    }
  });

  it('records the days that carry no vitamin C at all and lean on the badge', () => {
    // Two of the heaviest iron days have no vitamin C food scheduled anywhere
    // in them, as the plan is written: day 2 (ragi + raisins + dal) and day 5
    // (sattu halwa + dal dalia). The pairing badge is doing all the work on
    // those days. Pinned so it stays a deliberate decision, not a surprise —
    // add an orange to either snack and this list shrinks.
    const daysWithoutVitaminC = CYCLE.filter(
      (day) => !SLOTS.some((slot) => getFood(day.meals[slot]).tags.includes('vitaminC')),
    ).map((day) => day.id);
    expect(daysWithoutVitaminC).toEqual(['day-2', 'day-5']);
  });

  it('does not repeat a food twice in one day', () => {
    for (const day of CYCLE) {
      const ids = SLOTS.map((slot) => day.meals[slot]);
      expect(new Set(ids).size, `${day.id} repeats a food`).toBe(ids.length);
    }
  });

  it('keeps total cooking time realistic — a guard against a mistyped prepMinutes', () => {
    for (const day of CYCLE) {
      const minutes = SLOTS.reduce((sum, slot) => sum + getFood(day.meals[slot]).prepMinutes, 0);
      expect(minutes, day.id).toBeGreaterThan(30);
      expect(minutes, day.id).toBeLessThanOrEqual(120);
    }
  });
});
