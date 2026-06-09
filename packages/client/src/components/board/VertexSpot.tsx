import React from 'react';
import type { Vertex } from '@opensettlers/shared';
import type { Point } from '@opensettlers/shared';

interface Props {
  vertex: Vertex;
  position: Point;
  isValid: boolean;
  size: number;
  myPlayerId: string | null;
  playerColorMap: Record<string, string>;
  onClick?: () => void;
}

export function VertexSpot({ vertex, position, isValid, size, myPlayerId, playerColorMap, onClick }: Props) {
  const r = size * 0.15;
  const building = vertex.building;

  if (building) {
    const color = playerColorMap[building.owner] ?? '#aaa';
    const isCity = building.type === 'city';
    return (
      <g>
        {isCity ? (
          <rect
            x={position.x - r * 1.2}
            y={position.y - r * 1.2}
            width={r * 2.4}
            height={r * 2.4}
            fill={color}
            stroke="#111"
            strokeWidth={1.5}
          />
        ) : (
          <polygon
            points={[
              `${position.x},${position.y - r * 1.4}`,
              `${position.x + r},${position.y + r * 0.6}`,
              `${position.x - r},${position.y + r * 0.6}`,
            ].join(' ')}
            fill={color}
            stroke="#111"
            strokeWidth={1.5}
          />
        )}
      </g>
    );
  }

  if (!isValid) return null;

  return (
    <circle
      cx={position.x}
      cy={position.y}
      r={r * 0.8}
      fill="rgba(255,255,255,0.2)"
      stroke="rgba(255,255,255,0.6)"
      strokeWidth={1.5}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    />
  );
}
