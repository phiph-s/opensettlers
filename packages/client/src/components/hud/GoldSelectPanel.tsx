import React, { useState } from 'react';
import type { Resource } from '@opensettlers/shared';
import { RESOURCE_IMAGES } from '../../assets/resources.js';
import { socket } from '../../socket.js';

const ALL_RESOURCES: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];

interface Props {
  needed: number;
}

export function GoldSelectPanel({ needed }: Props) {
  const [picks, setPicks] = useState<Resource[]>([]);

  const toggle = (r: Resource) => {
    const countOfR = picks.filter((x) => x === r).length;
    if (countOfR >= 2) {
      setPicks(picks.filter((x) => x !== r));
    } else if (picks.length < needed) {
      setPicks([...picks, r]);
    } else {
      setPicks([...picks.filter((x) => x !== r), r]);
    }
  };

  const confirm = () => {
    if (picks.length !== needed) return;
    socket.emit('game:select_gold', { resources: picks });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 900,
      backdropFilter: 'blur(3px)',
    }}>
      <div style={{
        background: 'linear-gradient(160deg, #1a140a 0%, #261a08 100%)',
        border: '2px solid #b8860b',
        borderRadius: 16,
        padding: '28px 32px',
        minWidth: 340,
        boxShadow: '0 0 40px rgba(184,134,11,0.35), 0 8px 32px rgba(0,0,0,0.7)',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 22,
          fontFamily: "'Cinzel', Georgia, serif",
          color: '#e8c030',
          fontWeight: 700,
          marginBottom: 6,
          textShadow: '0 0 12px rgba(232,192,48,0.5)',
        }}>
          ✦ Gold Harvest ✦
        </div>
        <div style={{
          fontSize: 12,
          color: '#c8a040',
          marginBottom: 20,
          fontStyle: 'italic',
        }}>
          Choose {needed} free resource{needed !== 1 ? 's' : ''}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 22 }}>
          {ALL_RESOURCES.map((r) => {
            const count = picks.filter((x) => x === r).length;
            const selected = count > 0;
            return (
              <button
                key={r}
                onClick={() => toggle(r)}
                style={{
                  position: 'relative',
                  width: 52, height: 60,
                  borderRadius: 8,
                  border: `2px solid ${selected ? '#e8c030' : '#4a3810'}`,
                  background: selected ? 'rgba(232,192,48,0.18)' : 'rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  transition: 'border-color 0.12s, background 0.12s',
                  boxShadow: selected ? '0 0 10px rgba(232,192,48,0.35)' : 'none',
                }}
              >
                <img src={RESOURCE_IMAGES[r]} style={{ width: 28, height: 28, borderRadius: 4 }} />
                {count > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: -6, right: -6,
                    width: 18, height: 18,
                    borderRadius: '50%',
                    background: '#e8c030',
                    color: '#1a140a',
                    fontSize: 11,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {count}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <button
          disabled={picks.length !== needed}
          onClick={confirm}
          style={{
            background: picks.length === needed
              ? 'linear-gradient(135deg, #c8980a, #e8c030)'
              : 'rgba(100,80,20,0.3)',
            border: 'none',
            borderRadius: 8,
            padding: '10px 32px',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "'Cinzel', Georgia, serif",
            color: picks.length === needed ? '#1a140a' : '#6a5020',
            cursor: picks.length === needed ? 'pointer' : 'default',
            transition: 'background 0.15s',
            letterSpacing: 1,
          }}
        >
          Claim Resources
        </button>
      </div>
    </div>
  );
}
