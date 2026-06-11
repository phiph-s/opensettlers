import React from 'react';
import type { Player, GameBoard } from '@opensettlers/shared';
import { longestRoadForPlayer } from '@opensettlers/shared';
import { useHoverStore } from '../../store/useHoverStore.js';

const COLOR_MAP: Record<string, string> = {
  red: '#e63946', blue: '#457b9d', orange: '#f4a261', black: '#2c2c2c',
  green: '#2ecc71', purple: '#9b59b6', yellow: '#e8c730', pink: '#e91e8c',
};

const RESOURCES = ['wood', 'brick', 'wheat', 'sheep', 'ore'] as const;

interface Props {
  player: Player;
  isActive: boolean;
  isMe: boolean;
  board: GameBoard;
  longestRoadOwner: string | null;
  largestArmyOwner: string | null;
  claimedIslands?: Record<string, string>;
  discoveryBonus?: boolean;
}

function computeVisibleVP(
  player: Player, board: GameBoard,
  longestRoadOwner: string | null, largestArmyOwner: string | null,
  claimedIslands?: Record<string, string>, discoveryBonus?: boolean
): number {
  let vp = 0;
  for (const vertex of Object.values(board.vertices)) {
    if (vertex.building?.owner === player.id) {
      vp += vertex.building.type === 'city' ? 2 : 1;
    }
  }
  if (longestRoadOwner === player.id) vp += 2;
  if (largestArmyOwner === player.id) vp += 2;
  if (discoveryBonus && claimedIslands) {
    for (const ownerId of Object.values(claimedIslands)) {
      if (ownerId === player.id) vp += 2;
    }
  }
  return vp;
}

function DevCard({ count }: { count: number }) {
  return (
    <div title={`${count} dev card(s)`} style={{
      width: 20, height: 28,
      background: 'linear-gradient(160deg, #2e4a7a, #1a2d55)',
      borderRadius: 3, border: '1.5px solid #4a6aaa',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 1, flexShrink: 0,
    }}>
      <span style={{ fontSize: 9, color: '#aac4f4', lineHeight: 1 }}>?</span>
      <span style={{ fontSize: 8, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{count}</span>
    </div>
  );
}

function HandCard({ total }: { total: number }) {
  return (
    <div title={`${total} card(s)`} style={{
      width: 20, height: 28,
      background: '#7a6a5a',
      borderRadius: 3, border: '1.5px solid rgba(0,0,0,0.25)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 1, flexShrink: 0,
    }}>
      <span style={{ fontSize: 9, color: '#d0c0b0', lineHeight: 1 }}>?</span>
      <span style={{ fontSize: 8, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{total}</span>
    </div>
  );
}

function VPBadge({ vp, hidden }: { vp: number; hidden: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2,
      background: '#c8920a', border: '1.5px solid #9a6800',
      borderRadius: 5, padding: '1px 5px', flexShrink: 0,
    }}>
      <span style={{ fontSize: 9, lineHeight: 1, color: '#fff' }}>★</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
        {hidden ? `${vp}+` : vp}
      </span>
    </div>
  );
}

function SmallRoadIcon() {
  return (
    <svg width="16" height="9" viewBox="0 0 16 9" style={{ display: 'block', flexShrink: 0 }}>
      <path d="M1 8.5 L3.5 0.5 L12.5 0.5 L15 8.5 Z" fill="currentColor" />
    </svg>
  );
}

function SmallShieldIcon() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" style={{ display: 'block', flexShrink: 0 }}>
      <path d="M6,0 L12,2.5 L12,7.5 Q12,11.5 6,14 Q0,11.5 0,7.5 L0,2.5 Z" fill="currentColor" />
    </svg>
  );
}

function StatBadge({ icon, count, golden, title }: { icon: React.ReactNode; count: number; golden: boolean; title: string }) {
  return (
    <div
      title={title}
      style={{
        display: 'flex', alignItems: 'center', gap: 3,
        padding: '2px 5px',
        background: golden ? 'rgba(212,160,23,0.18)' : 'rgba(0,0,0,0.04)',
        border: golden ? '1px solid rgba(212,160,23,0.5)' : '1px solid rgba(0,0,0,0.08)',
        borderRadius: 5,
        color: golden ? '#d4a017' : 'var(--ui-text-faint)',
        flexShrink: 0,
      }}
    >
      {icon}
      <span style={{ fontSize: 11, fontWeight: golden ? 800 : 600, lineHeight: 1 }}>{count}</span>
      {golden && <span style={{ fontSize: 8, lineHeight: 1 }}>★</span>}
    </div>
  );
}

export function PlayerPanel({ player, isActive, isMe, board, longestRoadOwner, largestArmyOwner, claimedIslands, discoveryBonus }: Props) {
  const color = COLOR_MAP[player.color] ?? '#aaa';
  const setHoveredPlayerId = useHoverStore((s) => s.setHoveredPlayerId);
  const visibleVP = computeVisibleVP(player, board, longestRoadOwner, largestArmyOwner, claimedIslands, discoveryBonus);
  const totalVP = player.victoryPoints;
  const hasHiddenVP = isMe && totalVP > visibleVP;

  const devCount = player.devCardCount ?? player.devCards.length;
  const roadLength = longestRoadForPlayer(board, player.id);
  const armySize = player.knightsPlayed;
  const holdsLR = player.hasLongestRoad;
  const holdsLA = player.hasLargestArmy;

  const totalHandCount = RESOURCES.reduce((s, r) => s + (player.hand[r] ?? 0), 0);

  return (
    <div
      data-player-id={player.id}
      onMouseEnter={() => setHoveredPlayerId(player.id)}
      onMouseLeave={() => setHoveredPlayerId(null)}
      style={{
        background: isActive ? 'var(--ui-panel-active)' : 'var(--ui-panel)',
        border: `2px solid ${isActive ? color : 'var(--ui-border)'}`,
        borderRadius: 10,
        padding: '7px 9px',
        boxShadow: isActive ? `0 2px 10px ${color}44` : '0 1px 3px rgba(0,0,0,0.07)',
        transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
        display: 'flex', gap: 8, alignItems: 'center',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%', background: color,
        border: `3px solid ${isActive ? '#f0c040' : 'rgba(0,0,0,0.12)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        boxShadow: isActive ? `0 0 14px ${color}99, 0 2px 6px rgba(0,0,0,0.25)` : '0 1px 4px rgba(0,0,0,0.18)',
        fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.92)',
        textShadow: '0 1px 3px rgba(0,0,0,0.35)', userSelect: 'none',
      }}>
        {player.name.charAt(0).toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Row 1: name + VP */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
          <span style={{
            flex: 1, fontWeight: 700, fontSize: 12, color: 'var(--ui-text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontFamily: "'Cinzel', Georgia, serif",
          }}>
            {player.isBot && <span style={{ fontSize: 10, marginRight: 3, opacity: 0.75 }}>🤖</span>}
            {player.name}
            {isMe && <span style={{ fontWeight: 400, color: 'var(--ui-text-faint)', fontSize: 10 }}> (you)</span>}
          </span>
          {isActive && <span style={{ fontSize: 10, color, fontWeight: 900, flexShrink: 0 }}>▶</span>}
          <VPBadge vp={visibleVP} hidden={hasHiddenVP} />
        </div>

        {/* Row 2: cards + road/army stat badges inline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <HandCard total={totalHandCount} />
          <DevCard count={devCount} />
          <div style={{ flex: 1 }} />
          <StatBadge
            icon={<SmallRoadIcon />}
            count={roadLength}
            golden={holdsLR}
            title={holdsLR ? `Longest Road (${roadLength})` : `Road length: ${roadLength}`}
          />
          <StatBadge
            icon={<SmallShieldIcon />}
            count={armySize}
            golden={holdsLA}
            title={holdsLA ? `Largest Army (${armySize} knights)` : `Knights: ${armySize}`}
          />
          {!player.isConnected && <span style={{ color: '#c0392b', fontSize: 9 }}>⚡</span>}
        </div>
      </div>
    </div>
  );
}
