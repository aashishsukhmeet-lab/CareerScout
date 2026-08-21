import { SLOTS, SLOT_LABELS } from './data/types';
import { formatLong, todayISO } from './lib/date';
import { resolveDay } from './lib/rotation';

/**
 * PLACEHOLDER — step 2 replaces this with the real Today screen.
 *
 * It exists so `npm run dev` and `npm run build` work, and so the data layer
 * can be eyeballed in a browser as well as in the test output.
 */
export function App() {
  const date = todayISO();
  const day = resolveDay(date);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '1.5rem', lineHeight: 1.5 }}>
      <p>{formatLong(date)}</p>
      <p>
        Day {day.dayNumber} of {day.cycleLength} — {day.label}
      </p>
      <ul>
        {SLOTS.map((slot) => (
          <li key={slot}>
            <strong>{SLOT_LABELS[slot]}:</strong> {day.meals[slot].name} (
            {day.meals[slot].prepMinutes} min)
            {day.meals[slot].needsVitaminC ? ' — pair with lemon / orange' : ''}
          </li>
        ))}
      </ul>
    </main>
  );
}
