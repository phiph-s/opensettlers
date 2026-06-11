import { create } from 'zustand';
import type { GameOverSummary, GameState } from '@opensettlers/shared';

interface GameStore {
  gameState: GameState | null;
  gameSummary: GameOverSummary | null;
  setGameState: (state: GameState) => void;
  setGameSummary: (summary: GameOverSummary) => void;
  clearGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  gameSummary: null,
  setGameState: (gameState) => set({ gameState }),
  setGameSummary: (gameSummary) => set({ gameSummary }),
  clearGame: () => set({ gameState: null, gameSummary: null }),
}));
