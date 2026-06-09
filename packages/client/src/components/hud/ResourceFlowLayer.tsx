import React, { useState, useEffect, useRef } from 'react';
import type { GameState } from '@opensettlers/shared';
import { socket } from '../../socket.js';
import { RESOURCE_IMAGES } from '../../assets/resources.js';

type Resource = 'wood' | 'brick' | 'wheat' | 'sheep' | 'ore';

interface FlyingIcon {
  id: number;
  kind: 'resource' | 'devcard';
  imgSrc?: string;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  departed: boolean;
  delay: number;
}

let nextId = 0;

function boardCenter(): { x: number; y: number } {
  // The board occupies roughly the left 75% of the viewport
  return {
    x: window.innerWidth * 0.36 + (Math.random() - 0.5) * 90,
    y: window.innerHeight * 0.44 + (Math.random() - 0.5) * 70,
  };
}

function panelCenter(playerId: string): { x: number; y: number } | null {
  const el = document.querySelector(`[data-player-id="${playerId}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

interface Props {
  gameState: GameState | null;
}

export function ResourceFlowLayer({ gameState }: Props) {
  const [icons, setIcons] = useState<FlyingIcon[]>([]);
  const prevDevCounts = useRef<Record<string, number>>({});
  const initialized = useRef(false);

  // Resource gains via socket event
  useEffect(() => {
    const handler = (data: { distributions: Record<string, Partial<Record<Resource, number>>> }) => {
      const pending: Omit<FlyingIcon, 'id'>[] = [];
      let slot = 0;

      for (const [playerId, dist] of Object.entries(data.distributions)) {
        const target = panelCenter(playerId);
        if (!target) continue;

        for (const [res, count] of Object.entries(dist) as [Resource, number][]) {
          const imgSrc = RESOURCE_IMAGES[res];
          if (!imgSrc) continue;
          const n = Math.min(count, 3);
          for (let i = 0; i < n; i++) {
            const start = boardCenter();
            pending.push({
              kind: 'resource',
              imgSrc,
              startX: start.x,
              startY: start.y,
              dx: target.x - start.x,
              dy: target.y - start.y,
              departed: false,
              delay: slot * 75,
            });
            slot++;
          }
        }
      }

      spawn(pending);
    };

    socket.on('game:resources_distributed', handler);
    return () => { socket.off('game:resources_distributed', handler); };
  }, []);

  // Dev card purchase: detect from state change
  useEffect(() => {
    if (!gameState) return;

    if (!initialized.current) {
      for (const p of gameState.players) {
        prevDevCounts.current[p.id] = p.devCardCount ?? p.devCards.length;
      }
      initialized.current = true;
      return;
    }

    const pending: Omit<FlyingIcon, 'id'>[] = [];
    let slot = 0;

    for (const p of gameState.players) {
      const curr = p.devCardCount ?? p.devCards.length;
      const prev = prevDevCounts.current[p.id] ?? 0;
      const gained = curr - prev;
      prevDevCounts.current[p.id] = curr;

      if (gained <= 0) continue;

      const target = panelCenter(p.id);
      if (!target) continue;

      for (let i = 0; i < Math.min(gained, 2); i++) {
        const start = boardCenter();
        pending.push({
          kind: 'devcard',
          startX: start.x,
          startY: start.y,
          dx: target.x - start.x,
          dy: target.y - start.y,
          departed: false,
          delay: slot * 75,
        });
        slot++;
      }
    }

    if (pending.length > 0) spawn(pending);
  });

  function spawn(pending: Omit<FlyingIcon, 'id'>[]) {
    const newIcons = pending.map((p) => ({ ...p, id: nextId++ }));
    setIcons((prev) => [...prev, ...newIcons]);

    newIcons.forEach((icon) => {
      // Brief delay so the element renders at start position first
      setTimeout(() => {
        setIcons((prev) =>
          prev.map((ic) => (ic.id === icon.id ? { ...ic, departed: true } : ic))
        );
        setTimeout(() => {
          setIcons((prev) => prev.filter((ic) => ic.id !== icon.id));
        }, 750);
      }, icon.delay + 30);
    });
  }

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 500 }}>
      {icons.map((icon) => (
        <div
          key={icon.id}
          style={{
            position: 'fixed',
            left: icon.startX - 16,
            top: icon.startY - 16,
            width: 32,
            height: 32,
            transform: icon.departed
              ? `translate(${icon.dx}px, ${icon.dy}px) scale(0.4)`
              : 'translate(0,0) scale(1)',
            opacity: icon.departed ? 0 : 1,
            transition: icon.departed
              ? 'transform 0.65s ease-in, opacity 0.25s ease-in 0.4s'
              : 'none',
            pointerEvents: 'none',
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))',
          }}
        >
          {icon.kind === 'resource' && icon.imgSrc ? (
            <img src={icon.imgSrc} style={{ width: 32, height: 32, borderRadius: 5, display: 'block' }} />
          ) : (
            <div style={{
              width: 26,
              height: 34,
              marginTop: -1,
              background: 'linear-gradient(135deg, #4a2d7a, #7c4fa0)',
              borderRadius: 4,
              border: '1.5px solid #b08ad4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              color: '#e8d5ff',
            }}>
              ✦
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
