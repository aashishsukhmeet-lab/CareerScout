import { MealCard } from '../components/MealCard';
import { AlertIcon, BackIcon } from '../components/icons';
import { SLOTS } from '../data/types';
import { formatLong, todayISO, type ISODate } from '../lib/date';
import { dayPlanFor } from '../lib/rotation';
import { getFood } from '../data/foods';
import { DAILY_ADD_INS, dayWarnings } from '../lib/nutrition';
import { useDay } from '../state/useDay';

interface TodayScreenProps {
  date: ISODate;
  onGoToToday: () => void;
}

/**
 * The default screen, and the answer to the only question that matters at 6am:
 * what do I make right now. Five cards, no navigation, no decisions.
 */
export function TodayScreen({ date, onGoToToday }: TodayScreenProps) {
  const { day, isSwapped, swap, resetSwap, isMade, toggleMade, madeCount } = useDay(date);
  const isToday = date === todayISO();
  const warnings = dayWarnings(day);

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-8">
      {!isToday && (
        <button
          type="button"
          onClick={onGoToToday}
          className="mt-2 -ml-1 inline-flex min-h-11 items-center gap-1 pr-3 text-[0.92rem] font-semibold text-accent-ink"
        >
          <BackIcon className="size-5" />
          Back to today
        </button>
      )}

      <header className={isToday ? 'pt-safe pb-5' : 'pt-1 pb-5'}>
        <h1 className="text-[1.35rem] leading-tight font-bold text-ink">
          {isToday ? 'Today' : formatLong(date)}
        </h1>
        <p className="mt-1 text-[0.95rem] text-ink-soft">
          {isToday && <>{formatLong(date)} · </>}
          Day {day.dayNumber} of {day.cycleLength}
        </p>
        <p className="mt-2 text-[0.95rem] font-medium text-accent-ink">{day.label}</p>
      </header>

      {warnings.map((warning) => (
        <div
          key={warning.kind}
          className="mb-4 flex items-start gap-2.5 rounded-2xl bg-warn-soft px-4 py-3 text-[0.9rem] leading-snug font-medium text-warn"
        >
          <AlertIcon className="mt-px size-4.5 shrink-0" />
          {warning.message}
        </div>
      ))}

      <div className="flex flex-col gap-3.5">
        {SLOTS.map((slot) => (
          <MealCard
            key={slot}
            slot={slot}
            food={day.meals[slot]}
            scheduledName={getFood(dayPlanFor(date).meals[slot]).name}
            swapped={isSwapped(slot)}
            made={isMade(slot)}
            onSwap={() => swap(slot)}
            onResetSwap={() => resetSwap(slot)}
            onToggleMade={() => toggleMade(slot)}
          />
        ))}
      </div>

      <p className="mt-6 text-center text-[0.88rem] font-medium text-ink-soft">
        {madeCount === SLOTS.length
          ? 'All five done. Good day.'
          : `${madeCount} of ${SLOTS.length} made`}
      </p>

      {/* Belongs to no single meal, which is exactly why it gets forgotten. */}
      <section className="mt-6 rounded-3xl border border-line bg-card px-5 py-4 shadow-card">
        <h2 className="text-[0.78rem] font-bold tracking-[0.09em] text-ink-soft uppercase">
          Every day, into whatever you cook
        </h2>
        <dl className="mt-3 flex flex-col gap-2.5">
          {DAILY_ADD_INS.map((addIn) => (
            <div key={addIn.id}>
              <dt className="text-[0.95rem] font-semibold text-ink">{addIn.name}</dt>
              <dd className="text-[0.85rem] leading-snug text-ink-soft">{addIn.detail}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
