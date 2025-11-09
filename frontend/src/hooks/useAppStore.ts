import { create } from 'zustand';

interface AppState {
  showHidden: boolean;
  setShowHidden: (show: boolean) => void;

  lastRefreshTime: Date | null;
  setLastRefreshTime: (time: Date) => void;

  onboardingComplete: boolean;
  setOnboardingComplete: (complete: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  showHidden: false,
  setShowHidden: (show) => set({ showHidden: show }),

  lastRefreshTime: null,
  setLastRefreshTime: (time) => set({ lastRefreshTime: time }),

  onboardingComplete: false,
  setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
}));
