import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { usePlayerStore } from '../store/usePlayerStore.js';
import { useValidMoves } from '../hooks/useValidMoves.js';
import { useSoundEffects } from '../hooks/useSoundEffects.js';
import { HexGrid } from '../components/board/HexGrid.js';
import { PanZoomBoard } from '../components/board/PanZoomBoard.js';
import { TurnPhaseBar } from '../components/hud/TurnPhaseBar.js';
import { TurnTimerBar } from '../components/hud/TurnTimerBar.js';
import { PlayerPanel } from '../components/panel/PlayerPanel.js';
import { DiscardPanel } from '../components/trade/DiscardPanel.js';
import { VictoryBanner } from '../components/hud/VictoryBanner.js';
import { ResourceHand, computePortRates } from '../components/hud/ResourceHand.js';
import { DevCardHand } from '../components/hud/DevCardHand.js';
import { BuildPanel } from '../components/hud/BuildPanel.js';
import { TradeDrawer } from '../components/trade/TradeDrawer.js';
import { DiceDisplay } from '../components/hud/DiceDisplay.js';
import { ActivityLog } from '../components/panel/ActivityLog.js';
import { StealDialog } from '../components/hud/StealDialog.js';
import type { GameOverSummary } from '@opensettlers/shared';
import { socket } from '../socket.js';

export function GameScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const { myPlayerId } = usePlayerStore();
  const validMoves = useValidMoves(gameState, myPlayerId);
  useSoundEffects(gameState, myPlayerId);
  const [gameSummary, setGameSummary] = useState<GameOverSummary | null>(null);
  const [buildMode, setBuildMode] = useState<'road' | 'settlement' | 'city' | null>(null);

  // Clear build mode whenever the phase changes (placement was accepted or turn ended)
  const prevPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    if (gameState && prevPhaseRef.current !== gameState.phase) {
      setBuildMode(null);
      prevPhaseRef.current = gameState.phase;
    }
  });

  React.useEffect(() => {
    socket.on('game:over', (summary) => setGameSummary(summary));
    return () => { socket.off('game:over'); };
  }, []);

  if (!gameState) return null;

  const { players, activePlayerIndex, phase, phaseDeadline, pendingDiscards } = gameState;
  const activePlayer = players[activePlayerIndex];
  const me = players.find((p) => p.id === myPlayerId);
  const myDiscardCount = myPlayerId ? (pendingDiscards[myPlayerId] ?? 0) : 0;

  const portRates = me ? computePortRates(me, gameState.board) : {};

  const totalSeconds = 60; // rough fallback; could derive from settings

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TurnPhaseBar gameState={gameState} myPlayerId={myPlayerId} validMoves={validMoves} />
      <TurnTimerBar deadline={phaseDeadline} totalSeconds={totalSeconds} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#f2ede4' }}>
        {/* Board — position:relative so floating overlays can sit above it */}
        <div style={{ flex: 1, overflow: 'hidden', padding: 8, position: 'relative' }}>
          <PanZoomBoard>
            <HexGrid gameState={gameState} myPlayerId={myPlayerId} validMoves={validMoves} buildMode={buildMode} onBuildModeChange={setBuildMode} />
          </PanZoomBoard>
          {/* Floating trade drawer — bottom-left of the board area */}
          {me && (phase === 'BUILD_PHASE' || phase === 'TRADE_OFFER_PENDING') && (
            <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 10 }}>
              <TradeDrawer
                gameState={gameState}
                me={me}
                portRates={portRates}
                isMyTurn={myPlayerId === activePlayer?.id}
              />
            </div>
          )}
          {/* Dice — bottom-right of board */}
          <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 10 }}>
            <DiceDisplay
              diceRoll={gameState.diceRoll}
              canRoll={validMoves.canRoll && myPlayerId === activePlayer?.id}
            />
          </div>
        </div>

        {/* Side panel */}
        <div style={{
          width: 248,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: 8,
          overflowY: 'auto',
          background: '#e8e1d5',
          borderLeft: '1px solid #c9bfae',
        }}>
          <ActivityLog players={players} />
          {players.map((p) => (
            <PlayerPanel
              key={p.id}
              player={p}
              isActive={p.id === activePlayer?.id}
              isMe={p.id === myPlayerId}
              board={gameState.board}
              longestRoadOwner={gameState.longestRoadOwner}
              largestArmyOwner={gameState.largestArmyOwner}
            />
          ))}
        </div>
      </div>

      {/* Bottom bar — resources + dev cards + build actions */}
      <div style={{ display: 'flex', gap: 10, padding: '8px 12px', background: '#e8e1d5', borderTop: '1px solid #c9bfae', alignItems: 'center' }}>
        {me && <ResourceHand player={me} portRates={portRates} playerId={me.id} />}
        {me && me.devCards.length > 0 && (
          <DevCardHand
            devCards={me.devCards}
            turnPhase={phase}
            isMyTurn={myPlayerId === activePlayer?.id}
            turnNumber={gameState.turnNumber}
          />
        )}
        {me && <BuildPanel me={me} phase={phase} validMoves={validMoves} isMyTurn={myPlayerId === activePlayer?.id} buildMode={buildMode} onBuildModeChange={setBuildMode} />}
      </div>

      {/* Steal dialog */}
      {phase === 'STEAL' && myPlayerId === activePlayer?.id && gameState.robberCandidates.length > 1 && (
        <StealDialog candidates={gameState.robberCandidates} players={players} />
      )}

      {/* Discard modal */}
      {me && myDiscardCount > 0 && (
        <DiscardPanel me={me} count={myDiscardCount} />
      )}

      {/* Victory banner */}
      {gameSummary && (
        <VictoryBanner summary={gameSummary} players={players} myPlayerId={myPlayerId} />
      )}
    </div>
  );
}
