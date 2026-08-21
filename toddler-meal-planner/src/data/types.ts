/**
 * Core domain types for the toddler meal planner.
 *
 * Everything the UI renders is derived from these. Adding a food or changing
 * the rotation should never require touching a component — edit `foods.ts`
 * and `cycle.ts` only.
 */

/** The five eating occasions in a day, in the order they are served. */
export type Slot =
  | 'breakfast'
  | 'morningSnack'
  | 'lunch'
  | 'afternoonSnack'
  | 'dinner';

export const SLOTS: readonly Slot[] = [
  'breakfast',
  'morningSnack',
  'lunch',
  'afternoonSnack',
  'dinner',
] as const;

export const SLOT_LABELS: Record<Slot, string> = {
  breakfast: 'Breakfast',
  morningSnack: 'Morning Snack',
  lunch: 'Lunch',
  afternoonSnack: 'Afternoon Snack',
  dinner: 'Dinner',
};

/**
 * Nutrition tags. These are the levers the meal plan actually cares about for
 * a vegetarian 13-month-old. Deliberately no calories and no macros: the plan
 * document establishes protein is already ~2x requirement, so counting it
 * would be noise that competes with the real gaps (iron, DHA, choline, fat).
 */
export type Tag =
  | 'iron'
  | 'protein'
  | 'choline'
  | 'omega3'
  | 'fat'
  | 'calcium'
  | 'zinc'
  | 'vitaminC';

export const TAG_LABELS: Record<Tag, string> = {
  iron: 'Iron',
  protein: 'Protein',
  choline: 'Choline',
  omega3: 'Omega-3',
  fat: 'Fat',
  calcium: 'Calcium',
  zinc: 'Zinc',
  vitaminC: 'Vitamin C',
};

/** Aisle grouping for the generated shopping list. */
export type GroceryCategory = 'produce' | 'dairy' | 'grainsAndLentils' | 'pantry';

export const GROCERY_CATEGORY_LABELS: Record<GroceryCategory, string> = {
  produce: 'Produce',
  dairy: 'Dairy',
  grainsAndLentils: 'Grains & Lentils',
  pantry: 'Pantry',
};

/** One shopping-list line contributed by a food. */
export interface Ingredient {
  /** Shopping-list wording, e.g. "moong dal". Deduped across foods by this string. */
  item: string;
  category: GroceryCategory;
  /**
   * Staples you almost certainly already have (ghee, salt, jeera). Kept in the
   * data so the list can offer them, but they sort last and start unchecked.
   */
  staple?: boolean;
}

export type FoodId = string;

export interface Food {
  id: FoodId;
  /** Shown large on the card. Keep it readable at arm's length. */
  name: string;
  /** Which slots this food may occupy. Drives the Swap button's candidate set. */
  slots: Slot[];
  tags: Tag[];
  /** One line, shown on tap. Why this food is on the plan at all. */
  why: string;
  prepMinutes: number;
  /**
   * True when the food carries iron but does not already include a vitamin C
   * source. Shows the "pair with lemon / orange" badge.
   */
  needsVitaminC?: boolean;
  /** Prep or safety note, e.g. "mash well", "no chili". */
  notes?: string;
  /** Ingredients for the grocery list. */
  ingredients: Ingredient[];
  /**
   * Age gating, for when the plan evolves past 18 months and 2 years.
   * Unset means "fine from 12 months". Nothing filters on this yet; the field
   * exists so adding the filter later is a data change, not a schema change.
   */
  minAgeMonths?: number;
  maxAgeMonths?: number;
}

/** One day of the rotation. Meals reference food IDs, never inline objects. */
export interface DayPlan {
  /** Stable key, e.g. "day-1". Used in localStorage keys, so do not renumber. */
  id: string;
  /** Short note about the day's shape, e.g. "Light reset day". */
  label: string;
  meals: Record<Slot, FoodId>;
}

/** A day's plan resolved to actual Food objects, ready to render. */
export interface ResolvedDay {
  date: string;
  /** 0-based position in the cycle. */
  dayIndex: number;
  /** 1-based, for display: "Day 3 of 7". */
  dayNumber: number;
  cycleLength: number;
  label: string;
  meals: Record<Slot, Food>;
}
