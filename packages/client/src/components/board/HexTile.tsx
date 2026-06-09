import React from 'react';
import { hexPolygonPoints } from '@opensettlers/shared';
import type { Hex, TerrainType } from '@opensettlers/shared';
import type { Point } from '@opensettlers/shared';

const TERRAIN_COLORS: Record<TerrainType, string> = {
  forest: '#2d6a27',
  hills: '#c44a1a',
  fields: '#d4b44a',
  pasture: '#7dbb4e',
  mountains: '#8a8a8a',
  desert: '#d9c07a',
  sea: '#1a5a8a',
};

const TERRAIN_PATTERN: Partial<Record<TerrainType, string>> = {
  forest: 'url(#pat-forest)',
  hills: 'url(#pat-hills)',
  fields: 'url(#pat-fields)',
  pasture: 'url(#pat-pasture)',
  mountains: 'url(#pat-mountains)',
  desert: 'url(#pat-desert)',
};

interface Props {
  hex: Hex;
  center: Point;
  size: number;
  onClick?: () => void;
}

export function HexTile({ hex, center, size }: Props) {
  const points = hexPolygonPoints(center, size * 0.97);
  const color = TERRAIN_COLORS[hex.terrain];
  const pattern = TERRAIN_PATTERN[hex.terrain];

  return (
    <g>
      <polygon points={points} fill={color} stroke="#111" strokeWidth={1.5} />
      {pattern && <polygon points={points} fill={pattern} stroke="none" />}
      {hex.numberToken !== null && (
        <>
          <circle cx={center.x} cy={center.y} r={size * 0.22} fill="#f5e6c8" stroke="#555" strokeWidth={1} />
          <text
            x={center.x}
            y={center.y + size * 0.085}
            textAnchor="middle"
            fontSize={size * 0.22}
            fontWeight="bold"
            fill={hex.numberToken === 6 || hex.numberToken === 8 ? '#cc0000' : '#333'}
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {hex.numberToken}
          </text>
        </>
      )}
      {hex.hasRobber && (
        <text
          x={center.x}
          y={center.y + size * 0.5}
          textAnchor="middle"
          fontSize={size * 0.3}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >🦹</text>
      )}
    </g>
  );
}
