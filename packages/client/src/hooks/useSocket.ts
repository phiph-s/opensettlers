import { useEffect } from 'react';
import { socket } from '../socket.js';
import { useGameStore } from '../store/useGameStore.js';
import { useLobbyStore } from '../store/useLobbyStore.js';
import { usePlayerStore } from '../store/usePlayerStore.js';

export function useSocket() {
  // Stable references — Zustand setters never change identity
  const setGameState = useGameStore((s) => s.setGameState);
  const setGameSummary = useGameStore((s) => s.setGameSummary);
  const setReadyCount = useGameStore((s) => s.setReadyCount);
  const clearGame = useGameStore((s) => s.clearGame);
  const upsertLobby = useLobbyStore((s) => s.upsertLobby);
  const setCurrentLobby = useLobbyStore((s) => s.setCurrentLobby);

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      // Read current values at event time, not from stale closure
      const { myPlayerId, currentLobbyId } = usePlayerStore.getState();
      if (myPlayerId && currentLobbyId) {
        socket.emit('game:rejoin', { playerId: myPlayerId, lobbyId: currentLobbyId }, (res) => {
          if (res.ok) setGameState(res.data);
        });
      }
    });

    const onGameOver = (summary: Parameters<typeof setGameSummary>[0]) => setGameSummary(summary);
    const onReadyCount = ({ count, needed }: { count: number; needed: number }) => setReadyCount(count, needed);

    socket.on('game:state', setGameState);
    socket.on('game:over', onGameOver);
    socket.on('game:ready_count', onReadyCount);

    socket.on('lobby:updated', (lobby) => {
      upsertLobby(lobby);
      const { myPlayerId, currentLobbyId } = usePlayerStore.getState();
      // Ignore lobby updates if we've already left (currentLobbyId cleared on leave)
      if (!currentLobbyId) return;
      if (myPlayerId !== null && lobby.slots.some((s) => s.playerId === myPlayerId)) {
        setCurrentLobby(lobby);
        if (lobby.status === 'waiting') {
          clearGame();
        }
      }
    });

    socket.on('lobby:started', ({ initialState }) => {
      setGameState(initialState);
    });

    return () => {
      socket.off('connect');
      socket.off('game:state', setGameState);
      socket.off('game:over', onGameOver);
      socket.off('game:ready_count', onReadyCount);
      socket.off('lobby:updated');
      socket.off('lobby:started');
      socket.disconnect();
    };
  // Empty deps: set up once on mount, tear down on unmount.
  // Store values are read via .getState() inside handlers to avoid stale closures.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return socket;
}
