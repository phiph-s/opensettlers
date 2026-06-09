import React from 'react';
import { useTurnTimer } from '../../hooks/useTurnTimer.js';

interface Props {
  deadline: number | null;
  totalSeconds: number;
}

export function TurnTimerBar({ deadline, totalSeconds }: Props) {
  const secondsLeft = useTurnTimer(deadline);
  if (!deadline) return null;

  const pct = totalSeconds > 0 ? Math.min(1, secondsLeft / totalSeconds) : 0;
  const urgent = secondsLeft <= 10;

  return (
    <div style={{ height: 5, background: '#d4c8b8', position: 'relative' }}>
      <div
        style={{
          height: '100%',
          width: `${pct * 100}%`,
          background: urgent ? '#e74c3c' : '#2ecc71',
          transition: 'width 0.5s linear, background 0.3s',
        }}
      />
      {urgent && (
        <span style={{
          position: 'absolute',
          right: 8,
          top: -18,
          color: '#e74c3c',
          fontSize: 12,
          fontWeight: 'bold',
        }}>
          {secondsLeft}s
        </span>
      )}
    </div>
  );
}
