import React from 'react';
import type { Player, GameBoard } from '@opensettlers/shared';
import { longestRoadForPlayer } from '@opensettlers/shared';
import { RESOURCE_IMAGES, RESOURCE_COLORS } from '../../assets/resources.js';

const COLOR_MAP: Record<string, string> = {
  red: '#e63946', blue: '#457b9d', orange: '#f4a261', black: '#2c2c2c',
  green: '#2ecc71', purple: '#9b59b6',
};

const RESOURCES = ['wood', 'brick', 'wheat', 'sheep', 'ore'] as const;

interface Props {
  player: Player;
  isActive: boolean;
  isMe: boolean;
  board: GameBoard;
  longestRoadOwner: string | null;
  largestArmyOwner: string | null;
}

function computeVisibleVP(
  player: Player, board: GameBoard,
  longestRoadOwner: string | null, largestArmyOwner: string | null
): number {
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

// Mini card: a small playing-card shape with a colored background and count
function ResourceCard({ resource, count }: { resource: string; count: number }) {
  const bg = RESOURCE_COLORS[resource] ?? '#888';
  const img = RESOURCE_IMAGES[resource];
  // Lighten the card slightly for readability
  return (
    <div
      title={`${resource}: ${count}`}
      style={{
        width: 22,
        height: 30,
        background: bg,
        borderRadius: 4,
        border: '1.5px solid rgba(0,0,0,0.25)',
        boxShadow: '1px 1px 3px rgba(0,0,0,0.22)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {img && (
        <img
          src={img}
          style={{ width: 13, height: 13, borderRadius: 2, display: 'block', opacity: 0.9 }}
        />
      )}
      <span style={{
        fontSize: 9,
        fontWeight: 800,
        color: '#fff',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        lineHeight: 1,
      }}>{count}</span>
    </div>
  );
}

function DevCard({ count }: { count: number }) {
  return (
    <div
      title={`${count} dev card(s)`}
      style={{
        width: 22,
        height: 30,
        background: 'linear-gradient(160deg, #2e4a7a, #1a2d55)',
        borderRadius: 4,
        border: '1.5px solid #4a6aaa',
        boxShadow: '1px 1px 3px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 10, color: '#aac4f4', lineHeight: 1 }}>?</span>
      <span style={{
        fontSize: 9,
        fontWeight: 800,
        color: '#fff',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        lineHeight: 1,
      }}>{count}</span>
    </div>
  );
}

function VPBadge({ vp, hidden, total }: { vp: number; hidden: boolean; total: number }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      background: '#f5e6a0',
      border: '1.5px solid #c8a820',
      borderRadius: 6,
      padding: '1px 5px',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 10, lineHeight: 1 }}>⭐</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#7a5800', lineHeight: 1 }}>
        {hidden ? `${vp}+` : vp}
      </span>
    </div>
  );
}

// Small road piece shape as SVG
function RoadIcon() {
  return (
    <svg width="16" height="10" viewBox="0 0 16 10" style={{ display: 'block' }}>
      <path d="M0 9 L4 1 L12 1 L16 9 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function PlayerPanel({ player, isActive, isMe, board, longestRoadOwner, largestArmyOwner }: Props) {
  const color = COLOR_MAP[player.color] ?? '#aaa';
  const visibleVP = computeVisibleVP(player, board, longestRoadOwner, largestArmyOwner);
  const totalVP = player.victoryPoints;
  const hasHiddenVP = isMe && totalVP > visibleVP;

  const devCount = player.devCardCount ?? player.devCards.length;
  const roadLength = longestRoadForPlayer(board, player.id);
  const armySize = player.knightsPlayed;
  const holdsLR = player.hasLongestRoad;
  const holdsLA = player.hasLargestArmy;

  // Non-zero resources for mini-card display
  const handEntries = RESOURCES.map((r) => ({ r, n: player.hand[r] ?? 0 })).filter(({ n }) => n > 0);

  return (
    <div
      data-player-id={player.id}
      style={{
        background: isActive ? '#fff8ee' : '#ffffff',
        border: `2px solid ${isActive ? color : '#d8cfc4'}`,
        borderRadius: 10,
        padding: '7px 9px',
        boxShadow: isActive ? `0 2px 10px ${color}44` : '0 1px 3px rgba(0,0,0,0.07)',
        transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}
    >
      {/* ── Avatar ────────────────────────────────────── */}
      <div style={{
        width: 38,
        height: 38,
        borderRadius: '50%',
        background: color,
        border: `3px solid ${isActive ? '#f0c040' : 'rgba(0,0,0,0.12)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: isActive ? `0 0 10px ${color}88` : '0 1px 4px rgba(0,0,0,0.18)',
        fontSize: 16,
        fontWeight: 800,
        color: 'rgba(255,255,255,0.92)',
        textShadow: '0 1px 3px rgba(0,0,0,0.35)',
        userSelect: 'none',
      }}>
        {player.name.charAt(0).toUpperCase()}
      </div>

      {/* ── Content ───────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Row 1: name + active arrow + VP */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
          <span style={{
            flex: 1,
            fontWeight: 700,
            fontSize: 12,
            color: '#2c2516',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {player.name}
            {isMe && <span style={{ fontWeight: 400, color: '#9a8a7a', fontSize: 10 }}> (you)</span>}
          </span>
          {isActive && (
            <span style={{ fontSize: 10, color: color, fontWeight: 900, flexShrink: 0 }}>▶</span>
          )}
          <VPBadge vp={visibleVP} hidden={hasHiddenVP} total={totalVP} />
        </div>

        {/* Row 2: mini resource cards + dev card */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, marginBottom: 5, flexWrap: 'wrap' }}>
          <DevCard count={devCount} />
          {handEntries.length > 0 ? (
            handEntries.map(({ r, n }) => <ResourceCard key={r} resource={r} count={n} />)
          ) : (
            <span style={{ fontSize: 10, color: '#b0a090', fontStyle: 'italic', alignSelf: 'center' }}>
              no cards
            </span>
          )}
        </div>

        {/* Row 3: road length / army / pieces */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#7a6d5e' }}>
          <span
            title={holdsLR ? `Longest Road (${roadLength})` : `Road: ${roadLength}`}
            style={{ color: holdsLR ? '#b5550a' : '#888', fontWeight: holdsLR ? 700 : 400, display: 'flex', alignItems: 'center', gap: 2 }}
          >
            🛤️{roadLength}{holdsLR && <span style={{ fontSize: 8 }}>👑</span>}
          </span>
          <span
            title={holdsLA ? `Largest Army (${armySize})` : `Knights: ${armySize}`}
            style={{ color: holdsLA ? '#c0392b' : '#888', fontWeight: holdsLA ? 700 : 400, display: 'flex', alignItems: 'center', gap: 2 }}
          >
            ⚔️{armySize}{holdsLA && <span style={{ fontSize: 8 }}>👑</span>}
          </span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 5, color: '#9a8a7a' }}>
            <span title="Settlements left">🏠{player.settlementsLeft}</span>
            <span title="Cities left">🏙️{player.citiesLeft}</span>
            <span title="Roads left">🛣️{player.roadsLeft}</span>
          </span>
          {!player.isConnected && (
            <span style={{ color: '#c0392b', fontSize: 9, marginLeft: 2 }}>⚡</span>
          )}
        </div>
      </div>
    </div>
  );
}
