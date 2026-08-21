import { AlertIcon, CheckIcon } from '../components/icons';
import { SLOT_LABELS } from '../data/types';
import { formatWeekdayShort, todayISO, type ISODate } from '../lib/date';
import {
  MILK_SLOTS,
  MILK_SLOT_LABELS,
  MILK_SLOT_MEAL,
  MILK_SLOT_OUNCES,
  MILK_TARGET_MAX_OZ,
  MILK_TARGET_MIN_OZ,
  SUPPLEMENTS,
  milkConflictsWith,
} from '../lib/nutrition';
import { resolveDay } from '../lib/rotation';
import type { DayOverrides } from '../lib/rotation';
import { swapStore, useStore } from '../lib/storage';
import { useTrackers } from '../state/useTrackers';

/**
 * Milk and supplements for today. Both reset at midnight for free, because
 * both are stored against the date rather than against a counter.
 */
export function TrackersScreen() {
  const date: ISODate = todayISO();
  const swaps = useStore(swapStore);
  const day = resolveDay(date, (swaps[date] as DayOverrides | undefined) ?? {});
  const {
    isMilkLogged,
    toggleMilk,
    totalOz,
    milkStatus,
    isSupplementTaken,
    toggleSupplement,
    supplementCount,
    history,
  } = useTrackers(date);

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-8">
      <header className="pt-safe pb-5">
        <h1 className="text-[1.35rem] leading-tight font-bold text-ink">Trackers</h1>
        <p className="mt-1 text-[0.95rem] text-ink-soft">Resets at midnight</p>
      </header>

      <section className="rounded-3xl border border-line bg-card p-5 shadow-card">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-[1.1rem] font-bold text-ink">Milk</h2>
          <p className="text-right">
            <span
              className={`text-[1.6rem] leading-none font-bold tabular-nums ${
                milkStatus === 'onTarget' ? 'text-done' : 'text-ink'
              }`}
            >
              {totalOz}
            </span>
            <span className="ml-1 text-[0.9rem] font-semibold text-ink-soft">oz</span>
          </p>
        </div>
        <p className="mt-0.5 text-right text-[0.82rem] font-medium text-ink-soft">
          target {MILK_TARGET_MIN_OZ}&ndash;{MILK_TARGET_MAX_OZ} oz
        </p>

        <div className="mt-4 flex flex-col gap-2.5">
          {MILK_SLOTS.map((slot) => {
            const logged = isMilkLogged(slot);
            const conflict = milkConflictsWith(day, slot);
            return (
              <div key={slot}>
                <button
                  type="button"
                  onClick={() => toggleMilk(slot)}
                  aria-pressed={logged}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 text-left transition-colors ${
                    logged
                      ? 'border-done/45 bg-done-soft text-done'
                      : 'border-line text-ink active:bg-paper-edge'
                  }`}
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
                      logged ? 'border-done bg-done text-card' : 'border-line-strong'
                    }`}
                  >
                    {logged && <CheckIcon className="size-3.5" />}
                  </span>
                  <span className="flex-1 text-[1rem] font-semibold">
                    {MILK_SLOT_LABELS[slot]}
                  </span>
                  <span className="text-[0.92rem] font-semibold tabular-nums opacity-75">
                    {MILK_SLOT_OUNCES[slot]} oz
                  </span>
                </button>

                {conflict && (
                  <p
                    className={`mt-1.5 flex items-start gap-2 rounded-xl px-3 py-2 text-[0.83rem] leading-snug font-medium ${
                      logged ? 'bg-warn-soft text-warn' : 'text-ink-soft'
                    }`}
                  >
                    <AlertIcon className="mt-px size-4 shrink-0" />
                    <span>
                      {conflict.name} at {SLOT_LABELS[MILK_SLOT_MEAL[slot]].toLowerCase()}.
                      {logged
                        ? ' Calcium blocks that iron — water with the meal instead.'
                        : ' Water with the meal instead, milk an hour either side.'}
                    </span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-line bg-card p-5 shadow-card">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-[1.1rem] font-bold text-ink">Supplements</h2>
          <p className="text-[0.85rem] font-semibold text-ink-soft tabular-nums">
            {supplementCount}/{SUPPLEMENTS.length}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          {SUPPLEMENTS.map((supplement) => {
            const taken = isSupplementTaken(supplement.id);
            return (
              <button
                key={supplement.id}
                type="button"
                onClick={() => toggleSupplement(supplement.id)}
                aria-pressed={taken}
                className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-2.5 text-left transition-colors ${
                  taken
                    ? 'border-done/45 bg-done-soft text-done'
                    : 'border-line text-ink active:bg-paper-edge'
                }`}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    taken ? 'border-done bg-done text-card' : 'border-line-strong'
                  }`}
                >
                  {taken && <CheckIcon className="size-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[1rem] font-semibold">{supplement.name}</span>
                  <span
                    className={`block text-[0.82rem] leading-snug ${taken ? 'opacity-80' : 'text-ink-soft'}`}
                  >
                    {supplement.detail}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-line bg-card p-5 shadow-card">
        <h2 className="text-[1.1rem] font-bold text-ink">Last 7 days</h2>
        <ul className="mt-3.5 flex justify-between gap-1">
          {history.map((entry) => {
            const onTarget = entry.ounces >= MILK_TARGET_MIN_OZ && entry.ounces <= MILK_TARGET_MAX_OZ;
            return (
              <li key={entry.date} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <span className="text-[0.7rem] font-bold text-ink-soft uppercase">
                  {formatWeekdayShort(entry.date).slice(0, 1)}
                </span>
                <span
                  className={`w-full rounded-lg py-1.5 text-center text-[0.76rem] font-bold tabular-nums ${
                    entry.ounces === 0
                      ? 'bg-paper-edge text-ink-soft'
                      : onTarget
                        ? 'bg-done-soft text-done'
                        : 'bg-citrus-soft text-citrus'
                  }`}
                >
                  {entry.ounces || '—'}
                </span>
                <span className="flex gap-0.5" aria-label={`${entry.supplements} of 3 supplements`}>
                  {SUPPLEMENTS.map((supplement, index) => (
                    <span
                      key={supplement.id}
                      className={`size-1.5 rounded-full ${
                        index < entry.supplements ? 'bg-done' : 'bg-line-strong'
                      }`}
                    />
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[0.8rem] leading-snug text-ink-soft">
          Milk in oz, then one dot per supplement. Kept for 30 days on this phone only.
        </p>
      </section>
    </div>
  );
}
