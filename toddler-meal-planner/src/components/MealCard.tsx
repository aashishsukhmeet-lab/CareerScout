import { useId, useState } from 'react';
import type { Food, Slot } from '../data/types';
import { SLOT_LABELS } from '../data/types';
import { isWeeklyIronAnchor } from '../lib/nutrition';
import { AnchorIcon, CheckIcon, ChevronIcon, CitrusIcon, CloseIcon, SwapIcon } from './icons';

interface MealCardProps {
  slot: Slot;
  food: Food;
  /** What the plan actually says, shown when the slot has been swapped. */
  scheduledName: string;
  swapped: boolean;
  made: boolean;
  onSwap: () => void;
  onResetSwap: () => void;
  onToggleMade: () => void;
}

/**
 * One meal. The whole point of the screen: the name is the biggest thing on
 * it, and everything else stays out of the way until you ask for it.
 *
 * Tapping the card body expands the `why` line rather than opening a dialog —
 * nothing in this app takes over the screen.
 */
export function MealCard({
  slot,
  food,
  scheduledName,
  swapped,
  made,
  onSwap,
  onResetSwap,
  onToggleMade,
}: MealCardProps) {
  const [expanded, setExpanded] = useState(false);
  const detailId = useId();
  const isAnchor = isWeeklyIronAnchor(food);

  return (
    <article
      className={`overflow-hidden rounded-3xl border bg-card shadow-card transition-colors ${
        made ? 'border-done/45' : 'border-line'
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        aria-controls={detailId}
        className="w-full px-5 pt-4 pb-4 text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[0.78rem] font-bold tracking-[0.09em] text-ink-soft uppercase">
            {SLOT_LABELS[slot]}
            {made && <CheckIcon className="size-4 text-done" />}
          </span>
          <span className="shrink-0 text-sm font-medium text-ink-soft tabular-nums">
            {food.prepMinutes} min
          </span>
        </div>

        <h2 className="mt-1.5 text-[1.65rem] leading-[1.15] font-semibold text-balance text-ink">
          {food.name}
        </h2>

        {(food.needsVitaminC || isAnchor || swapped) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {isAnchor && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[0.76rem] font-semibold text-accent-ink">
                <AnchorIcon className="size-2" />
                Iron anchor
              </span>
            )}
            {food.needsVitaminC && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-citrus-soft px-2.5 py-1 text-[0.76rem] font-semibold text-citrus">
                <CitrusIcon className="size-3.5" />
                Pair with lemon or orange
              </span>
            )}
            {swapped && (
              <span className="inline-flex items-center rounded-full border border-line-strong px-2.5 py-1 text-[0.76rem] font-semibold text-ink-soft">
                Swapped
              </span>
            )}
          </div>
        )}

        <span className="mt-3 flex items-center gap-1 text-[0.82rem] font-medium text-ink-soft">
          {expanded ? 'Hide' : 'Why this'}
          <ChevronIcon className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {expanded && (
        <div id={detailId} className="border-t border-line px-5 py-4">
          <p className="text-[0.98rem] leading-relaxed text-ink">{food.why}</p>
          {food.notes && (
            <p className="mt-2.5 text-[0.9rem] leading-relaxed text-ink-soft">{food.notes}</p>
          )}
        </div>
      )}

      {/* Walking the swap ring all the way back can take a dozen taps, so
          undo stays one tap and says what it would put back. */}
      {swapped && (
        <div className="flex items-center gap-3 border-t border-line px-5 py-2.5">
          <p className="min-w-0 flex-1 text-[0.83rem] leading-snug text-ink-soft">
            Planned: <span className="font-semibold text-ink">{scheduledName}</span>
          </p>
          <button
            type="button"
            onClick={onResetSwap}
            className="-mr-2 inline-flex min-h-11 shrink-0 items-center gap-1.5 px-2 text-[0.86rem] font-bold text-accent-ink"
          >
            <CloseIcon className="size-3.5" />
            Undo
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 border-t border-line">
        <button
          type="button"
          onClick={onSwap}
          className="flex min-h-14 items-center justify-center gap-2 border-r border-line text-[0.95rem] font-semibold text-ink-soft active:bg-paper-edge"
        >
          <SwapIcon className="size-5" />
          Swap
        </button>
        <button
          type="button"
          onClick={onToggleMade}
          aria-pressed={made}
          className={`flex min-h-14 items-center justify-center gap-2 text-[0.95rem] font-semibold transition-colors ${
            made ? 'bg-done-soft text-done' : 'text-ink-soft active:bg-paper-edge'
          }`}
        >
          <CheckIcon className="size-5" />
          Made it
        </button>
      </div>
    </article>
  );
}
