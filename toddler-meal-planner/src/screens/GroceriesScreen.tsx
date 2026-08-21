import { useEffect } from 'react';
import { CheckIcon } from '../components/icons';
import { GROCERY_CATEGORY_LABELS } from '../data/types';
import { todayISO } from '../lib/date';
import { buildGroceryList, countItems } from '../lib/groceries';
import { CYCLE_LENGTH, datesFrom } from '../lib/rotation';
import type { DayOverrides } from '../lib/rotation';
import { groceryStore, swapStore, useStore } from '../lib/storage';

/**
 * The next cycle's shopping, derived from whatever is actually scheduled —
 * swaps included. Ticks are scoped to the week they were made for, so last
 * week's checkmarks never carry over into this week's shop.
 */
export function GroceriesScreen() {
  const today = todayISO();
  const swaps = useStore(swapStore);
  const groceries = useStore(groceryStore);

  const dates = datesFrom(today, CYCLE_LENGTH);
  const overrides: Record<string, DayOverrides> = {};
  for (const date of dates) {
    const forDate = swaps[date];
    if (forDate) overrides[date] = forDate as DayOverrides;
  }

  const groups = buildGroceryList(dates, overrides);
  const total = countItems(groups);

  // A new week means a fresh list. Clearing on read keeps this honest even if
  // the app was closed for a fortnight.
  useEffect(() => {
    if (groceryStore.get().weekStart !== today) {
      groceryStore.set({ weekStart: today, checked: {} });
    }
  }, [today]);

  const checked = groceries.weekStart === today ? groceries.checked : {};
  const doneCount = groups
    .flatMap((group) => group.items)
    .filter((item) => checked[item.item]).length;

  const toggle = (item: string): void => {
    const current = groceryStore.get();
    const next = { ...current.checked };
    if (next[item]) delete next[item];
    else next[item] = true;
    groceryStore.set({ weekStart: today, checked: next });
  };

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-8">
      <header className="pt-safe pb-5">
        <h1 className="text-[1.35rem] leading-tight font-bold text-ink">Groceries</h1>
        <p className="mt-1 text-[0.95rem] text-ink-soft">
          Next {CYCLE_LENGTH} days · {doneCount} of {total} in the basket
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <section
            key={group.category}
            className="overflow-hidden rounded-3xl border border-line bg-card shadow-card"
          >
            <h2 className="border-b border-line px-5 py-3 text-[0.78rem] font-bold tracking-[0.09em] text-ink-soft uppercase">
              {GROCERY_CATEGORY_LABELS[group.category]}
            </h2>
            <ul>
              {group.items.map((item, index) => {
                const isChecked = checked[item.item] === true;
                return (
                  <li key={item.item}>
                    <button
                      type="button"
                      onClick={() => toggle(item.item)}
                      aria-pressed={isChecked}
                      className={`flex min-h-14 w-full items-center gap-3 px-5 py-2.5 text-left active:bg-paper-edge ${
                        index > 0 ? 'border-t border-line' : ''
                      }`}
                    >
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          isChecked ? 'border-done bg-done text-card' : 'border-line-strong'
                        }`}
                      >
                        {isChecked && <CheckIcon className="size-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-[1rem] font-semibold transition-colors ${
                            isChecked ? 'text-ink-soft line-through' : 'text-ink'
                          } ${item.staple ? 'font-medium' : ''}`}
                        >
                          {item.item}
                        </span>
                        <span className="block truncate text-[0.8rem] text-ink-soft">
                          {item.staple
                            ? 'staple — you probably have this'
                            : `${item.mealCount} ${item.mealCount === 1 ? 'meal' : 'meals'} · ${item.usedIn[0]}`}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-5 text-center text-[0.82rem] leading-snug text-ink-soft">
        Built from what is actually scheduled. Swap a meal and this list follows.
      </p>
    </div>
  );
}
