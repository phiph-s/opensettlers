import React from 'react';
import type { Hex } from '@opensettlers/shared';
import type { Point } from '@opensettlers/shared';

interface Props {
  hex: Hex;
  center: Point;
  size: number;
  isValidTarget: boolean;
  onClick?: () => void;
}

export function RobberSpot({ hex, center, size, isValidTarget, onClick }: Props) {
  if (!isValidTarget) return null;
  return (
    <circle
      cx={center.x}
      cy={center.y}
      r={size * 0.45}
      fill="rgba(255,0,0,0.1)"
      stroke="rgba(255,0,0,0.4)"
      strokeWidth={2}
      strokeDasharray="6 3"
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    />
  );
}
