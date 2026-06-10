import React from 'react';
import type { Player } from '@opensettlers/shared';
import { socket } from '../../socket.js';

const COLOR_MAP: Record<string, string> = {
  red: '#e63946', blue: '#457b9d', orange: '#f4a261', black: '#2c2c2c',
  green: '#2ecc71', purple: '#9b59b6', yellow: '#e8c730', pink: '#e91e8c',
};

interface Props {
  candidates: string[];
  players: Player[];
}

export function StealDialog({ candidates, players }: Props) {
  const targets = players.filter((p) => candidates.includes(p.id));

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.45)',
    }}>
      <div style={{
        background: '#fffdf7',
        border: '2px solid #c9bfae',
        borderRadius: 14,
        padding: '24px 28px',
        minWidth: 260,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#2c2516', marginBottom: 6 }}>
          Choose whom to steal from
        </div>
        <div style={{ fontSize: 12, color: '#7a6d5e', marginBottom: 18 }}>
          A random card will be taken from their hand
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {targets.map((p) => {
            const handSize = Object.values(p.hand).reduce((s, n) => s + n, 0);
            const color = COLOR_MAP[p.color] ?? '#aaa';
            return (
              <button
                key={p.id}
                onClick={() => socket.emit('game:steal', { targetPlayerId: p.id })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px',
                  background: '#fff',
                  border: `2px solid ${color}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#2c2516',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = color + '22'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
              >
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ flex: 1, textAlign: 'left' }}>{p.name}</span>
                <span style={{ fontSize: 12, color: '#7a6d5e' }}>{handSize} card{handSize !== 1 ? 's' : ''}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
