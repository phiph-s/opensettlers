import React from 'react';
import type { Edge } from '@opensettlers/shared';
import type { Point } from '@opensettlers/shared';

interface Props {
  edge: Edge;
  midpoint: Point;
  v1: Point | undefined;
  v2: Point | undefined;
  isValid: boolean;
  size: number;
  playerColorMap: Record<string, string>;
  onClick?: () => void;
}

export function EdgeSpot({ edge, midpoint, v1, v2, isValid, size, playerColorMap, onClick }: Props) {
  if (edge.road) {
    const color = playerColorMap[edge.road.owner] ?? '#aaa';
    if (v1 && v2) {
      return (
        <line
          x1={v1.x} y1={v1.y}
          x2={v2.x} y2={v2.y}
          stroke={color}
          strokeWidth={size * 0.1}
          strokeLinecap="round"
        />
      );
    }
    return (
      <circle cx={midpoint.x} cy={midpoint.y} r={size * 0.08} fill={color} />
    );
  }

  if (!isValid) return null;

  const r = size * 0.09;
  return (
    <circle
      cx={midpoint.x}
      cy={midpoint.y}
      r={r}
      fill="rgba(255,255,255,0.15)"
      stroke="rgba(255,255,255,0.5)"
      strokeWidth={1}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    />
  );
}
