import React from 'react';
import { useConnectionStore } from '../store/useConnectionStore.js';
import { usePlayerStore } from '../store/usePlayerStore.js';
import './hud/animations.css';

/**
 * Slim top banner shown while the socket is reconnecting during an active
 * session (lobby or game). Hidden on the initial page-load connect so it
 * doesn't flash before the first connection settles.
 */
export function ConnectionBanner() {
  const status = useConnectionStore((s) => s.status);
  const hasConnected = useConnectionStore((s) => s.hasConnected);
  const currentLobbyId = usePlayerStore((s) => s.currentLobbyId);

  const visible = status === 'reconnecting' && hasConnected && !!currentLobbyId;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? '12px' : '-120%'})`,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '7px 16px 7px 13px',
        borderRadius: 999,
        background: 'linear-gradient(180deg, rgba(28,42,64,0.96), rgba(18,28,46,0.96))',
        border: '1px solid rgba(212,160,23,0.45)',
        boxShadow: '0 6px 22px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        color: '#f3ead2',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "'Cinzel', Georgia, serif",
        letterSpacing: '0.02em',
        backdropFilter: 'blur(6px)',
        transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span className="connection-banner-dot" aria-hidden />
      Reconnecting…
    </div>
  );
}
