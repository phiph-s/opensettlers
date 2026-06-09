import { create } from 'zustand';
import type { LobbyState } from '@opensettlers/shared';

interface LobbyStore {
  lobbies: LobbyState[];
  currentLobby: LobbyState | null;
  setLobbies: (lobbies: LobbyState[]) => void;
  upsertLobby: (lobby: LobbyState) => void;
  setCurrentLobby: (lobby: LobbyState | null) => void;
}

export const useLobbyStore = create<LobbyStore>((set) => ({
  lobbies: [],
  currentLobby: null,
  setLobbies: (lobbies) => set({ lobbies }),
  upsertLobby: (lobby) =>
    set((state) => {
      const idx = state.lobbies.findIndex((l) => l.id === lobby.id);
      const updated = idx >= 0
        ? state.lobbies.map((l) => (l.id === lobby.id ? lobby : l))
        : [...state.lobbies, lobby];
      const currentLobby = state.currentLobby?.id === lobby.id ? lobby : state.currentLobby;
      return { lobbies: updated, currentLobby };
    }),
  setCurrentLobby: (lobby) => set({ currentLobby: lobby }),
}));
