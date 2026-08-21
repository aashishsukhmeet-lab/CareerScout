import type { DayPlan } from './types';

/**
 * The rotation, exactly as written in toddler-7-day-meal-plan.md.
 *
 * TO CHANGE THE CYCLE LENGTH: add or remove DayPlan entries here. Nothing
 * reads a hardcoded 7 — CYCLE_LENGTH is derived from this array's length, so
 * a 10- or 14-day rotation is purely a data edit.
 *
 * DO NOT RENUMBER existing day ids. They are not used as storage keys (dates
 * are), but the Week screen and any saved swap notes read better if "day-3"
 * keeps meaning the rajma day.
 */
export const CYCLE: DayPlan[] = [
  {
    id: 'day-1',
    label: 'Khichdi anchors the iron',
    meals: {
      breakfast: 'banana-oatmeal-flax',
      morningSnack: 'paneer-orange',
      lunch: 'moong-khichdi',
      afternoonSnack: 'yogurt-fruit',
      dinner: 'sweet-potato-paneer-pancakes',
    },
  },
  {
    id: 'day-2',
    label: 'Ragi and dal — heavy iron day',
    meals: {
      breakfast: 'ragi-porridge',
      morningSnack: 'banana-raisins-orange',
      lunch: 'curd-rice',
      afternoonSnack: 'besan-chilla-strips',
      dinner: 'dal-roti',
    },
  },
  {
    id: 'day-3',
    label: 'Rajma day',
    meals: {
      breakfast: 'besan-chilla-veg',
      morningSnack: 'papaya-chikoo',
      lunch: 'rajma-rice',
      afternoonSnack: 'paneer-cucumber',
      dinner: 'moong-veg-soup',
    },
  },
  {
    id: 'day-4',
    label: 'Quickest day to cook',
    meals: {
      breakfast: 'poha',
      morningSnack: 'yogurt-banana',
      lunch: 'paneer-bhurji-paratha',
      afternoonSnack: 'sweet-potato-fingers',
      dinner: 'ragi-khichdi',
    },
  },
  {
    id: 'day-5',
    label: 'Sattu halwa — best iron of the week',
    meals: {
      breakfast: 'idli-dal',
      morningSnack: 'avocado-toast-orange',
      lunch: 'veg-pulao-yogurt',
      afternoonSnack: 'chana-sattu-halwa',
      dinner: 'dal-dalia',
    },
  },
  {
    id: 'day-6',
    label: 'Kala chana and palak — double iron',
    meals: {
      breakfast: 'suji-upma',
      morningSnack: 'paneer-berries',
      lunch: 'kala-chana-rice',
      afternoonSnack: 'dhokla',
      dinner: 'stuffed-paratha-curd',
    },
  },
  {
    id: 'day-7',
    label: 'Light reset day',
    meals: {
      breakfast: 'moong-dal-cheela',
      morningSnack: 'fruit-bowl',
      lunch: 'palak-paneer-rice',
      afternoonSnack: 'chana-sattu-halwa',
      dinner: 'khichdi-yogurt',
    },
  },
];

/**
 * Derived, never hardcoded. Change the array above and every screen follows.
 */
export const CYCLE_LENGTH = CYCLE.length;

/**
 * The fixed origin of the rotation. Day 1 of the cycle falls on this date and
 * every CYCLE_LENGTH days after it, forever, on every device.
 *
 * Do not change this once the app is in use — it would shift the whole
 * rotation out from under anyone mid-week.
 */
export const ANCHOR = '2026-08-20';
