import { AlertIcon, AnchorIcon, CheckIcon } from '../components/icons';
import { SLOTS, SLOT_SHORT_LABELS } from '../data/types';
import { CYCLE_LENGTH, datesFrom, resolveDay } from '../lib/rotation';
import { formatDayMonth, formatWeekdayShort, todayISO, type ISODate } from '../lib/date';
import { dayWarnings, weeklyIronAnchorSlots } from '../lib/nutrition';
import { madeStore, swapStore, useStore } from '../lib/storage';
import type { DayOverrides } from '../lib/rotation';

interface WeekScreenProps {
  onOpenDay: (date: ISODate) => void;
}

/**
 * The next full cycle at a glance. Compact on purpose — this is for planning
 * and shopping, not for cooking from. Tap a day to open it properly.
 *
 * Saved swaps are reflected here, so the overview and the grocery list always
 * describe the food you are actually going to make.
 */
export function WeekScreen({ onOpenDay }: WeekScreenProps) {
  const swaps = useStore(swapStore);
  const made = useStore(madeStore);
  const today = todayISO();
  const dates = datesFrom(today, CYCLE_LENGTH);

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-8">
      <header className="pt-safe pb-5">
        <h1 className="text-[1.35rem] leading-tight font-bold text-ink">Next {CYCLE_LENGTH} days</h1>
        <p className="mt-1 text-[0.95rem] text-ink-soft">Tap a day to open it</p>
      </header>

      <div className="flex flex-col gap-3">
        {dates.map((date) => {
          const day = resolveDay(date, (swaps[date] as DayOverrides | undefined) ?? {});
          const warnings = dayWarnings(day);
          const anchors = weeklyIronAnchorSlots(day);
          const madeCount = Object.values(made[date] ?? {}).filter(Boolean).length;
          const isToday = date === today;

          return (
            <button
              key={date}
              type="button"
              onClick={() => onOpenDay(date)}
              className={`w-full rounded-3xl border bg-card px-4 py-3.5 text-left shadow-card active:bg-paper-edge ${
                isToday ? 'border-accent/45' : 'border-line'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-baseline gap-2">
                  <span className="text-[1.02rem] font-bold text-ink">
                    {isToday ? 'Today' : formatWeekdayShort(date)}
                  </span>
                  <span className="text-[0.85rem] font-medium text-ink-soft">
                    {formatDayMonth(date)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {madeCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[0.78rem] font-semibold text-done">
                      <CheckIcon className="size-3.5" />
                      {madeCount}/{SLOTS.length}
                    </span>
                  )}
                  <span className="text-[0.78rem] font-semibold text-ink-soft">
                    Day {day.dayNumber}
                  </span>
                </span>
              </div>

              {warnings.map((warning) => (
                <span
                  key={warning.kind}
                  className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-warn-soft px-2.5 py-1.5 text-[0.8rem] font-semibold text-warn"
                >
                  <AlertIcon className="size-3.5 shrink-0" />
                  No iron anchor
                </span>
              ))}

              <dl className="mt-2.5 flex flex-col gap-1">
                {SLOTS.map((slot) => (
                  <div key={slot} className="flex items-baseline gap-2.5">
                    <dt className="w-[4.9rem] shrink-0 text-[0.72rem] font-bold tracking-wide text-ink-soft uppercase">
                      {SLOT_SHORT_LABELS[slot]}
                    </dt>
                    {/* Fixed-width marker slot, always rendered, so the names
                        line up whether or not the day has an anchor there. */}
                    <dd className="flex min-w-0 items-baseline gap-1.5 text-[0.9rem] text-ink">
                      <AnchorIcon
                        className={`size-1.5 shrink-0 translate-y-[-0.15em] text-accent ${
                          anchors.includes(slot) ? '' : 'invisible'
                        }`}
                      />
                      <span className="line-clamp-1">{day.meals[slot].name}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </button>
          );
        })}
      </div>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[0.82rem] text-ink-soft">
        <AnchorIcon className="size-1.5 text-accent" />
        marks the meals doing the heavy iron lifting
      </p>
    </div>
  );
}
