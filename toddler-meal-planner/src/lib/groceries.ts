import { SLOTS } from '../data/types';
import type { GroceryCategory } from '../data/types';
import { resolveDay, type DayOverrides } from './rotation';
import type { ISODate } from './date';

/**
 * The shopping list is derived, never stored: it is the ingredients of
 * whatever is actually scheduled over the window, swaps included. Change a
 * swap and the list changes with it.
 */

export interface GroceryItem {
  item: string;
  category: GroceryCategory;
  /** Ghee, jeera, turmeric — worth listing, not worth leading with. */
  staple: boolean;
  /** How many meals across the window need it. */
  mealCount: number;
  /** Which meals, for the line under the item. */
  usedIn: string[];
}

export interface GroceryGroup {
  category: GroceryCategory;
  items: GroceryItem[];
}

/** Rough order of a shop: fresh first, cupboard last. */
const CATEGORY_ORDER: GroceryCategory[] = ['produce', 'dairy', 'grainsAndLentils', 'pantry'];

/**
 * Builds the list for a set of dates.
 *
 * A food cooked on three different days is one line on the list, not three —
 * you buy the dal once. `mealCount` carries the multiplicity instead, which is
 * the bit that actually tells you how much to buy.
 */
export function buildGroceryList(
  dates: ISODate[],
  overridesByDate: Record<ISODate, DayOverrides> = {},
): GroceryGroup[] {
  const items = new Map<string, GroceryItem>();

  for (const date of dates) {
    const day = resolveDay(date, overridesByDate[date] ?? {});
    for (const slot of SLOTS) {
      const food = day.meals[slot];
      for (const ingredient of food.ingredients) {
        const existing = items.get(ingredient.item);
        if (existing) {
          existing.mealCount += 1;
          if (!existing.usedIn.includes(food.name)) existing.usedIn.push(food.name);
        } else {
          items.set(ingredient.item, {
            item: ingredient.item,
            category: ingredient.category,
            staple: ingredient.staple === true,
            mealCount: 1,
            usedIn: [food.name],
          });
        }
      }
    }
  }

  return CATEGORY_ORDER.map((category) => ({
    category,
    items: [...items.values()]
      .filter((item) => item.category === category)
      // Staples sink to the bottom of their aisle; everything else is
      // alphabetical so the list reads the same way every week.
      .sort(
        (a, b) => Number(a.staple) - Number(b.staple) || a.item.localeCompare(b.item),
      ),
  })).filter((group) => group.items.length > 0);
}

/** Total lines on the list, for the header count. */
export function countItems(groups: GroceryGroup[]): number {
  return groups.reduce((total, group) => total + group.items.length, 0);
}
