import { create } from 'zustand';

const STORAGE_KEY = 'opensettlers_dark';

interface ThemeStore {
  dark: boolean;
  toggle: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  dark: localStorage.getItem(STORAGE_KEY) === 'true',
  toggle: () => set((s) => {
    const next = !s.dark;
    localStorage.setItem(STORAGE_KEY, String(next));
    return { dark: next };
  }),
}));
