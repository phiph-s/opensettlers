import { create } from 'zustand';
import type { GameOverSummary, GameState } from '@opensettlers/shared';

interface GameStore {
  gameState: GameState | null;
  gameSummary: GameOverSummary | null;
  readyCount: number;
  readyNeeded: number;
  setGameState: (state: GameState) => void;
  setGameSummary: (summary: GameOverSummary) => void;
  setReadyCount: (count: number, needed: number) => void;
  clearGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  gameSummary: null,
  readyCount: 0,
  readyNeeded: 1,
  setGameState: (gameState) => set({ gameState }),
  setGameSummary: (gameSummary) => set({ gameSummary }),
  setReadyCount: (readyCount, readyNeeded) => set({ readyCount, readyNeeded }),
  clearGame: () => set({ gameState: null, gameSummary: null, readyCount: 0 }),
}));
