import React, { useState } from 'react';
import type { Player, TurnPhase } from '@opensettlers/shared';
import { BUILDING_COSTS } from '@opensettlers/shared';

function canAfford(player: Player, cost: Partial<Record<string, number>>): boolean {
  for (const [res, amount] of Object.entries(cost)) {
    if (((player.hand as Record<string, number>)[res] ?? 0) < (amount ?? 0)) return false;
  }
  return true;
}
import type { ValidMoves } from '../../hooks/useValidMoves.js';
import { RESOURCE_IMAGES, RESOURCE_COLORS } from '../../assets/resources.js';
import { socket } from '../../socket.js';

type Resource = 'wood' | 'brick' | 'wheat' | 'sheep' | 'ore';
const RESOURCES: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];

interface Props {
  me: Player;
  phase: TurnPhase;
  validMoves: ValidMoves;
  isMyTurn: boolean;
  buildMode: 'road' | 'settlement' | 'city' | null;
  onBuildModeChange: (mode: 'road' | 'settlement' | 'city' | null) => void;
}

function CostTooltip({ cost, player, reason }: { cost: Partial<Record<Resource, number>>; player: Player; reason?: string }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: '110%',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#fffdf7',
      border: '1px solid #c9bfae',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      borderRadius: 8,
      padding: '6px 8px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      zIndex: 100,
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
    }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {RESOURCES.filter((r) => (cost[r] ?? 0) > 0).map((r) => {
          const need = cost[r] ?? 0;
          const have = (player.hand as Record<string, number>)[r] ?? 0;
          const lacking = have < need;
          return (
            <div key={r} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{
                width: 28,
                height: 36,
                borderRadius: 4,
                background: RESOURCE_COLORS[r],
                border: lacking ? '2px solid #b91c1c' : '2px solid transparent',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                opacity: lacking ? 0.7 : 1,
              }}>
                <img src={RESOURCE_IMAGES[r]} width={18} height={18} style={{ objectFit: 'contain' }} alt={r} />
                <span style={{ color: lacking ? '#ffaaaa' : '#fff', fontSize: 11, fontWeight: 'bold' }}>
                  {have}/{need}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {reason && (
        <div style={{ fontSize: 10, color: '#b91c1c', textAlign: 'center', borderTop: '1px solid #e8e1d5', paddingTop: 4 }}>
          {reason}
        </div>
      )}
    </div>
  );
}

interface ActionBtnProps {
  label: string;
  cost?: Partial<Record<Resource, number>>;
  player?: Player;
  disabled: boolean;
  onClick: () => void;
  color?: string;
  active?: boolean;
  piecesLeft?: number;
  reason?: string;
}

function ActionButton({ label, cost, player, disabled, onClick, color = '#6b4c11', active = false, piecesLeft, reason }: ActionBtnProps) {
  const [hovered, setHovered] = useState(false);
  return (
    // Hover listeners on wrapper so they fire even when the inner button is disabled
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && cost && player && <CostTooltip cost={cost} player={player} reason={reason} />}
      <button
        disabled={disabled}
        onClick={onClick}
        style={{
          background: disabled ? '#e0d8ce' : active ? color : '#fff',
          color: disabled ? '#9e8e7e' : active ? '#fff' : color,
          border: `2px solid ${disabled ? '#c9bfae' : color}`,
          borderRadius: 6,
          padding: '6px 14px',
          cursor: disabled ? 'default' : 'pointer',
          fontSize: 13,
          fontWeight: 'bold',
          transition: 'background 0.15s, color 0.15s',
          boxShadow: active ? `0 0 8px ${color}66` : undefined,
          position: 'relative',
        }}
      >
        {label}
        {piecesLeft !== undefined && (
          <span style={{
            position: 'absolute',
            top: -7,
            right: -7,
            background: disabled ? '#b0a898' : color,
            color: '#fff',
            fontSize: 9,
            fontWeight: 'bold',
            borderRadius: '50%',
            width: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid #fff',
            pointerEvents: 'none',
          }}>{piecesLeft}</span>
        )}
      </button>
    </div>
  );
}

export function BuildPanel({ me, phase, validMoves, isMyTurn, buildMode, onBuildModeChange }: Props) {
  const inBuild = phase === 'BUILD_PHASE' || phase === 'DEV_ROAD_BUILDING';
  const canEnd = validMoves.canEndTurn && isMyTurn;

  const toggle = (mode: 'road' | 'settlement' | 'city') => {
    onBuildModeChange(buildMode === mode ? null : mode);
  };

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', padding: '6px 10px', background: 'rgba(255,255,255,0.5)', border: '1px solid #c9bfae', borderRadius: 10 }}>
      {inBuild && (
        <>
          <ActionButton
            label="Road"
            cost={BUILDING_COSTS.road}
            player={me}
            piecesLeft={me.roadsLeft}
            disabled={!isMyTurn || !canAfford(me, BUILDING_COSTS.road) || validMoves.roadEdges.size === 0}
            reason={isMyTurn && (me.roadsLeft === 0 ? 'No roads left' : validMoves.roadEdges.size === 0 ? 'No valid locations' : undefined)}
            active={buildMode === 'road'}
            onClick={() => toggle('road')}
          />
          <ActionButton
            label="Settlement"
            cost={BUILDING_COSTS.settlement}
            player={me}
            piecesLeft={me.settlementsLeft}
            disabled={!isMyTurn || !canAfford(me, BUILDING_COSTS.settlement) || validMoves.settlementVertices.size === 0}
            reason={isMyTurn && (me.settlementsLeft === 0 ? 'No settlements left' : validMoves.settlementVertices.size === 0 ? 'No valid locations' : undefined)}
            active={buildMode === 'settlement'}
            onClick={() => toggle('settlement')}
          />
          <ActionButton
            label="City"
            cost={BUILDING_COSTS.city}
            player={me}
            piecesLeft={me.citiesLeft}
            disabled={!isMyTurn || !canAfford(me, BUILDING_COSTS.city) || validMoves.cityVertices.size === 0}
            reason={isMyTurn && (me.citiesLeft === 0 ? 'No cities left' : validMoves.cityVertices.size === 0 ? 'No settlements to upgrade' : undefined)}
            active={buildMode === 'city'}
            onClick={() => toggle('city')}
          />
          <ActionButton
            label="Dev Card"
            cost={BUILDING_COSTS.dev_card}
            player={me}
            disabled={!isMyTurn || !validMoves.canBuyDevCard}
            onClick={() => socket.emit('game:buy_dev_card')}
            color="#9b59b6"
          />
        </>
      )}
      {canEnd && (
        <ActionButton label="End Turn" disabled={false} onClick={() => socket.emit('game:end_turn')} color="#27ae60" />
      )}
    </div>
  );
}
