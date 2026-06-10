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
  const remaining = count - total;
  const ready = total === count;

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
      background: 'rgba(0,0,0,0.45)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
    }}>
      <div style={{
        background: 'var(--ui-card-bg)',
        border: '2px solid var(--ui-card-border)',
        borderRadius: 14,
        padding: '24px 28px',
        minWidth: 300,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ui-text)', marginBottom: 4 }}>
          Discard {count} cards
        </div>
        <div style={{ fontSize: 12, color: 'var(--ui-text-muted)', marginBottom: 18 }}>
          A 7 was rolled — select {count} card{count !== 1 ? 's' : ''} to discard.{' '}
          <span style={{ color: remaining > 0 ? '#b5550a' : '#27ae60', fontWeight: 600 }}>
            {remaining > 0 ? `${remaining} left` : 'Ready ✓'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {RESOURCES.map((res) => {
            const inHand = me.hand[res] ?? 0;
            const sel = selected[res] ?? 0;
            if (inHand === 0) return null;
            return (
              <div key={res} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Resource card */}
                <div style={{
                  width: 40,
                  height: 52,
                  borderRadius: 6,
                  background: RESOURCE_COLORS[res],
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  flexShrink: 0,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }}>
                  <img src={RESOURCE_IMAGES[res]} style={{ width: 24, height: 24, objectFit: 'contain' }} alt={res} />
                  <span style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{inHand}</span>
                </div>

                {/* Stepper */}
                <button onClick={() => adjust(res, -1)} disabled={sel === 0} style={stepBtn(sel > 0)}>−</button>
                <span style={{
                  width: 28, textAlign: 'center',
                  fontWeight: 700, fontSize: 15,
                  color: sel > 0 ? '#6b4c11' : '#c0b49a',
                }}>{sel}</span>
                <button
                  onClick={() => adjust(res, 1)}
                  disabled={sel >= inHand || total >= count}
                  style={stepBtn(sel < inHand && total < count)}
                >+</button>

                {/* Visual bar */}
                {sel > 0 && (
                  <div style={{ display: 'flex', gap: 3, marginLeft: 2 }}>
                    {Array.from({ length: sel }).map((_, i) => (
                      <div key={i} style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: RESOURCE_COLORS[res],
                        opacity: 0.85,
                      }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          disabled={!ready}
          style={{
            marginTop: 20,
            width: '100%',
            padding: '10px 0',
            background: ready ? '#6b4c11' : '#d8cfc4',
            color: ready ? '#fff' : '#a89880',
            border: 'none',
            borderRadius: 8,
            cursor: ready ? 'pointer' : 'not-allowed',
            fontWeight: 700,
            fontSize: 14,
            transition: 'background 0.2s',
          }}
          onClick={() => socket.emit('game:discard', { resources: selected })}
        >
          Discard {count} card{count !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}

function stepBtn(enabled: boolean): React.CSSProperties {
  return {
    width: 28, height: 28,
    background: enabled ? 'var(--ui-input-bg)' : 'var(--ui-btn-muted)',
    color: enabled ? 'var(--ui-input-text)' : 'var(--ui-text-faint)',
    border: `1px solid ${enabled ? 'var(--ui-card-border)' : 'var(--ui-border)'}`,
    borderRadius: 6,
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontWeight: 700,
    fontSize: 15,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0,
  };
}
