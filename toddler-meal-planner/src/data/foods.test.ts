import { describe, expect, it } from 'vitest';
import { FOODS, foodExists, getFood } from './foods';
import { SLOTS } from './types';
import type { Slot } from './types';

describe('food library integrity', () => {
  it('has unique ids', () => {
    const ids = FOODS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses url-safe kebab-case ids, since they end up in storage keys', () => {
    for (const food of FOODS) {
      expect(food.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('gives every food somewhere to go, a reason to be there, and a prep time', () => {
    for (const food of FOODS) {
      expect(food.name.trim(), food.id).not.toBe('');
      expect(food.slots.length, food.id).toBeGreaterThan(0);
      expect(food.tags.length, food.id).toBeGreaterThan(0);
      expect(food.why.trim(), food.id).not.toBe('');
      expect(food.prepMinutes, food.id).toBeGreaterThan(0);
      expect(food.ingredients.length, food.id).toBeGreaterThan(0);
    }
  });

  it('lists no duplicate slots, tags or ingredients within a food', () => {
    for (const food of FOODS) {
      expect(new Set(food.slots).size, food.id).toBe(food.slots.length);
      expect(new Set(food.tags).size, food.id).toBe(food.tags.length);
      const items = food.ingredients.map((i) => i.item);
      expect(new Set(items).size, food.id).toBe(items.length);
    }
  });

  it('spells the same ingredient the same way everywhere, so the grocery list dedupes', () => {
    const byLowercase = new Map<string, Set<string>>();
    for (const food of FOODS) {
      for (const ingredient of food.ingredients) {
        const key = ingredient.item.toLowerCase();
        const seen = byLowercase.get(key) ?? new Set<string>();
        seen.add(ingredient.item);
        byLowercase.set(key, seen);
      }
    }
    for (const [key, variants] of byLowercase) {
      expect([...variants], `"${key}" is written more than one way`).toHaveLength(1);
    }
  });

  it('files each ingredient under one category', () => {
    const categories = new Map<string, string>();
    for (const food of FOODS) {
      for (const { item, category } of food.ingredients) {
        const existing = categories.get(item);
        if (existing) expect(category, `${item} in ${food.id}`).toBe(existing);
        categories.set(item, category);
      }
    }
  });

  it('flags exactly the iron foods that carry no vitamin C of their own', () => {
    // This invariant is what makes the "pair with lemon / orange" badge
    // trustworthy: rajma (chopped tomato) and khichdi (squeeze of lemon)
    // must not show it, ragi porridge and sattu halwa must.
    for (const food of FOODS) {
      const shouldFlag = food.tags.includes('iron') && !food.tags.includes('vitaminC');
      expect(food.needsVitaminC === true, `${food.id} needsVitaminC`).toBe(shouldFlag);
    }
  });

  it('only marks weekly iron anchors on foods that actually carry iron', () => {
    for (const food of FOODS) {
      if (food.weeklyIronAnchor) {
        expect(food.tags, `${food.id} is an anchor with no iron tag`).toContain('iron');
      }
    }
  });

  it('marks exactly the anchors the plan names by hand', () => {
    // "Weekly Iron Anchors" in toddler-7-day-meal-plan.md: sattu halwa, ragi,
    // rajma, kala chana, palak, raisins. Everyday dal is deliberately not one
    // — that distinction is what keeps milk warnings meaningful.
    const anchors = FOODS.filter((f) => f.weeklyIronAnchor).map((f) => f.id).sort();
    expect(anchors).toEqual([
      'banana-raisins',
      'banana-raisins-orange',
      'chana-sattu-halwa',
      'kala-chana-rice',
      'lobia-rice',
      'palak-paneer-rice',
      'ragi-khichdi',
      'ragi-porridge',
      'rajma-rice',
      'stuffed-paratha-curd',
    ]);
  });

  it('keeps prep times plausible for a weekday morning', () => {
    for (const food of FOODS) {
      expect(food.prepMinutes, food.id).toBeLessThanOrEqual(45);
    }
  });
});

describe('slot coverage', () => {
  it('offers real alternatives in every slot, so Swap is never a dead button', () => {
    for (const slot of SLOTS) {
      const eligible = FOODS.filter((f) => f.slots.includes(slot));
      expect(eligible.length, slot).toBeGreaterThanOrEqual(3);
    }
  });

  it('can build an all-iron day if every slot were swapped toward iron', () => {
    for (const slot of SLOTS) {
      const ironOptions = FOODS.filter(
        (f) => f.slots.includes(slot) && f.tags.includes('iron'),
      );
      expect(ironOptions.length, `no iron option for ${slot}`).toBeGreaterThan(0);
    }
  });

  it('offers a vitamin C option in both snack slots, for pairing with iron', () => {
    for (const slot of ['morningSnack', 'afternoonSnack'] as Slot[]) {
      const cOptions = FOODS.filter((f) => f.slots.includes(slot) && f.tags.includes('vitaminC'));
      expect(cOptions.length, slot).toBeGreaterThan(0);
    }
  });
});

describe('getFood', () => {
  it('returns the food for a known id', () => {
    expect(getFood('chana-sattu-halwa').name).toMatch(/sattu/i);
  });

  it('throws loudly on an unknown id rather than rendering blank', () => {
    expect(() => getFood('nope')).toThrow(/Unknown food id/);
    expect(foodExists('nope')).toBe(false);
    expect(foodExists('chana-sattu-halwa')).toBe(true);
  });
});
