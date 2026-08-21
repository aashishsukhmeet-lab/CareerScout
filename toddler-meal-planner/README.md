# Toddler Meal Planner

A no-decisions meal app for a 13-month-old. Open it, and it tells you what to
cook. No account, no login, no backend — and both phones show the same plan.

**Source of truth for all food data:** [`toddler-7-day-meal-plan.md`](./toddler-7-day-meal-plan.md).

## How two phones agree with no backend

```
dayIndex = daysSince(ANCHOR) mod CYCLE_LENGTH
```

`ANCHOR` is `2026-08-20`, fixed forever. The only input is the local calendar
date, so the plan is a pure function of the day. Nothing random, nothing
stored, nothing synced. Two phones on the same date compute the same five
meals, and always will.

Only the small stuff is persisted locally, per device: swaps for a specific
date, "made it" toggles, milk and supplement logs.

## Layout

| Path | What it holds |
|---|---|
| `src/data/types.ts` | `Slot`, `Tag`, `Food`, `DayPlan`, `ResolvedDay` |
| `src/data/foods.ts` | The food library — every food, tag, `why`, prep time and ingredient list |
| `src/data/cycle.ts` | The 7-day rotation, `CYCLE_LENGTH`, `ANCHOR` |
| `src/lib/date.ts` | Calendar-date arithmetic (timezone- and DST-proof) |
| `src/lib/rotation.ts` | `dayIndexFor`, `resolveDay`, `datesFrom` |
| `src/lib/nutrition.ts` | Iron anchors, vitamin C pairing, milk timing, supplements |
| `src/lib/swap.ts` | The deterministic swap ring for each slot |

## Extending it

**Add a food** — append an entry to `FOODS` in `src/data/foods.ts`. No
component changes. Give it at least one slot, honest tags, a one-line `why`,
a prep time, and ingredients so it reaches the grocery list. The tests will
tell you if you have missed something.

**Change the cycle length** — add or remove entries in `CYCLE`
(`src/data/cycle.ts`). `CYCLE_LENGTH` is derived from the array, so a 10- or
14-day rotation needs no other edit.

**Age thresholds** — `Food` already carries optional `minAgeMonths` /
`maxAgeMonths`. Nothing filters on them yet; when he passes 18 months, the
filter is a few lines in `eligibleFoods` and the data is already shaped for it.

### Two tagging rules

**`needsVitaminC: true`** exactly when a food carries the `iron` tag and has
no vitamin C of its own. That drives the "pair with lemon / orange" badge —
which is why rajma (chopped tomato) and khichdi (squeeze of lemon) do not
show it, and ragi porridge and sattu halwa do.

**`weeklyIronAnchor: true`** only on the meals the plan's Weekly Iron Anchors
section names by hand: chana, rajma, ragi, palak, sattu halwa, raisins. This
is narrower than the `iron` tag, which the everyday dal carries too. Milk
warnings key off the anchor, not the tag — with dal in most meals, the wider
test fires on three pours a day and stops being read. As scoped, it lands at
most once a day.

`foods.test.ts` enforces both, so the badges can be trusted.

## Commands

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests
npm run typecheck
npm run build      # static output in dist/
```

## Status

Data layer complete and tested (88 tests). Screens, trackers, groceries and
PWA config still to come — see the build order in the project brief.
