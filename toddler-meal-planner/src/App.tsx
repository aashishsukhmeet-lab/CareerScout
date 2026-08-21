import { useEffect } from 'react';
import { TabBar } from './components/TabBar';
import { GroceriesScreen } from './screens/GroceriesScreen';
import { TodayScreen } from './screens/TodayScreen';
import { TrackersScreen } from './screens/TrackersScreen';
import { WeekScreen } from './screens/WeekScreen';
import { todayISO, type ISODate } from './lib/date';
import { useRoute, type Tab } from './lib/router';
import { pruneHistory } from './lib/storage';

export function App() {
  const [route, navigate] = useRoute();

  // Trim the rolling 30-day window once per launch.
  useEffect(() => {
    pruneHistory(todayISO());
  }, []);

  const goToTab = (tab: Tab): void => {
    navigate(tab === 'today' ? { tab: 'today', date: todayISO() } : { tab });
  };

  const openDay = (date: ISODate): void => {
    navigate({ tab: 'today', date });
  };

  return (
    <div className="min-h-dvh bg-paper pb-20">
      {route.tab === 'today' && (
        <TodayScreen
          key={route.date}
          date={route.date}
          onGoToToday={() => navigate({ tab: 'today', date: todayISO() })}
        />
      )}
      {route.tab === 'week' && <WeekScreen onOpenDay={openDay} />}
      {route.tab === 'trackers' && <TrackersScreen />}
      {route.tab === 'groceries' && <GroceriesScreen />}

      <TabBar active={route.tab} onSelect={goToTab} />
    </div>
  );
}
