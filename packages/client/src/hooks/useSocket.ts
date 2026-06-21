import { useEffect } from 'react';
import { socket } from '../socket.js';
import { useGameStore } from '../store/useGameStore.js';
import { useLobbyStore } from '../store/useLobbyStore.js';
import { usePlayerStore } from '../store/usePlayerStore.js';
import { useConnectionStore } from '../store/useConnectionStore.js';

export function useSocket() {
  // Stable references — Zustand setters never change identity
  const setGameState = useGameStore((s) => s.setGameState);
  const setGameSummary = useGameStore((s) => s.setGameSummary);
  const clearGame = useGameStore((s) => s.clearGame);
  const upsertLobby = useLobbyStore((s) => s.upsertLobby);
  const setCurrentLobby = useLobbyStore((s) => s.setCurrentLobby);

  useEffect(() => {
    socket.connect();

    const setStatus = useConnectionStore.getState().setStatus;

    const clearAll = () => {
      useGameStore.getState().clearGame();
      useLobbyStore.getState().setCurrentLobby(null);
      usePlayerStore.getState().setLobbyId(null);
    };

    // Re-establish our seat using the persisted identity. Used both on (re)connect
    // and when the server tells us the session is gone (game:error NO_SESSION).
    const attemptRejoin = () => {
      const { myPlayerId, currentLobbyId } = usePlayerStore.getState();
      if (!myPlayerId || !currentLobbyId) return;
      socket.emit('game:rejoin', { playerId: myPlayerId, lobbyId: currentLobbyId }, (res) => {
        if (res.ok) setGameState(res.data);
        else clearAll(); // server restarted or game gone — go to main
      });
    };

    // On a transient disconnect, preserve game state AND the lobby identity
    // (myPlayerId/currentLobbyId) so we can rejoin. Wiping here previously yanked
    // players to the home screen and discarded the lobby id needed to reconnect —
    // the cause of "kicked out" / "can't rejoin". The server holds the seat
    // (rejoin grace + connectionStateRecovery); a genuinely gone session is
    // cleared by the failed-rejoin branch.
    socket.on('disconnect', () => setStatus('reconnecting'));

    socket.on('connect', () => {
      setStatus('connected');
      attemptRejoin();
    });

    // Safety net: if the server can't resolve our session for an action (e.g. it
    // restarted, or our socket identity was lost), transparently re-rejoin instead
    // of leaving the player with dead, unresponsive buttons.
    socket.on('game:error', ({ code }) => {
      if (code === 'NO_SESSION') attemptRejoin();
    });

    const onGameOver = (summary: Parameters<typeof setGameSummary>[0]) => setGameSummary(summary);

    socket.on('game:state', setGameState);
    socket.on('game:over', onGameOver);

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
      socket.off('disconnect');
      socket.off('game:error');
      socket.off('game:state', setGameState);
      socket.off('game:over', onGameOver);
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
