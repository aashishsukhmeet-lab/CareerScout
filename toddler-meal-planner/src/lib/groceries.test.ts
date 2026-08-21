import { describe, expect, it } from 'vitest';
import { GROCERY_CATEGORY_LABELS } from '../data/types';
import type { GroceryCategory } from '../data/types';
import { ANCHOR, CYCLE_LENGTH } from '../data/cycle';
import { buildGroceryList, countItems } from './groceries';
import { datesFrom } from './rotation';

const week = datesFrom(ANCHOR, CYCLE_LENGTH);

describe('buildGroceryList', () => {
  it('covers a full cycle with a list you could actually shop from', () => {
    const groups = buildGroceryList(week);
    expect(groups.length).toBeGreaterThan(0);
    expect(countItems(groups)).toBeGreaterThan(20);
  });

  it('groups into the four aisles, fresh first', () => {
    const groups = buildGroceryList(week);
    expect(groups.map((g) => g.category)).toEqual([
      'produce',
      'dairy',
      'grainsAndLentils',
      'pantry',
    ]);
    for (const group of groups) {
      expect(GROCERY_CATEGORY_LABELS[group.category as GroceryCategory]).toBeTruthy();
    }
  });

  it('lists each ingredient once, however many meals use it', () => {
    const groups = buildGroceryList(week);
    const all = groups.flatMap((g) => g.items.map((i) => i.item));
    expect(new Set(all).size).toBe(all.length);

    // Rice turns up in several meals across the week — one line, higher count.
    const rice = groups.flatMap((g) => g.items).find((i) => i.item === 'rice');
    expect(rice).toBeDefined();
    expect(rice!.mealCount).toBeGreaterThan(1);
    expect(rice!.usedIn.length).toBeGreaterThan(1);
  });

  it('puts every item in exactly one aisle', () => {
    const groups = buildGroceryList(week);
    for (const group of groups) {
      for (const item of group.items) {
        expect(item.category).toBe(group.category);
      }
    }
  });

  it('sinks staples to the bottom of their aisle', () => {
    const pantry = buildGroceryList(week).find((g) => g.category === 'pantry');
    expect(pantry).toBeDefined();
    const firstStaple = pantry!.items.findIndex((i) => i.staple);
    if (firstStaple !== -1) {
      expect(pantry!.items.slice(firstStaple).every((i) => i.staple)).toBe(true);
    }
  });

  it('sorts non-staples alphabetically, so the list reads the same each week', () => {
    for (const group of buildGroceryList(week)) {
      const names = group.items.filter((i) => !i.staple).map((i) => i.item);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    }
  });

  it('follows swaps rather than the printed plan', () => {
    const plain = buildGroceryList(week);
    const hasRajma = (groups: ReturnType<typeof buildGroceryList>) =>
      groups.flatMap((g) => g.items).some((i) => i.item.startsWith('rajma'));
    const hasLobia = (groups: ReturnType<typeof buildGroceryList>) =>
      groups.flatMap((g) => g.items).some((i) => i.item.startsWith('lobia'));

    expect(hasRajma(plain)).toBe(true);
    expect(hasLobia(plain)).toBe(false);

    // Day 3 is the rajma day; swap it for lobia and the list must follow.
    const swapped = buildGroceryList(week, { [week[2]!]: { lunch: 'lobia-rice' } });
    expect(hasRajma(swapped)).toBe(false);
    expect(hasLobia(swapped)).toBe(true);
  });

  it('returns nothing for an empty window rather than throwing', () => {
    expect(buildGroceryList([])).toEqual([]);
    expect(countItems([])).toBe(0);
  });

  it('is deterministic', () => {
    const first = JSON.stringify(buildGroceryList(week));
    for (let i = 0; i < 20; i += 1) {
      expect(JSON.stringify(buildGroceryList(week))).toBe(first);
    }
  });
});
