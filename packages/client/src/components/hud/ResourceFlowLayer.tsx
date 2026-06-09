import React, { useState, useEffect, useRef } from 'react';
import type { GameState, Resource } from '@opensettlers/shared';
import { socket } from '../../socket.js';
import { RESOURCE_IMAGES } from '../../assets/resources.js';

interface FlyingIcon {
  id: number;
  kind: 'resource' | 'devcard';
  imgSrc?: string;
  startX: number;
  startY: number;
  midX: number;
  midY: number;
  endX: number;
  endY: number;
  phase: 0 | 1 | 2;
}

let nextId = 0;

function boardCenter(): { x: number; y: number } {
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

function arcMid(
  sx: number, sy: number,
  ex: number, ey: number,
  leftPx: number,
  upPx: number
): { mx: number; my: number } {
  const cx = (sx + ex) / 2;
  const cy = (sy + ey) / 2;
  const dx = ex - sx, dy = ey - sy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return { mx: cx, my: cy - upPx };
  const ux = dx / len, uy = dy / len;
  return {
    mx: cx - uy * leftPx,
    my: cy + ux * leftPx - upPx,
  };
}

interface Props {
  gameState: GameState | null;
}

export function ResourceFlowLayer({ gameState }: Props) {
  const [icons, setIcons] = useState<FlyingIcon[]>([]);
  const prevDevCounts = useRef<Record<string, number>>({});
  const initialized = useRef(false);

  function spawnBatch(
    items: Array<{
      kind: 'resource' | 'devcard';
      imgSrc?: string;
      sx: number; sy: number;
      ex: number; ey: number;
      leftArc: number; upArc: number;
    }>,
    baseDelay = 0
  ) {
    const newIcons: FlyingIcon[] = items.map((item, i) => {
      const { mx, my } = arcMid(item.sx, item.sy, item.ex, item.ey, item.leftArc, item.upArc);
      return {
        id: nextId++,
        kind: item.kind,
        imgSrc: item.imgSrc,
        startX: item.sx,
        startY: item.sy,
        midX: mx,
        midY: my,
        endX: item.ex,
        endY: item.ey,
        phase: 0,
      };
    });

    setIcons((prev) => [...prev, ...newIcons]);

    newIcons.forEach((icon, i) => {
      const delay = baseDelay + i * 75;

      // Phase 0 → 1 (arc to midpoint)
      setTimeout(() => {
        setIcons((prev) =>
          prev.map((ic) => (ic.id === icon.id ? { ...ic, phase: 1 } : ic))
        );
      }, delay + 30);

      // Phase 1 → 2 (fly to target + fade)
      setTimeout(() => {
        setIcons((prev) =>
          prev.map((ic) => (ic.id === icon.id ? { ...ic, phase: 2 } : ic))
        );
      }, delay + 30 + 280);

      // Remove after animation completes
      setTimeout(() => {
        setIcons((prev) => prev.filter((ic) => ic.id !== icon.id));
      }, delay + 30 + 280 + 420);
    });
  }

  // Resource gains on dice roll
  useEffect(() => {
    const handler = (data: { distributions: Record<string, Partial<Record<Resource, number>>> }) => {
      const items: Parameters<typeof spawnBatch>[0] = [];

      for (const [playerId, dist] of Object.entries(data.distributions)) {
        const target = panelCenter(playerId);
        if (!target) continue;

        for (const [res, count] of Object.entries(dist) as [Resource, number][]) {
          const imgSrc = RESOURCE_IMAGES[res];
          if (!imgSrc) continue;
          for (let i = 0; i < Math.min(count, 3); i++) {
            const start = boardCenter();
            items.push({
              kind: 'resource', imgSrc,
              sx: start.x, sy: start.y,
              ex: target.x, ey: target.y,
              leftArc: 0, upArc: 35,
            });
          }
        }
      }

      spawnBatch(items);
    };

    socket.on('game:resources_distributed', handler);
    return () => { socket.off('game:resources_distributed', handler); };
  }, []);

  // Player-to-player trade
  useEffect(() => {
    const handler = (data: {
      fromPlayerId: string;
      toPlayerId: string;
      offered: Partial<Record<Resource, number>>;
      received: Partial<Record<Resource, number>>;
    }) => {
      const fromPos = panelCenter(data.fromPlayerId);
      const toPos   = panelCenter(data.toPlayerId);
      if (!fromPos || !toPos) return;

      const items: Parameters<typeof spawnBatch>[0] = [];

      // Offered resources: fromPlayer → toPlayer
      for (const [res, count] of Object.entries(data.offered) as [Resource, number][]) {
        const imgSrc = RESOURCE_IMAGES[res];
        if (!imgSrc) continue;
        for (let i = 0; i < Math.min(count, 3); i++) {
          items.push({
            kind: 'resource', imgSrc,
            sx: fromPos.x, sy: fromPos.y,
            ex: toPos.x, ey: toPos.y,
            // Arc toward the board (leftward = outward from the right panel)
            leftArc: 70, upArc: 0,
          });
        }
      }

      // Received resources: toPlayer → fromPlayer
      for (const [res, count] of Object.entries(data.received) as [Resource, number][]) {
        const imgSrc = RESOURCE_IMAGES[res];
        if (!imgSrc) continue;
        for (let i = 0; i < Math.min(count, 3); i++) {
          items.push({
            kind: 'resource', imgSrc,
            sx: toPos.x, sy: toPos.y,
            ex: fromPos.x, ey: fromPos.y,
            leftArc: 70, upArc: 0,
          });
        }
      }

      spawnBatch(items);
    };

    socket.on('game:trade_executed', handler);
    return () => { socket.off('game:trade_executed', handler); };
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

    const items: Parameters<typeof spawnBatch>[0] = [];

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
        items.push({
          kind: 'devcard',
          sx: start.x, sy: start.y,
          ex: target.x, ey: target.y,
          leftArc: 0, upArc: 35,
        });
      }
    }

    if (items.length > 0) spawnBatch(items);
  });

  function transformForPhase(icon: FlyingIcon): string {
    const { startX, startY, midX, midY, endX, endY, phase } = icon;
    if (phase === 0) return 'translate(0, 0) scale(1)';
    if (phase === 1) return `translate(${midX - startX}px, ${midY - startY}px) scale(1.15)`;
    return `translate(${endX - startX}px, ${endY - startY}px) scale(0.4)`;
  }

  function transitionForPhase(phase: number): string {
    if (phase === 0) return 'none';
    if (phase === 1) return 'transform 0.28s ease-out';
    return 'transform 0.38s ease-in, opacity 0.2s ease-in 0.18s';
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
            transform: transformForPhase(icon),
            opacity: icon.phase === 2 ? 0 : 1,
            transition: transitionForPhase(icon.phase),
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
