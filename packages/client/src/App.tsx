import React from 'react';
import { useGameStore } from './store/useGameStore.js';
import { useLobbyStore } from './store/useLobbyStore.js';
import { useSocket } from './hooks/useSocket.js';
import { useThemeStore } from './store/useThemeStore.js';
import { LobbyListScreen } from './screens/LobbyListScreen.js';
import { LobbyRoomScreen } from './screens/LobbyRoomScreen.js';
import { GameScreen } from './screens/GameScreen.js';
import { VictoryScreen } from './screens/VictoryScreen.js';
import { ConnectionBanner } from './components/ConnectionBanner.js';

export function App() {
  useSocket();
  const dark = useThemeStore((s) => s.dark);
  React.useEffect(() => {
    document.body.classList.toggle('dark', dark);
  }, [dark]);

  const gameState = useGameStore((s) => s.gameState);
  const gameSummary = useGameStore((s) => s.gameSummary);
  const currentLobby = useLobbyStore((s) => s.currentLobby);

  let screen: React.ReactNode;
  if (gameSummary) {
    screen = (
      <>
        {gameState && gameState.phase !== 'GAME_OVER' ? <GameScreen /> : currentLobby ? <LobbyRoomScreen /> : <LobbyListScreen />}
        <VictoryScreen />
      </>
    );
  } else if (gameState && gameState.phase !== 'GAME_OVER') {
    screen = <GameScreen />;
  } else if (currentLobby) {
    screen = <LobbyRoomScreen />;
  } else {
    screen = <LobbyListScreen />;
  }

  return (
    <>
      <ConnectionBanner />
      {screen}
    </>
  );
}
