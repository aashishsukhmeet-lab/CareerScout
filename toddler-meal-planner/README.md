# Toddler Meals

A no-decisions meal app for a 13-month-old. Open it and it tells you what to
cook. No account, no login, no backend — and both phones show the same plan.

**Source of truth for all food data:** [`toddler-7-day-meal-plan.md`](./toddler-7-day-meal-plan.md).

## How two phones agree with no backend

```
dayIndex = daysSince(ANCHOR) mod CYCLE_LENGTH
```

`ANCHOR` is `2026-08-20`, fixed forever. The only input is the local calendar
date, so the plan is a pure function of the day. Nothing random, nothing
synced, nothing to log into. Two phones on the same date compute the same five
meals, and always will.

Only the small stuff persists, per device and per date: swaps, "Made it"
toggles, milk and supplement logs, grocery ticks. Keying all of it by date is
also what makes "resets at midnight" true without a timer — tomorrow is simply
a key with nothing in it yet.

## Screens

**Today** is the default and needs no navigation to answer "what do I make
right now". Five cards: the dish large, prep time, a tap-to-expand rationale, a
pairing badge on iron meals that bring no vitamin C of their own, Swap, and
Made it. A swapped card names what the plan actually said and undoes in one
tap. The plan's daily add-ins sit at the foot of the screen, because they
belong to no single meal and so get forgotten.

**Week** shows the next cycle compact, marks the meals doing the heavy iron
lifting, flags any day left without an iron anchor, and opens a day on tap.

**Trackers** has the three milk slots against the 18–22 oz target, warning when
a pour lands on one of the plan's named iron anchors — calcium blocks iron —
plus the three supplements and a seven-day strip so the stored history is
visible.

**Groceries** derives the list from what is actually scheduled, swaps included,
grouped by aisle with staples last.

## Layout

| Path | What it holds |
|---|---|
| `src/data/types.ts` | `Slot`, `Tag`, `Food`, `DayPlan`, `ResolvedDay` |
| `src/data/foods.ts` | The food library — every food, tag, `why`, prep time and ingredient list |
| `src/data/cycle.ts` | The 7-day rotation, `CYCLE_LENGTH`, `ANCHOR` |
| `src/lib/date.ts` | Calendar-date arithmetic (timezone- and DST-proof) |
| `src/lib/rotation.ts` | `dayIndexFor`, `resolveDay`, `datesFrom` |
| `src/lib/nutrition.ts` | Iron anchors, vitamin C pairing, milk timing, supplements, add-ins |
| `src/lib/swap.ts` | The deterministic swap ring for each slot |
| `src/lib/groceries.ts` | Shopping list derived from scheduled ingredients |
| `src/lib/storage.ts` | localStorage, defensively |
| `src/lib/router.ts` | Hash routing, so the Android back button works |
| `src/state/` | The hooks the screens actually bind to |
| `src/screens/`, `src/components/` | UI |

## Extending it

**Add a food** — append an entry to `FOODS` in `src/data/foods.ts`. No component
changes. Give it at least one slot, honest tags, a one-line `why`, a prep time,
and ingredients so it reaches the grocery list. The tests will tell you if you
have missed something.

**Change the cycle length** — add or remove entries in `CYCLE`
(`src/data/cycle.ts`). `CYCLE_LENGTH` is derived from the array, so a 10- or
14-day rotation needs no other edit.

**Age thresholds** — `Food` already carries optional `minAgeMonths` /
`maxAgeMonths`. Nothing filters on them yet; when he passes 18 months the
filter is a few lines in `eligibleFoods` and the data is already shaped for it.

### Three data rules the tests enforce

**`needsVitaminC: true`** exactly when a food carries the `iron` tag and has no
vitamin C of its own. That drives the "pair with lemon or orange" badge — which
is why rajma (chopped tomato) and khichdi (squeeze of lemon) do not show it,
and ragi porridge and sattu halwa do.

**`weeklyIronAnchor: true`** only on the meals the plan's Weekly Iron Anchors
section names by hand: chana, rajma, ragi, palak, sattu halwa, raisins. This is
narrower than the `iron` tag, which the everyday dal carries too. Milk warnings
key off the anchor, not the tag — with dal in most meals the wider test fires
on three pours a day and stops being read. As scoped it lands at most once a
day.

**Names stay under 32 characters.** The card shows the dish; prep detail lives
in `notes` and components live in `ingredients`. Longer names truncate in the
Week overview and push every Today card to three lines.

### What is deliberately not here

No calorie or macro counting. The plan document establishes that protein
already runs at roughly double requirement at this age, so counting it would be
noise competing with the real gaps — iron, DHA, choline and total fat.

## Commands

```bash
npm install
npm run dev        # local dev server
npm test           # 115 unit tests
npm run typecheck
npm run build      # static output in dist/
npm run verify     # browser checks against a running preview (see below)
npm run icons      # regenerate public/ icons from scripts/icon.svg
```

`npm run verify` drives a real Chromium at 390×844: swap, undo, made-it and
grocery ticks surviving a reload, every tap target clearing 44px, no
horizontal scroll, and the whole app loading and working with the network
switched off. Point it at a preview server:

```bash
npm run build
npx vite preview --port 4173 &
npm run verify
```

## Deploying

Static output, no server. This app lives in a subdirectory of the repo, so set
the project's root directory to `toddler-meal-planner` in either host:

- **Vercel** — Root Directory `toddler-meal-planner`. `vercel.json` supplies
  the rest.
- **Netlify** — Base directory `toddler-meal-planner`. `netlify.toml` supplies
  the rest.

Both configs stop `sw.js` and `index.html` being served stale, so an update
reaches an already-installed phone on the next launch rather than in a week.

Note the repo's existing `.github/workflows/static.yml` uploads the repo root
to GitHub Pages with no build step, so it will not build this app.

## Installing it to a home screen

- **iOS** — open in Safari, Share, Add to Home Screen.
- **Android** — open in Chrome, menu, Install app.

Once installed it never needs the network again. Everything is precached, which
matters because the kitchen is where the wifi is worst.
