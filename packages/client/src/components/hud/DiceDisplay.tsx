import React from 'react';
import { socket } from '../../socket.js';

interface Props {
  diceRoll: [number, number] | null;
  canRoll: boolean; // true when it's the player's turn and they haven't rolled yet
}

// Dot positions for each die face (1-6), as [cx, cy] pairs normalized 0-1
const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.25, 0.8], [0.75, 0.8]],
};

function Die({ value, size, glowing, gradId }: { value: number; size: number; glowing: boolean; gradId: string }) {
  const r = size * 0.14;
  const dotR = size * 0.09;
  const dots = DOT_POSITIONS[value] ?? [];
  return (
    <g>
      <defs>
        <radialGradient id={gradId} cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor={glowing ? '#ffd0a0' : '#fffdf0'} />
          <stop offset="100%" stopColor={glowing ? '#f4a261' : '#e8e0cc'} />
        </radialGradient>
      </defs>
      <rect
        x={0} y={0} width={size} height={size}
        rx={r} ry={r}
        fill={`url(#${gradId})`}
        stroke={glowing ? '#e67e22' : '#b0a080'}
        strokeWidth={2}
        style={{ filter: glowing ? 'drop-shadow(0 0 8px #f4a26188)' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
      />
      {dots.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx! * size}
          cy={cy! * size}
          r={dotR}
          fill={value === 6 || value === 8 ? '#c0392b' : '#2a1a0a'}
        />
      ))}
    </g>
  );
}

export function DiceDisplay({ diceRoll, canRoll }: Props) {
  const dieSize = 52;
  const gap = 10;
  const totalW = dieSize * 2 + gap;
  const totalH = dieSize;

  const d1 = diceRoll?.[0] ?? null;
  const d2 = diceRoll?.[1] ?? null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        cursor: canRoll ? 'pointer' : 'default',
        userSelect: 'none',
      }}
      onClick={() => canRoll && socket.emit('game:roll')}
      title={canRoll ? 'Click to roll' : undefined}
    >
      <svg width={totalW} height={totalH} style={{ overflow: 'visible' }}>
        <g transform={`translate(0, 0)`}>
          <Die value={d1 ?? 1} size={dieSize} glowing={canRoll} gradId="die1grad" />
        </g>
        <g transform={`translate(${dieSize + gap}, 0)`}>
          <Die value={d2 ?? 1} size={dieSize} glowing={canRoll} gradId="die2grad" />
        </g>
      </svg>
    </div>
  );
}
