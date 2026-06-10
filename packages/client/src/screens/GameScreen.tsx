import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { usePlayerStore } from '../store/usePlayerStore.js';
import { useValidMoves } from '../hooks/useValidMoves.js';
import { useSoundEffects } from '../hooks/useSoundEffects.js';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { HexGrid } from '../components/board/HexGrid.js';
import { PanZoomBoard } from '../components/board/PanZoomBoard.js';
import { TurnPhaseBar } from '../components/hud/TurnPhaseBar.js';
import { TurnTimerBar } from '../components/hud/TurnTimerBar.js';
import { PlayerPanel } from '../components/panel/PlayerPanel.js';
import { DiscardPanel } from '../components/trade/DiscardPanel.js';
import { ResourceHand, computePortRates } from '../components/hud/ResourceHand.js';
import { DevCardHand } from '../components/hud/DevCardHand.js';
import { BuildPanel } from '../components/hud/BuildPanel.js';
import { TradeDrawer } from '../components/trade/TradeDrawer.js';
import { DiceDisplay } from '../components/hud/DiceDisplay.js';
import { ActivityLog } from '../components/panel/ActivityLog.js';
import { BankPanel } from '../components/panel/BankPanel.js';
import { StealDialog } from '../components/hud/StealDialog.js';
import { GoldSelectPanel } from '../components/hud/GoldSelectPanel.js';
import { ResourceFlowLayer } from '../components/hud/ResourceFlowLayer.js';
import { AchievementBanner } from '../components/hud/AchievementBanner.js';
import { OceanBackground } from '../components/board/OceanBackground.js';
import { useLobbyStore } from '../store/useLobbyStore.js';
import { socket } from '../socket.js';

export function GameScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const clearGame = useGameStore((s) => s.clearGame);
  const { myPlayerId } = usePlayerStore();
  const currentLobby = useLobbyStore((s) => s.currentLobby);
  const setCurrentLobby = useLobbyStore((s) => s.setCurrentLobby);
  const validMoves = useValidMoves(gameState, myPlayerId);
  useSoundEffects(gameState, myPlayerId);
  const [buildMode, setBuildMode] = useState<'road' | 'settlement' | 'city' | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useIsMobile();

  // Clear build mode whenever the phase changes (placement was accepted or turn ended)
  const prevPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    if (gameState && prevPhaseRef.current !== gameState.phase) {
      setBuildMode(null);
      prevPhaseRef.current = gameState.phase;
    }
  });

  if (!gameState) return null;

  const { players, activePlayerIndex, phase, phaseDeadline, pendingDiscards, pendingGoldChoices } = gameState;
  const activePlayer = players[activePlayerIndex];
  const me = players.find((p) => p.id === myPlayerId);
  const myDiscardCount = myPlayerId ? (pendingDiscards[myPlayerId] ?? 0) : 0;

  const portRates = me ? computePortRates(me, gameState.board) : {};

  const totalSeconds = 60; // rough fallback; could derive from settings

  const onLeave = () => {
    if (currentLobby) {
      socket.emit('game:leave', { lobbyId: currentLobby.id }, (res) => {
        if (res.ok) {
          clearGame();
          setCurrentLobby(null);
          usePlayerStore.getState().setLobbyId(null);
        }
      });
    }
  };

  const sidePanel = (
    <>
      <ActivityLog players={players} />
      <BankPanel bank={gameState.bank} devCardDeckSize={gameState.devCardDeckSize} />
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
    </>
  );

  const bottomBar = (
    <div style={{
      display: 'flex', gap: 10, padding: '8px 12px',
      background: 'var(--ui-bg)', borderTop: '1px solid var(--ui-border)',
      alignItems: 'center',
      boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.08)',
      overflowX: isMobile ? 'auto' : undefined,
      flexWrap: isMobile ? 'nowrap' : undefined,
    }}>
      {me && <ResourceHand player={me} portRates={portRates} playerId={me.id} />}
      {me && me.devCards.length > 0 && (
        <DevCardHand
          devCards={me.devCards}
          turnPhase={phase}
          isMyTurn={myPlayerId === activePlayer?.id}
          turnNumber={gameState.turnNumber}
          devCardPlayedThisTurn={gameState.devCardPlayedThisTurn}
          bank={gameState.bank}
        />
      )}
      {me && <BuildPanel me={me} phase={phase} validMoves={validMoves} isMyTurn={myPlayerId === activePlayer?.id} buildMode={buildMode} onBuildModeChange={setBuildMode} />}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <OceanBackground />
      <TurnPhaseBar
        gameState={gameState}
        myPlayerId={myPlayerId}
        validMoves={validMoves}
        onLeave={onLeave}
      />
      <TurnTimerBar deadline={phaseDeadline} totalSeconds={totalSeconds} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'transparent' }}>
        {/* Board */}
        <div style={{ flex: 1, overflow: 'hidden', padding: 8, position: 'relative', background: 'transparent' }}>
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
          {/* Mobile: floating players button */}
          {isMobile && (
            <button
              onClick={() => setDrawerOpen(true)}
              style={{
                position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                zIndex: 10,
                background: 'var(--ui-bg)', border: '1px solid var(--ui-border)',
                borderRadius: 20, padding: '6px 16px', cursor: 'pointer',
                color: 'var(--ui-text)', fontSize: 12, fontFamily: "'Cinzel', Georgia, serif",
                letterSpacing: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              Players
            </button>
          )}
        </div>

        {/* Desktop side panel */}
        {!isMobile && (
          <div style={{
            width: 248,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: 10,
            overflowY: 'auto',
            background: 'linear-gradient(180deg, var(--ui-bg) 0%, rgba(0,0,0,0.04) 100%)',
            borderLeft: '1px solid var(--ui-border)',
            boxShadow: 'inset 3px 0 12px rgba(0,0,0,0.08)',
          }}>
            {sidePanel}
          </div>
        )}
      </div>

      {bottomBar}

      {/* Mobile: slide-up drawer */}
      {isMobile && drawerOpen && (
        <>
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50,
            }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            height: '60vh', zIndex: 51,
            background: 'var(--ui-bg)',
            borderTop: '1px solid var(--ui-border)',
            borderRadius: '16px 16px 0 0',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderBottom: '1px solid var(--ui-border)', flexShrink: 0,
            }}>
              <span style={{ fontSize: 11, fontFamily: "'Cinzel', Georgia, serif", letterSpacing: 2, color: 'var(--ui-text-muted)', textTransform: 'uppercase' }}>Players</span>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ui-text-muted)', fontSize: 18, lineHeight: 1, padding: 0 }}
              >×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
              {sidePanel}
            </div>
          </div>
        </>
      )}

      {/* Steal dialog */}
      {phase === 'STEAL' && myPlayerId === activePlayer?.id && gameState.robberCandidates.length > 1 && (
        <StealDialog candidates={gameState.robberCandidates} players={players} />
      )}

      {/* Discard modal */}
      {me && myDiscardCount > 0 && (
        <DiscardPanel me={me} count={myDiscardCount} />
      )}

      {/* Gold selection modal */}
      {myPlayerId && (pendingGoldChoices?.[myPlayerId] ?? 0) > 0 && (
        <GoldSelectPanel needed={pendingGoldChoices![myPlayerId]!} />
      )}

      {/* Achievement banners — longest road / largest army */}
      <AchievementBanner gameState={gameState} />

      {/* Resource / dev-card flying animation layer */}
      <ResourceFlowLayer gameState={gameState} />
    </div>
  );
}
