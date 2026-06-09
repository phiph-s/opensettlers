import React from 'react';
import { useGameStore } from './store/useGameStore.js';
import { useLobbyStore } from './store/useLobbyStore.js';
import { useSocket } from './hooks/useSocket.js';
import { LobbyListScreen } from './screens/LobbyListScreen.js';
import { LobbyRoomScreen } from './screens/LobbyRoomScreen.js';
import { GameScreen } from './screens/GameScreen.js';

export function App() {
  useSocket();

  const gameState = useGameStore((s) => s.gameState);
  const currentLobby = useLobbyStore((s) => s.currentLobby);

  if (gameState && gameState.phase !== 'GAME_OVER') {
    return <GameScreen />;
  }

  if (currentLobby) {
    return <LobbyRoomScreen />;
  }

  return <LobbyListScreen />;
}
