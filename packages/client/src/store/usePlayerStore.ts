import { create } from 'zustand';

interface PlayerStore {
  myPlayerId: string | null;
  myName: string;
  currentLobbyId: string | null;
  setPlayer: (id: string, name: string) => void;
  setLobbyId: (id: string | null) => void;
  clear: () => void;
}

const STORAGE_ID_KEY = 'opensettlers_player_id';
const STORAGE_LOBBY_KEY = 'opensettlers_lobby_id';

export const usePlayerStore = create<PlayerStore>((set) => ({
  myPlayerId: localStorage.getItem(STORAGE_ID_KEY),
  myName: '',
  currentLobbyId: localStorage.getItem(STORAGE_LOBBY_KEY),
  setPlayer: (id, name) => {
    localStorage.setItem(STORAGE_ID_KEY, id);
    set({ myPlayerId: id, myName: name });
  },
  setLobbyId: (id) => {
    if (id) localStorage.setItem(STORAGE_LOBBY_KEY, id);
    else localStorage.removeItem(STORAGE_LOBBY_KEY);
    set({ currentLobbyId: id });
  },
  clear: () => {
    localStorage.removeItem(STORAGE_ID_KEY);
    localStorage.removeItem(STORAGE_LOBBY_KEY);
    set({ myPlayerId: null, myName: '', currentLobbyId: null });
  },
}));
