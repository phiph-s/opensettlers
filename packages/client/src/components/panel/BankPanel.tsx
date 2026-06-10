import React from 'react';
import type { Resource } from '@opensettlers/shared';
import { RESOURCE_IMAGES, RESOURCE_COLORS } from '../../assets/resources.js';

const RESOURCES: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];
const BANK_TOTAL = 19;
const DEV_CARD_TOTAL = 25;

interface Props {
  bank: Record<Resource, number>;
  devCardDeckSize: number;
}

export function BankPanel({ bank, devCardDeckSize }: Props) {
  return (
    <div style={{
      background: 'var(--ui-panel)',
      borderRadius: 8,
      border: '1px solid var(--ui-border)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 'bold', color: 'var(--ui-text-muted)',
        padding: '6px 10px 4px',
        borderBottom: '1px solid var(--ui-border-light)',
      }}>
        Bank
      </div>
      <div style={{ display: 'flex', gap: 4, padding: '6px 8px' }}>
        {/* Dev card stack */}
        {(() => {
          const depleted = devCardDeckSize === 0;
          const pct = devCardDeckSize / DEV_CARD_TOTAL;
          return (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              opacity: depleted ? 0.35 : 1,
            }}>
              <div style={{
                width: '100%',
                height: 28,
                borderRadius: 4,
                background: '#6b4c11',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute',
                  bottom: 0, left: 0,
                  width: '100%',
                  height: `${(1 - pct) * 100}%`,
                  background: 'rgba(0,0,0,0.35)',
                  transition: 'height 0.4s ease',
                }} />
                <span style={{ fontSize: 12, position: 'relative', zIndex: 1 }}>🃏</span>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: depleted ? 'var(--ui-text-faint)' : devCardDeckSize <= 4 ? '#e67e22' : 'var(--ui-text)',
              }}>
                {devCardDeckSize}
              </span>
            </div>
          );
        })()}

        {/* Divider */}
        <div style={{ width: 1, background: 'var(--ui-border-light)', alignSelf: 'stretch', flexShrink: 0 }} />

        {RESOURCES.map((res) => {
          const count = bank[res] ?? 0;
          const pct = count / BANK_TOTAL;
          const depleted = count === 0;
          return (
            <div key={res} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              opacity: depleted ? 0.35 : 1,
            }}>
              <div style={{
                width: '100%',
                height: 28,
                borderRadius: 4,
                background: RESOURCE_COLORS[res],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Depletion overlay */}
                <div style={{
                  position: 'absolute',
                  bottom: 0, left: 0,
                  width: '100%',
                  height: `${(1 - pct) * 100}%`,
                  background: 'rgba(0,0,0,0.35)',
                  transition: 'height 0.4s ease',
                }} />
                <img
                  src={RESOURCE_IMAGES[res]}
                  style={{ width: 16, height: 16, objectFit: 'contain', position: 'relative', zIndex: 1 }}
                  alt={res}
                />
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: depleted ? 'var(--ui-text-faint)' : count <= 4 ? '#e67e22' : 'var(--ui-text)',
              }}>
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
