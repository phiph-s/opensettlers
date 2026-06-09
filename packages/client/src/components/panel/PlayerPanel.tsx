import React from 'react';
import type { Player, GameBoard } from '@opensettlers/shared';
import { longestRoadForPlayer } from '@opensettlers/shared';

const COLOR_MAP: Record<string, string> = {
  red: '#e63946', blue: '#457b9d', orange: '#f4a261', black: '#2c2c2c',
  green: '#2ecc71', purple: '#9b59b6',
};

interface Props {
  player: Player;
  isActive: boolean;
  isMe: boolean;
  board: GameBoard;
  longestRoadOwner: string | null;
  largestArmyOwner: string | null;
}

function computeVisibleVP(player: Player, board: GameBoard, longestRoadOwner: string | null, largestArmyOwner: string | null): number {
  let vp = 0;
  for (const vertex of Object.values(board.vertices)) {
    if (vertex.building?.owner === player.id) {
      vp += vertex.building.type === 'city' ? 2 : 1;
    }
  }
  if (longestRoadOwner === player.id) vp += 2;
  if (largestArmyOwner === player.id) vp += 2;
  return vp;
}

export function PlayerPanel({ player, isActive, isMe, board, longestRoadOwner, largestArmyOwner }: Props) {
  const color = COLOR_MAP[player.color] ?? '#aaa';
  const visibleVP = computeVisibleVP(player, board, longestRoadOwner, largestArmyOwner);
  const totalVP = player.victoryPoints;
  const hasHiddenVP = isMe && totalVP > visibleVP;

  const devCount = player.devCardCount ?? player.devCards.length;
  const resourceCount = Object.values(player.hand).reduce((s, n) => s + (n ?? 0), 0);
  const roadLength = longestRoadForPlayer(board, player.id);
  const armySize = player.knightsPlayed;

  const holdsLR = player.hasLongestRoad;
  const holdsLA = player.hasLargestArmy;

  return (
    <div
      data-player-id={player.id}
      style={{
        background: isActive ? '#fff8ee' : '#ffffff',
        border: `2px solid ${isActive ? color : '#d8cfc4'}`,
        borderRadius: 10,
        padding: '8px 10px',
        boxShadow: isActive ? `0 2px 8px ${color}44` : '0 1px 3px rgba(0,0,0,0.08)',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      {/* Header: color dot · name · active arrow · VP */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%',
          background: color,
          boxShadow: isActive ? `0 0 6px ${color}` : undefined,
          flexShrink: 0,
        }} />
        <span style={{
          flex: 1, fontWeight: 600, fontSize: 13,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: '#2c2516',
        }}>{player.name}{isMe && ' (you)'}</span>
        {isActive && <span style={{ color: '#b5550a', fontSize: 11, fontWeight: 'bold' }}>▶</span>}
        <span style={{ color: '#8b6914', fontSize: 13, fontWeight: 'bold', flexShrink: 0 }}>
          ⭐{hasHiddenVP ? `${visibleVP} (${totalVP})` : visibleVP}
        </span>
      </div>

      {/* Piece counts */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7a6d5e', marginBottom: 4 }}>
        <span title="Settlements left">🏠{player.settlementsLeft}</span>
        <span title="Cities left">🏙️{player.citiesLeft}</span>
        <span title="Roads left">🛣️{player.roadsLeft}</span>
      </div>

      {/* Road length + army size */}
      <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#7a6d5e', marginBottom: 4 }}>
        <span
          title={holdsLR ? `Longest Road (${roadLength})` : `Road length: ${roadLength}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 3,
            color: holdsLR ? '#b5550a' : '#7a6d5e',
            fontWeight: holdsLR ? 700 : 400,
          }}
        >
          🛤️ {roadLength}
          {holdsLR && <span style={{ fontSize: 9 }}>👑</span>}
        </span>
        <span
          title={holdsLA ? `Largest Army (${armySize} knights)` : `Knights played: ${armySize}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 3,
            color: holdsLA ? '#c0392b' : '#7a6d5e',
            fontWeight: holdsLA ? 700 : 400,
          }}
        >
          ⚔️ {armySize}
          {holdsLA && <span style={{ fontSize: 9 }}>👑</span>}
        </span>
      </div>

      {/* Cards row */}
      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#7a6d5e' }}>
        {isMe ? (
          <span>🃏 {devCount} dev</span>
        ) : (
          <>
            <span>📦 {resourceCount} cards</span>
            <span>🃏 {devCount} dev</span>
          </>
        )}
        {!player.isConnected && (
          <span style={{ color: '#c0392b', marginLeft: 'auto' }}>⚡ offline</span>
        )}
      </div>
    </div>
  );
}
