import { create } from 'zustand';

interface HoverStore {
  hoveredPlayerId: string | null;
  setHoveredPlayerId: (id: string | null) => void;
}

export const useHoverStore = create<HoverStore>((set) => ({
  hoveredPlayerId: null,
  setHoveredPlayerId: (hoveredPlayerId) => set({ hoveredPlayerId }),
}));
