import React from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { usePlayerStore } from '../store/usePlayerStore.js';
import type { Player } from '@opensettlers/shared';

const COLOR_MAP: Record<string, string> = {
  red: '#e63946',
  blue: '#457b9d',
  orange: '#f4a261',
  black: '#2c2c2c',
  green: '#2ecc71',
  purple: '#9b59b6',
  yellow: '#e8c730',
  pink: '#e91e8c',
};

function ordinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

export function VictoryScreen() {
  const gameSummary = useGameStore((s) => s.gameSummary);
  const gameState = useGameStore((s) => s.gameState);
  const clearGame = useGameStore((s) => s.clearGame);
  const myPlayerId = usePlayerStore((s) => s.myPlayerId);

  if (!gameSummary) return null;

  const players: Player[] = gameState?.players ?? [];
  const winner = players.find((p) => p.id === gameSummary.winnerId);

  const sorted = [...players].sort((a, b) => {
    const bTotal = gameSummary.breakdown[b.id]?.total ?? 0;
    const aTotal = gameSummary.breakdown[a.id]?.total ?? 0;
    return bTotal - aTotal;
  });

  const showDiscovery = players.some((p) => (gameSummary.breakdown[p.id]?.discoveryVP ?? 0) > 0);

  const th: React.CSSProperties = { textAlign: 'center', padding: '6px 4px', fontWeight: 600, color: 'var(--ui-text-muted)', fontSize: 13 };
  const td: React.CSSProperties = { textAlign: 'center', padding: '8px 4px', color: 'var(--ui-text)', fontSize: 13 };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      background: 'rgba(0,0,0,0.55)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      fontFamily: "'Cinzel', Georgia, serif",
    }}>
      {/* Winner announcement */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 52, lineHeight: 1 }}>🏆</div>
        <div style={{ fontSize: 26, fontWeight: 'bold', color: 'var(--ui-text)', marginTop: 8 }}>
          {winner ? (
            <>
              <span style={{ color: COLOR_MAP[winner.color] ?? 'var(--ui-text)' }}>{winner.name}</span>
              {' wins!'}
            </>
          ) : 'Game Over'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ui-text-muted)', marginTop: 6, letterSpacing: 1 }}>
          {gameSummary.breakdown[gameSummary.winnerId]?.total ?? 0} victory points
        </div>
      </div>

      {/* Scoreboard */}
      <table style={{ borderCollapse: 'collapse', fontSize: 13, minWidth: 360 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--ui-border)' }}>
            <th style={{ ...th, textAlign: 'left' }}>Place</th>
            <th style={{ ...th, textAlign: 'left' }}>Player</th>
            <th style={th} title="Settlements (1 VP each)">🏠</th>
            <th style={th} title="Cities (2 VP each)">🏙️</th>
            <th style={th} title="VP Cards">🎴</th>
            <th style={th} title="Longest Road">🛤️</th>
            <th style={th} title="Largest Army">⚔️</th>
            {showDiscovery && <th style={th} title="Discovery Bonus">🏝️</th>}
            <th style={{ ...th, textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((player, idx) => {
            const bd = gameSummary.breakdown[player.id];
            const isWinner = player.id === gameSummary.winnerId;
            const color = COLOR_MAP[player.color] ?? 'var(--ui-text)';
            return (
              <tr
                key={player.id}
                style={{
                  borderBottom: '1px solid var(--ui-border)',
                  opacity: isWinner ? 1 : 0.85,
                  fontWeight: isWinner ? 700 : 400,
                }}
              >
                <td style={{ ...td, textAlign: 'left', color: 'var(--ui-text-muted)' }}>{ordinal(idx + 1)}</td>
                <td style={{ ...td, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ color: 'var(--ui-text)' }}>{player.name}</span>
                    {player.id === myPlayerId && <span style={{ fontSize: 10, color: 'var(--ui-text-muted)' }}>(you)</span>}
                  </div>
                </td>
                <td style={td}>{bd?.settlements ?? 0}</td>
                <td style={td}>{(bd?.cities ?? 0) * 2}</td>
                <td style={td}>{bd?.vpCards ?? 0}</td>
                <td style={td}>{bd?.longestRoad ?? 0}</td>
                <td style={td}>{bd?.largestArmy ?? 0}</td>
                {showDiscovery && <td style={td}>{bd?.discoveryVP ?? 0}</td>}
                <td style={{ ...td, textAlign: 'right', color, fontWeight: 700, fontSize: 15 }}>{bd?.total ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Back to lobby */}
      <div style={{ marginTop: 32 }}>
        <button
          onClick={clearGame}
          style={{
            background: 'var(--ui-accent, #6b4c11)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '12px 36px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: 2,
            fontFamily: "'Cinzel', Georgia, serif",
            textTransform: 'uppercase',
          }}
        >
          Back to Lobby
        </button>
      </div>
    </div>
  );
}
