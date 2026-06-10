import React, { useEffect, useRef, useState } from 'react';
import type { GameState } from '@opensettlers/shared';
import './animations.css';

interface BannerItem {
  key: number;
  text: string;
  sub: string;
  icon: string;
}

interface Props {
  gameState: GameState;
}

export function AchievementBanner({ gameState }: Props) {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const keyRef = useRef(0);
  const prevLROwner = useRef<string | null>(null);
  const prevLAOwner = useRef<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      prevLROwner.current = gameState.longestRoadOwner;
      prevLAOwner.current = gameState.largestArmyOwner;
      initialized.current = true;
      return;
    }

    const newBanners: BannerItem[] = [];

    if (gameState.longestRoadOwner && gameState.longestRoadOwner !== prevLROwner.current) {
      const player = gameState.players.find((p) => p.id === gameState.longestRoadOwner);
      newBanners.push({
        key: keyRef.current++,
        icon: '🛣️',
        text: player?.name ?? 'Someone',
        sub: `takes Longest Road (${gameState.longestRoadLength})`,
      });
    }

    if (gameState.largestArmyOwner && gameState.largestArmyOwner !== prevLAOwner.current) {
      const player = gameState.players.find((p) => p.id === gameState.largestArmyOwner);
      newBanners.push({
        key: keyRef.current++,
        icon: '⚔️',
        text: player?.name ?? 'Someone',
        sub: `takes Largest Army (${gameState.largestArmySize})`,
      });
    }

    if (newBanners.length > 0) {
      setBanners((prev) => [...prev, ...newBanners]);
      const ids = newBanners.map((b) => b.key);
      setTimeout(() => {
        setBanners((prev) => prev.filter((b) => !ids.includes(b.key)));
      }, 3800);
    }

    prevLROwner.current = gameState.longestRoadOwner;
    prevLAOwner.current = gameState.largestArmyOwner;
  });

  if (banners.length === 0) return null;

  return (
    <>
      {banners.map((banner, i) => (
        <div
          key={banner.key}
          className="achievement-banner"
          style={{
            position: 'fixed',
            top: 64 + i * 80,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'linear-gradient(135deg, #2c1a0e 0%, #5c3a10 100%)',
            border: '2px solid #c9a84c',
            borderRadius: 14,
            padding: '12px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 6px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,168,76,0.3)',
            minWidth: 260,
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: 32, lineHeight: 1 }}>{banner.icon}</span>
          <div>
            <div style={{ color: '#f5d47a', fontSize: 16, fontWeight: 800, lineHeight: 1.2 }}>
              {banner.text}
            </div>
            <div style={{ color: '#c9a84c', fontSize: 12, fontWeight: 500, marginTop: 2 }}>
              {banner.sub}
            </div>
          </div>
          <span style={{ fontSize: 20, marginLeft: 4 }}>+2⭐</span>
        </div>
      ))}
    </>
  );
}
