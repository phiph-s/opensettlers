import React from 'react';
import type { Hex } from '@opensettlers/shared';
import type { Point } from '@opensettlers/shared';

interface Props {
  hex: Hex;
  center: Point;
  size: number;
  isValidTarget: boolean;
  uiScale?: number;
  onClick?: () => void;
}

export function RobberSpot({ hex, center, size, isValidTarget, uiScale = 1, onClick }: Props) {
  if (!isValidTarget) return null;
  const r = size * 0.45 * uiScale;
  return (
    <circle
      cx={center.x}
      cy={center.y}
      r={r}
      fill="rgba(255,0,0,0.1)"
      stroke="rgba(255,0,0,0.4)"
      strokeWidth={2 * uiScale}
      strokeDasharray={`${6 * uiScale} ${3 * uiScale}`}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    />
  );
}
