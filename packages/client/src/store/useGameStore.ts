import { create } from 'zustand';
import type { GameState } from '@opensettlers/shared';

interface GameStore {
  gameState: GameState | null;
  setGameState: (state: GameState) => void;
  clearGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  setGameState: (gameState) => set({ gameState }),
  clearGame: () => set({ gameState: null }),
}));
