import { describe, expect, it } from 'vitest';
import { CYCLE } from '../data/cycle';
import { getFood } from '../data/foods';
import { SLOTS } from '../data/types';
import type { Slot } from '../data/types';
import { eligibleFoods, nextSwap, swapRing } from './swap';

describe('swapRing', () => {
  it('starts at the scheduled food', () => {
    expect(swapRing('lunch', 'moong-khichdi')[0]?.id).toBe('moong-khichdi');
  });

  it('offers only foods allowed in that slot', () => {
    for (const slot of SLOTS) {
      for (const food of eligibleFoods(slot)) {
        for (const candidate of swapRing(slot, food.id)) {
          expect(candidate.slots, `${candidate.id} offered for ${slot}`).toContain(slot);
        }
      }
    }
  });

  it('lists every eligible food exactly once', () => {
    for (const slot of SLOTS) {
      const ring = swapRing(slot, eligibleFoods(slot)[0]!.id);
      const ids = ring.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBe(eligibleFoods(slot).length);
    }
  });

  it('is deterministic — the same ring on every device, every call', () => {
    const first = swapRing('dinner', 'dal-roti').map((f) => f.id);
    for (let i = 0; i < 50; i += 1) {
      expect(swapRing('dinner', 'dal-roti').map((f) => f.id)).toEqual(first);
    }
  });

  it('puts an iron alternative first when replacing an iron anchor', () => {
    // Swapping out the day's iron should not silently cost the day its iron.
    for (const slot of SLOTS) {
      for (const food of eligibleFoods(slot)) {
        if (!food.tags.includes('iron')) continue;
        const firstAlternate = swapRing(slot, food.id)[1];
        expect(firstAlternate, `${slot}/${food.id}`).toBeDefined();
        expect(
          firstAlternate?.tags,
          `first swap for ${food.id} in ${slot} drops the iron`,
        ).toContain('iron');
      }
    }
  });

  it('prefers alternatives that share tags with what they replace', () => {
    const ring = swapRing('afternoonSnack', 'chana-sattu-halwa');
    const scheduled = getFood('chana-sattu-halwa');
    const overlap = (id: string) =>
      getFood(id).tags.filter((t) => scheduled.tags.includes(t)).length;
    const scores = ring.slice(1).map((f) => overlap(f.id));
    // Non-increasing: the closest nutritional matches come first.
    for (let i = 1; i < scores.length; i += 1) {
      expect(scores[i]!).toBeLessThanOrEqual(scores[i - 1]!);
    }
  });
});

describe('nextSwap', () => {
  it('advances one step at a time', () => {
    const ring = swapRing('lunch', 'moong-khichdi');
    expect(nextSwap('lunch', 'moong-khichdi', 'moong-khichdi').id).toBe(ring[1]?.id);
    expect(nextSwap('lunch', 'moong-khichdi', ring[1]!.id).id).toBe(ring[2]?.id);
  });

  it('returns to the scheduled food, so a wrong tap is always recoverable', () => {
    for (const slot of SLOTS) {
      for (const scheduled of eligibleFoods(slot)) {
        let current = scheduled.id;
        const steps = swapRing(slot, scheduled.id).length;
        for (let i = 0; i < steps; i += 1) {
          current = nextSwap(slot, scheduled.id, current).id;
        }
        expect(current, `${slot}/${scheduled.id} did not come full circle`).toBe(scheduled.id);
      }
    }
  });

  it('visits every option before repeating', () => {
    const scheduled = 'dal-roti';
    const seen = new Set<string>();
    let current = scheduled;
    for (let i = 0; i < swapRing('dinner', scheduled).length; i += 1) {
      current = nextSwap('dinner', scheduled, current).id;
      seen.add(current);
    }
    expect(seen.size).toBe(swapRing('dinner', scheduled).length);
  });

  it('restarts the ring when a saved swap points at a deleted food', () => {
    const restarted = nextSwap('lunch', 'moong-khichdi', 'food-that-was-removed');
    expect(restarted.id).toBe('moong-khichdi');
  });
});

describe('every scheduled meal can be swapped', () => {
  it('gives at least two alternatives for all 35 slots in the cycle', () => {
    for (const day of CYCLE) {
      for (const slot of SLOTS as readonly Slot[]) {
        const ring = swapRing(slot, day.meals[slot]);
        expect(ring.length, `${day.id}.${slot}`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
