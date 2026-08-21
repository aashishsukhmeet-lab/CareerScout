import type { ReactElement } from 'react';
import { GroceryTabIcon, TodayTabIcon, TrackerTabIcon, WeekTabIcon } from './icons';
import type { Tab } from '../lib/router';

interface TabDef {
  tab: Tab;
  label: string;
  Icon: (props: { className?: string }) => ReactElement;
}

const TABS: TabDef[] = [
  { tab: 'today', label: 'Today', Icon: TodayTabIcon },
  { tab: 'week', label: 'Week', Icon: WeekTabIcon },
  { tab: 'trackers', label: 'Trackers', Icon: TrackerTabIcon },
  { tab: 'groceries', label: 'Groceries', Icon: GroceryTabIcon },
];

interface TabBarProps {
  active: Tab;
  onSelect: (tab: Tab) => void;
}

/** Fixed to the bottom, where a thumb can reach it one-handed. */
export function TabBar({ active, onSelect }: TabBarProps) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card/95 backdrop-blur-sm"
    >
      <div className="pb-safe mx-auto flex w-full max-w-lg">
        {TABS.map(({ tab, label, Icon }) => {
          const isActive = tab === active;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onSelect(tab)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 pt-2 pb-1 text-[0.7rem] font-semibold transition-colors ${
                isActive ? 'text-accent-ink' : 'text-ink-soft'
              }`}
            >
              <Icon className="size-6" />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
