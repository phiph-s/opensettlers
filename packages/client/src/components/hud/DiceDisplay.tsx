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

function Die({ value, size, glowing }: { value: number; size: number; glowing: boolean }) {
  const r = size * 0.12; // corner radius
  const dotR = size * 0.09;
  const dots = DOT_POSITIONS[value] ?? [];
  return (
    <g>
      <rect
        x={0} y={0} width={size} height={size}
        rx={r} ry={r}
        fill={glowing ? '#f4a261' : '#f1f1e8'}
        stroke={glowing ? '#e67e22' : '#bbb'}
        strokeWidth={2}
        style={{ filter: glowing ? 'drop-shadow(0 0 6px #f4a261)' : undefined }}
      />
      {dots.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx * size}
          cy={cy * size}
          r={dotR}
          fill={value === 6 || value === 8 ? '#c0392b' : '#222'}
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
  const sum = d1 !== null && d2 !== null ? d1 + d2 : null;

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
          <Die value={d1 ?? 1} size={dieSize} glowing={canRoll} />
        </g>
        <g transform={`translate(${dieSize + gap}, 0)`}>
          <Die value={d2 ?? 1} size={dieSize} glowing={canRoll} />
        </g>
      </svg>
      {sum !== null && (
        <div style={{
          color: (sum === 6 || sum === 8) ? '#b91c1c' : '#2c2516',
          fontWeight: 'bold',
          fontSize: 18,
        }}>{sum}</div>
      )}
      {canRoll && (
        <div style={{ fontSize: 11, color: '#7a6d5e' }}>click to roll</div>
      )}
    </div>
  );
}
