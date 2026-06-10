import React from 'react';
import { socket } from '../socket.js';
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
  const readyCount = useGameStore((s) => s.readyCount);
  const readyNeeded = useGameStore((s) => s.readyNeeded);
  const myPlayerId = usePlayerStore((s) => s.myPlayerId);

  if (!gameSummary) return null;

  const players: Player[] = gameState?.players ?? [];
  const winner = players.find((p) => p.id === gameSummary.winnerId);

  const sorted = [...players].sort((a, b) => {
    const bTotal = gameSummary.breakdown[b.id]?.total ?? 0;
    const aTotal = gameSummary.breakdown[a.id]?.total ?? 0;
    return bTotal - aTotal;
  });

  function handlePlayAgain() {
    socket.emit('game:ready_for_next');
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(20, 40, 60, 0.92)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        background: '#fffdf7',
        borderRadius: 16,
        padding: '32px 40px',
        maxWidth: 560,
        width: '90%',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        border: '2px solid #c9bfae',
      }}>
        {/* Winner announcement */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40 }}>🏆</div>
          <div style={{ fontSize: 22, fontWeight: 'bold', color: '#2c2516', marginTop: 4 }}>
            {winner ? (
              <>
                <span style={{ color: COLOR_MAP[winner.color] ?? '#555' }}>{winner.name}</span>
                {' wins!'}
              </>
            ) : 'Game Over'}
          </div>
          <div style={{ fontSize: 13, color: '#7a6d5e', marginTop: 4 }}>
            {gameSummary.breakdown[gameSummary.winnerId]?.total ?? 0} victory points
          </div>
        </div>

        {/* Scoreboard */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #c9bfae', color: '#7a6d5e' }}>
              <th style={{ textAlign: 'left', padding: '6px 4px', fontWeight: 600 }}>Place</th>
              <th style={{ textAlign: 'left', padding: '6px 4px', fontWeight: 600 }}>Player</th>
              <th style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 600 }} title="Settlements">🏠</th>
              <th style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 600 }} title="Cities">🏙️</th>
              <th style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 600 }} title="VP Cards">🎴</th>
              <th style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 600 }} title="Longest Road">🛤️</th>
              <th style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 600 }} title="Largest Army">⚔️</th>
              <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 600 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((player, idx) => {
              const bd = gameSummary.breakdown[player.id];
              const isWinner = player.id === gameSummary.winnerId;
              const color = COLOR_MAP[player.color] ?? '#555';
              return (
                <tr
                  key={player.id}
                  style={{
                    borderBottom: '1px solid #e8e1d5',
                    background: isWinner ? '#fff8ee' : 'transparent',
                    fontWeight: isWinner ? 600 : 400,
                  }}
                >
                  <td style={{ padding: '8px 4px', color: '#7a6d5e' }}>{ordinal(idx + 1)}</td>
                  <td style={{ padding: '8px 4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: color, display: 'inline-block', flexShrink: 0,
                      }} />
                      <span style={{ color: '#2c2516' }}>{player.name}</span>
                      {player.id === myPlayerId && (
                        <span style={{ fontSize: 10, color: '#7a6d5e' }}>(you)</span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', padding: '8px 4px', color: '#2c2516' }}>{bd?.settlements ?? 0}</td>
                  <td style={{ textAlign: 'center', padding: '8px 4px', color: '#2c2516' }}>{bd?.cities ?? 0}</td>
                  <td style={{ textAlign: 'center', padding: '8px 4px', color: '#2c2516' }}>{bd?.vpCards ?? 0}</td>
                  <td style={{ textAlign: 'center', padding: '8px 4px', color: '#2c2516' }}>{bd?.longestRoad ?? 0}</td>
                  <td style={{ textAlign: 'center', padding: '8px 4px', color: '#2c2516' }}>{bd?.largestArmy ?? 0}</td>
                  <td style={{ textAlign: 'right', padding: '8px 4px', color: color, fontWeight: 700 }}>{bd?.total ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Ready button */}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handlePlayAgain}
            style={{
              background: '#6b4c11',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 32px',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: 0.5,
            }}
          >
            Play Again
          </button>
          {readyCount > 0 && (
            <div style={{ fontSize: 12, color: '#7a6d5e' }}>
              {readyCount} / {readyNeeded} ready to return to lobby
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
