import React, { useState } from 'react';
import type { Player, Resource } from '@opensettlers/shared';
import { socket } from '../../socket.js';
import { RESOURCE_IMAGES, RESOURCE_COLORS } from '../../assets/resources.js';

const RESOURCES: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];

interface Props {
  me: Player;
  count: number;
}

export function DiscardPanel({ me, count }: Props) {
  const [selected, setSelected] = useState<Partial<Record<Resource, number>>>({});

  const total = Object.values(selected).reduce((s, n) => s + (n ?? 0), 0);

  const adjust = (res: Resource, delta: number) => {
    setSelected((prev) => {
      const cur = prev[res] ?? 0;
      const next = Math.max(0, Math.min(me.hand[res] ?? 0, cur + delta));
      return { ...prev, [res]: next };
    });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
    }}>
      <div style={{
        background: '#16213e',
        border: '2px solid #e74c3c',
        borderRadius: 12,
        padding: 32,
        minWidth: 320,
      }}>
        <h3 style={{ marginBottom: 8 }}>Discard {count} cards (7 rolled)</h3>
        <p style={{ color: '#aaa', fontSize: 12, marginBottom: 16 }}>
          Selected: {total} / {count}
        </p>
        {RESOURCES.map((res) => (
          <div key={res} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 36,
              height: 46,
              borderRadius: 6,
              background: RESOURCE_COLORS[res],
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              flexShrink: 0,
            }}>
              <img src={RESOURCE_IMAGES[res]} style={{ width: 22, height: 22, objectFit: 'contain' }} alt={res} />
              <span style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{me.hand[res] ?? 0}</span>
            </div>
            <button onClick={() => adjust(res, -1)} style={adjBtn}>−</button>
            <span style={{ width: 24, textAlign: 'center', fontWeight: 'bold' }}>{selected[res] ?? 0}</span>
            <button onClick={() => adjust(res, 1)} style={adjBtn}>+</button>
          </div>
        ))}
        <button
          disabled={total !== count}
          style={{
            marginTop: 16,
            background: total === count ? '#2ecc71' : '#555',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 24px',
            cursor: total === count ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
          }}
          onClick={() => socket.emit('game:discard', { resources: selected })}
        >
          Discard
        </button>
      </div>
    </div>
  );
}

const adjBtn: React.CSSProperties = {
  background: '#0f3460',
  color: '#eee',
  border: '1px solid #457b9d',
  borderRadius: 4,
  width: 24,
  cursor: 'pointer',
};
