import React, { useState } from 'react';
import type { Player, TurnPhase } from '@opensettlers/shared';
import { BUILDING_COSTS } from '@opensettlers/shared';
import type { ValidMoves } from '../../hooks/useValidMoves.js';
import { RESOURCE_IMAGES, RESOURCE_COLORS } from '../../assets/resources.js';
import { socket } from '../../socket.js';

function canAfford(player: Player, cost: Partial<Record<string, number>>): boolean {
  for (const [res, amount] of Object.entries(cost)) {
    if (((player.hand as Record<string, number>)[res] ?? 0) < (amount ?? 0)) return false;
  }
  return true;
}

type Resource = 'wood' | 'brick' | 'wheat' | 'sheep' | 'ore';
const RESOURCES: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];

// ── SVG Icons ──────────────────────────────────────────────────────────────

function RoadIcon() {
  return (
    <svg width="20" height="11" viewBox="0 0 20 11" style={{ display: 'block', flexShrink: 0 }}>
      <path d="M1 10 L4 1 L16 1 L19 10 Z" fill="currentColor" />
    </svg>
  );
}

function SettlementIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" style={{ display: 'block', flexShrink: 0 }}>
      <polygon points="8.5,0.5 0,7.5 17,7.5" fill="currentColor" />
      <rect x="2" y="7.5" width="13" height="8.5" fill="currentColor" />
    </svg>
  );
}

function CityIcon() {
  return (
    <svg width="20" height="17" viewBox="0 0 20 17" style={{ display: 'block', flexShrink: 0 }}>
      <rect x="0"  y="0"  width="9"  height="16.5" fill="currentColor" />
      <rect x="9"  y="7"  width="11" height="9.5"  fill="currentColor" />
    </svg>
  );
}

function DevCardIcon() {
  return (
    <svg width="13" height="17" viewBox="0 0 13 17" style={{ display: 'block', flexShrink: 0 }}>
      <rect x="0" y="0" width="13" height="17" rx="2" fill="currentColor" opacity="0.85" />
      <text x="6.5" y="12.5" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold"
        style={{ userSelect: 'none' }}>?</text>
    </svg>
  );
}

function ShipIcon() {
  return (
    <svg width="22" height="14" viewBox="0 0 22 14" style={{ display: 'block', flexShrink: 0 }}>
      {/* Hull */}
      <path d="M2 7 Q1 12 11 13 Q21 12 20 7 L17 4 L5 4 Z" fill="currentColor" opacity="0.9" />
      {/* Mast */}
      <line x1="11" y1="4" x2="11" y2="0" stroke="currentColor" strokeWidth="1.5" />
      {/* Sail */}
      <path d="M12 1 L20 5 L12 7 Z" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

function EndTurnIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" style={{ display: 'block', flexShrink: 0 }}>
      <polyline
        points="2,7.5 5.5,11 13,4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Cost tooltip ────────────────────────────────────────────────────────────

interface Props {
  me: Player;
  phase: TurnPhase;
  validMoves: ValidMoves;
  isMyTurn: boolean;
  buildMode: 'road' | 'settlement' | 'city' | 'ship' | null;
  onBuildModeChange: (mode: 'road' | 'settlement' | 'city' | 'ship' | null) => void;
  isSeafarers?: boolean;
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
                width: 28, height: 36, borderRadius: 4,
                background: RESOURCE_COLORS[r],
                border: lacking ? '2px solid #b91c1c' : '2px solid transparent',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 2,
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

// ── Action button ───────────────────────────────────────────────────────────

interface ActionBtnProps {
  label: string;
  icon: React.ReactNode;
  cost?: Partial<Record<Resource, number>>;
  player?: Player;
  disabled: boolean;
  onClick: () => void;
  color?: string;
  active?: boolean;
  piecesLeft?: number;
  reason?: string;
}

function ActionButton({ label, icon, cost, player, disabled, onClick, color = '#6b4c11', active = false, piecesLeft, reason }: ActionBtnProps) {
  const [hovered, setHovered] = useState(false);
  return (
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
          padding: '0 11px',
          height: BTN_HEIGHT,
          cursor: disabled ? 'default' : 'pointer',
          fontSize: 12,
          fontWeight: 'bold',
          transition: 'background 0.15s, color 0.15s',
          boxShadow: active ? `0 0 8px ${color}66` : undefined,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          boxSizing: 'border-box',
        }}
      >
        {icon}
        <span>{label}</span>
        {piecesLeft !== undefined && (
          <span style={{
            position: 'absolute',
            top: -7, right: -7,
            background: disabled ? '#b0a898' : color,
            color: '#fff',
            fontSize: 9, fontWeight: 'bold',
            borderRadius: '50%',
            width: 16, height: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid #fff',
            pointerEvents: 'none',
          }}>{piecesLeft}</span>
        )}
      </button>
    </div>
  );
}

// ── BuildPanel ──────────────────────────────────────────────────────────────

const BTN_HEIGHT = 34;

export function BuildPanel({ me, phase, validMoves, isMyTurn, buildMode, onBuildModeChange, isSeafarers }: Props) {
  const inBuild = phase === 'BUILD_PHASE' || phase === 'DEV_ROAD_BUILDING';
  const canEnd = validMoves.canEndTurn && isMyTurn;

  if (!inBuild && !canEnd) return null;

  const toggle = (mode: 'road' | 'settlement' | 'city' | 'ship') => {
    onBuildModeChange(buildMode === mode ? null : mode);
  };

  return (
    <div style={{
      display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center',
      padding: '6px 10px',
      background: 'var(--ui-overlay-bg)',
      border: '1px solid var(--ui-border)',
      borderRadius: 10,
    }}>
      {inBuild && (
        <>
          <ActionButton
            label="Road"
            icon={<RoadIcon />}
            cost={BUILDING_COSTS.road}
            player={me}
            piecesLeft={me.roadsLeft}
            disabled={!isMyTurn || !canAfford(me, BUILDING_COSTS.road) || validMoves.roadEdges.size === 0}
            reason={isMyTurn ? (me.roadsLeft === 0 ? 'No roads left' : validMoves.roadEdges.size === 0 ? 'No valid locations' : undefined) : undefined}
            active={buildMode === 'road'}
            onClick={() => toggle('road')}
          />
          <ActionButton
            label="Settlement"
            icon={<SettlementIcon />}
            cost={BUILDING_COSTS.settlement}
            player={me}
            piecesLeft={me.settlementsLeft}
            disabled={!isMyTurn || !canAfford(me, BUILDING_COSTS.settlement) || validMoves.settlementVertices.size === 0}
            reason={isMyTurn ? (me.settlementsLeft === 0 ? 'No settlements left' : validMoves.settlementVertices.size === 0 ? 'No valid locations' : undefined) : undefined}
            active={buildMode === 'settlement'}
            onClick={() => toggle('settlement')}
          />
          <ActionButton
            label="City"
            icon={<CityIcon />}
            cost={BUILDING_COSTS.city}
            player={me}
            piecesLeft={me.citiesLeft}
            disabled={!isMyTurn || !canAfford(me, BUILDING_COSTS.city) || validMoves.cityVertices.size === 0}
            reason={isMyTurn ? (me.citiesLeft === 0 ? 'No cities left' : validMoves.cityVertices.size === 0 ? 'No settlements to upgrade' : undefined) : undefined}
            active={buildMode === 'city'}
            onClick={() => toggle('city')}
          />
          {isSeafarers && (
            <ActionButton
              label="Ship"
              icon={<ShipIcon />}
              cost={BUILDING_COSTS.ship}
              player={me}
              piecesLeft={me.shipsLeft}
              disabled={!isMyTurn || !canAfford(me, BUILDING_COSTS.ship) || validMoves.shipEdges.size === 0}
              reason={isMyTurn ? (me.shipsLeft === 0 ? 'No ships left' : validMoves.shipEdges.size === 0 ? 'No valid locations' : undefined) : undefined}
              active={buildMode === 'ship'}
              onClick={() => toggle('ship')}
              color="#1a5a8a"
            />
          )}
          <ActionButton
            label="Dev Card"
            icon={<DevCardIcon />}
            cost={BUILDING_COSTS.dev_card}
            player={me}
            disabled={!isMyTurn || !validMoves.canBuyDevCard}
            onClick={() => socket.emit('game:buy_dev_card')}
            color="#9b59b6"
          />
        </>
      )}
      {canEnd && (
        <ActionButton
          label="End Turn"
          icon={<EndTurnIcon />}
          disabled={false}
          onClick={() => socket.emit('game:end_turn')}
          color="#27ae60"
        />
      )}
    </div>
  );
}
