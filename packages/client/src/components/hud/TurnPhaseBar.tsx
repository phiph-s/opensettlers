import React from 'react';
import type { GameState } from '@opensettlers/shared';
import type { ValidMoves } from '../../hooks/useValidMoves.js';

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
}

export function TurnPhaseBar({ gameState, myPlayerId, validMoves }: Props) {
  const { phase, players, activePlayerIndex, diceRoll } = gameState;
  const activePlayer = players[activePlayerIndex];
  const isMe = activePlayer?.id === myPlayerId;
  const pendingCount = myPlayerId ? (gameState.pendingDiscards[myPlayerId] ?? 0) : 0;

  return (
    <div style={{
      background: '#6b4c11',
      padding: '7px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      borderBottom: '2px solid #a07828',
      flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ color: '#e8d5a8', fontSize: 12 }}>Phase: </span>
        <strong style={{ color: '#fff' }}>{PHASE_LABELS[phase] ?? phase}</strong>
        <span style={{ color: '#e8d5a8', fontSize: 12 }}>| Active: </span>
        <strong style={{ color: '#fff' }}>{activePlayer?.name ?? '?'}</strong>
        {isMe && <span style={{ color: '#ffd270', fontSize: 12 }}>(you)</span>}
        {diceRoll && (
          <span style={{ marginLeft: 8, fontSize: 18, color: '#fff' }}>
            🎲 {diceRoll[0]} + {diceRoll[1]} = <strong>{diceRoll[0] + diceRoll[1]}</strong>
          </span>
        )}
        {phase === 'DISCARD_PHASE' && pendingCount > 0 && (
          <span style={{ color: '#ffd270', fontSize: 13 }}>
            Discard {pendingCount} cards ↓
          </span>
        )}
      </div>
    </div>
  );
}
