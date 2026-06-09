import React from 'react';
import { hexPolygonPoints } from '@opensettlers/shared';
import type { Hex, TerrainType } from '@opensettlers/shared';
import type { Point } from '@opensettlers/shared';
import woodImg from '../../assets/wood.png';
import brickImg from '../../assets/brick.png';
import wheatImg from '../../assets/wheat.png';
import sheepImg from '../../assets/sheep.png';
import oreImg from '../../assets/ore.png';

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

const TERRAIN_IMG: Partial<Record<TerrainType, string>> = {
  forest: woodImg,
  hills: brickImg,
  fields: wheatImg,
  pasture: sheepImg,
  mountains: oreImg,
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
  const img = TERRAIN_IMG[hex.terrain];
  const imgSize = size * 0.48;

  return (
    <g>
      {/* Base color fill */}
      <polygon points={points} fill={color} stroke="#111" strokeWidth={1.5} />
      {/* Terrain texture pattern overlay */}
      {pattern && (
        <polygon points={points} fill={pattern} stroke="none" />
      )}
      {/* Terrain resource icon */}
      {img && (
        <image
          href={img}
          x={center.x - imgSize / 2}
          y={center.y - size * 0.38}
          width={imgSize}
          height={imgSize}
          style={{ pointerEvents: 'none' }}
        />
      )}
      {/* Desert cactus emoji fallback */}
      {hex.terrain === 'desert' && (
        <text
          x={center.x}
          y={center.y - size * 0.1}
          textAnchor="middle"
          fontSize={size * 0.32}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >🌵</text>
      )}
      {/* Number token */}
      {hex.numberToken !== null && (
        <>
          <circle
            cx={center.x}
            cy={center.y + size * 0.18}
            r={size * 0.22}
            fill="#f5e6c8"
            stroke="#555"
            strokeWidth={1}
          />
          <text
            x={center.x}
            y={center.y + size * 0.18 + size * 0.085}
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
      {/* Robber */}
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
