import React, { useState } from 'react';
import type { GameState } from '@opensettlers/shared';
import type { ValidMoves } from '../../hooks/useValidMoves.js';
import { useThemeStore } from '../../store/useThemeStore.js';
import { socket } from '../../socket.js';

const PHASE_LABELS: Partial<Record<string, string>> = {
  SETUP_PLACE_SETTLEMENT: 'Place Settlement',
  SETUP_PLACE_ROAD: 'Place Road',
  PRE_ROLL: 'Pre-Roll',
  ROLL: 'Roll Dice',
  DISCARD_PHASE: 'Discard Cards',
  ROBBER_PLACEMENT: 'Move Robber',
  STEAL: 'Choose to Steal From',
  TRADE_OFFER_PENDING: 'Waiting for responses…',
  BUILD_PHASE: 'Build / Buy',
  DEV_ROAD_BUILDING: 'Place Roads (Road Building)',
  YEAR_OF_PLENTY_SELECT: 'Year of Plenty',
  MONOPOLY_SELECT: 'Monopoly',
  GAME_OVER: 'Game Over!',
};

interface Props {
  gameState: GameState;
  myPlayerId: string | null;
  validMoves: ValidMoves;
  onLeave: () => void;
}

export function TurnPhaseBar({ gameState, myPlayerId, validMoves, onLeave }: Props) {
  const { phase, players, activePlayerIndex, diceRoll } = gameState;
  const activePlayer = players[activePlayerIndex];
  const isMe = activePlayer?.id === myPlayerId;
  const pendingCount = myPlayerId ? (gameState.pendingDiscards[myPlayerId] ?? 0) : 0;

  const { dark, toggle } = useThemeStore();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  return (
    <div style={{
      background: 'var(--ui-topbar)',
      padding: '7px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      borderBottom: '2px solid var(--ui-topbar-border)',
      flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--ui-topbar-text)', fontSize: 11, fontFamily: "'Cinzel', Georgia, serif", letterSpacing: 0.5 }}>Phase: </span>
        <strong style={{ color: 'var(--ui-topbar-strong)', fontFamily: "'Cinzel', Georgia, serif", fontSize: 13 }}>{PHASE_LABELS[phase] ?? phase}</strong>
        <span style={{ color: 'var(--ui-topbar-text)', fontSize: 11, fontFamily: "'Cinzel', Georgia, serif", letterSpacing: 0.5 }}>| Active: </span>
        <strong style={{ color: 'var(--ui-topbar-strong)', fontFamily: "'Cinzel', Georgia, serif", fontSize: 13 }}>{activePlayer?.name ?? '?'}</strong>
        {isMe && <span style={{ color: '#ffd270', fontSize: 12 }}>(you)</span>}
        {diceRoll && (
          <span style={{ marginLeft: 8, fontSize: 18, color: 'var(--ui-topbar-strong)' }}>
            🎲 {diceRoll[0]} + {diceRoll[1]} = <strong>{diceRoll[0] + diceRoll[1]}</strong>
          </span>
        )}
        {phase === 'DISCARD_PHASE' && pendingCount > 0 && (
          <span style={{ color: '#ffd270', fontSize: 13 }}>
            Discard {pendingCount} cards ↓
          </span>
        )}
      </div>

      {/* Dark/light toggle */}
      <button
        onClick={toggle}
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 6,
          padding: '3px 8px',
          cursor: 'pointer',
          fontSize: 14,
          lineHeight: 1,
          color: 'var(--ui-topbar-strong)',
          flexShrink: 0,
        }}
      >
        {dark ? '☀️' : '🌙'}
      </button>

      {/* Leave button */}
      <button
        onClick={() => setShowLeaveConfirm(true)}
        title="Leave game (bot takes over)"
        style={{
          background: 'rgba(180,30,30,0.25)',
          border: '1px solid rgba(200,60,60,0.45)',
          borderRadius: 6,
          padding: '3px 10px',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          color: '#ffaaaa',
          flexShrink: 0,
        }}
      >
        Leave
      </button>

      {/* Leave confirmation overlay */}
      {showLeaveConfirm && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200,
        }}>
          <div style={{
            background: 'var(--ui-card-bg)',
            border: '1px solid var(--ui-card-border)',
            borderRadius: 12,
            padding: '24px 28px',
            maxWidth: 340,
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ui-text)', marginBottom: 8 }}>
              Leave game?
            </div>
            <div style={{ fontSize: 13, color: 'var(--ui-text-muted)', marginBottom: 20 }}>
              A bot will take over your turn permanently. You won't be able to rejoin.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => setShowLeaveConfirm(false)}
                style={{
                  background: 'var(--ui-btn-muted)', color: 'var(--ui-btn-muted-text)',
                  border: '1px solid var(--ui-border)', borderRadius: 7,
                  padding: '8px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                onClick={onLeave}
                style={{
                  background: '#b91c1c', color: '#fff',
                  border: 'none', borderRadius: 7,
                  padding: '8px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                }}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
