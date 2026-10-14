import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  interests: string[];
  state: string;
  contentType: 'Memes' | 'News' | 'Both';
  setInterests: (interests: string[]) => void;
  setStatePref: (state: string) => void;
  setContentType: (type: 'Memes' | 'News' | 'Both') => void;
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      interests: ["Technology", "Pop Culture"],
      state: 'Tamil Nadu',
      contentType: 'Both',
      setInterests: (interests) => set({ interests }),
      setStatePref: (state) => set({ state }),
      setContentType: (contentType) => set({ contentType }),
      hasCompletedOnboarding: true,
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
    }),
    {
      name: 'pulseboard-preferences-v3',
    }
  )
);
