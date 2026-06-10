import React, { useEffect, useState } from 'react';
import type { Player, GameBoard } from '@opensettlers/shared';
import { PORT_RESOURCE } from '@opensettlers/shared';
import { socket } from '../../socket.js';
import { RESOURCE_IMAGES, RESOURCE_COLORS } from '../../assets/resources.js';
import './animations.css';

type Resource = 'wood' | 'brick' | 'wheat' | 'sheep' | 'ore';
const RESOURCES: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];

interface Props {
  player: Player;
  portRates: Partial<Record<Resource, number>>;
  playerId: string; // to filter distribution events for this player only
}

export function ResourceHand({ player, portRates, playerId }: Props) {
  const [recentGains, setRecentGains] = useState<Partial<Record<Resource, number>>>({});

  useEffect(() => {
    const onDistributed = (payload: { distributions: Record<string, Partial<Record<string, number>>> }) => {
      const myGains = payload.distributions[playerId];
      if (!myGains) return;
      const gains: Partial<Record<Resource, number>> = {};
      for (const res of RESOURCES) {
        const n = (myGains as Record<string, number>)[res] ?? 0;
        if (n > 0) gains[res] = n;
      }
      if (Object.keys(gains).length === 0) return;
      setRecentGains(gains);
      const t = setTimeout(() => setRecentGains({}), 1500);
      return () => clearTimeout(t);
    };
    socket.on('game:resources_distributed', onDistributed);
    return () => { socket.off('game:resources_distributed', onDistributed); };
  }, [playerId]);

  return (
    <div style={{
      display: 'flex',
      gap: 6,
      padding: '8px 12px',
      background: 'var(--ui-overlay-bg)',
      border: '1px solid var(--ui-border)',
      borderRadius: 10,
      flexShrink: 0,
    }}>
      {RESOURCES.map((res) => {
        const count = player.hand[res] ?? 0;
        const rate = portRates[res] ?? 4;
        const gained = recentGains[res] ?? 0;
        const isAnimating = gained > 0;
        return (
          <div key={res} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            opacity: count === 0 ? 0.4 : 1,
            position: 'relative',
          }}>
            {/* Floating +N badge */}
            {isAnimating && (
              <div style={{
                position: 'absolute',
                top: -20,
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#2ecc71',
                fontWeight: 'bold',
                fontSize: 14,
                animation: 'badge-float-up 1.4s ease-out forwards',
                pointerEvents: 'none',
                zIndex: 10,
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}>+{gained}</div>
            )}
            <div style={{
              width: 44,
              height: 60,
              borderRadius: 6,
              background: RESOURCE_COLORS[res],
              border: isAnimating ? '2px solid #2ecc71' : '2px solid rgba(255,255,255,0.25)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              position: 'relative',
              animation: isAnimating ? 'card-pop 0.6s ease-out' : undefined,
            }}>
              <img src={RESOURCE_IMAGES[res]} style={{ width: 28, height: 28, objectFit: 'contain' }} alt={res} />
              <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{count}</span>
              {rate < 4 && (
                <div style={{
                  position: 'absolute', top: -6, right: -6,
                  background: '#f4a261',
                  color: '#000',
                  fontSize: 9,
                  fontWeight: 'bold',
                  borderRadius: 8,
                  padding: '1px 4px',
                  border: '1px solid #000',
                }}>{rate}:1</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Keep computePortRates as-is (exported from this file)
export function computePortRates(player: Player, board: GameBoard): Partial<Record<Resource, number>> {
  const rates: Partial<Record<Resource, number>> = {};
  for (const vertex of Object.values(board.vertices)) {
    if (!vertex.building || vertex.building.owner !== player.id) continue;
    if (!vertex.port) continue;
    const portResource = PORT_RESOURCE[vertex.port];
    if (portResource) {
      rates[portResource as Resource] = Math.min(rates[portResource as Resource] ?? 4, 2);
    } else if (vertex.port === 'generic_3_1') {
      for (const res of RESOURCES) {
        rates[res] = Math.min(rates[res] ?? 4, 3);
      }
    }
  }
  return rates;
}
