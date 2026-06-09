import React from 'react';
import type { GameOverSummary, Player } from '@opensettlers/shared';

interface Props {
  summary: GameOverSummary;
  players: Player[];
  myPlayerId: string | null;
}

export function VictoryBanner({ summary, players, myPlayerId }: Props) {
  const winner = players.find((p) => p.id === summary.winnerId);
  const isMe = summary.winnerId === myPlayerId;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }}>
      <div style={{
        background: '#16213e',
        border: '3px solid #f1c40f',
        borderRadius: 16,
        padding: 40,
        textAlign: 'center',
        maxWidth: 400,
      }}>
        <div style={{ fontSize: 60 }}>{isMe ? '🏆' : '🎲'}</div>
        <h2 style={{ fontSize: 28, margin: '12px 0' }}>
          {isMe ? 'You won!' : `${winner?.name ?? 'Someone'} won!`}
        </h2>
        <table style={{ margin: '0 auto', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              <th style={th}>Player</th>
              <th style={th}>🏠</th>
              <th style={th}>🏙️</th>
              <th style={th}>🃏 VP</th>
              <th style={th}>🛤️</th>
              <th style={th}>⚔️</th>
              <th style={th}>Total</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const b = summary.breakdown[p.id];
              return (
                <tr key={p.id}>
                  <td style={td}>{p.name}</td>
                  <td style={td}>{b?.settlements ?? 0}</td>
                  <td style={td}>{b ? b.cities * 2 : 0}</td>
                  <td style={td}>{b?.vpCards ?? 0}</td>
                  <td style={td}>{b?.longestRoad ?? 0}</td>
                  <td style={td}>{b?.largestArmy ?? 0}</td>
                  <td style={{ ...td, fontWeight: 'bold', color: p.id === summary.winnerId ? '#f1c40f' : '#eee' }}>
                    {b?.total ?? 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: '4px 10px', borderBottom: '1px solid #333', color: '#aaa' };
const td: React.CSSProperties = { padding: '4px 10px', textAlign: 'center' };
