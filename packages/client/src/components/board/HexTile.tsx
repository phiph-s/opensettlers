import React from 'react';
import { hexPolygonPoints } from '@opensettlers/shared';
import type { Hex, TerrainType } from '@opensettlers/shared';
import type { Point } from '@opensettlers/shared';
import '../hud/animations.css';

const TERRAIN_COLORS: Record<TerrainType, string> = {
  forest: '#2d6a27',
  hills: '#c44a1a',
  fields: '#d4b44a',
  pasture: '#7dbb4e',
  mountains: '#8a8a8a',
  desert: '#d9c07a',
  sea: '#1a5a8a',
  clouds: '#c0d8f4',
};

const TERRAIN_PATTERN: Partial<Record<TerrainType, string>> = {
  forest: 'url(#pat-forest)',
  hills: 'url(#pat-hills)',
  fields: 'url(#pat-fields)',
  pasture: 'url(#pat-pasture)',
  mountains: 'url(#pat-mountains)',
  desert: 'url(#pat-desert)',
  clouds: 'url(#pat-clouds)',
};

interface Props {
  hex: Hex;
  center: Point;
  size: number;
  rolledNumber?: number | null;
}

export function HexTile({ hex, center, size, rolledNumber }: Props) {
  const points = hexPolygonPoints(center, size * 0.92);
  const innerPoints = hexPolygonPoints(center, size * 0.88);
  const color = TERRAIN_COLORS[hex.terrain];
  const pattern = TERRAIN_PATTERN[hex.terrain];
  const isRolled = rolledNumber != null && hex.numberToken === rolledNumber;
  const { x, y } = center;

  return (
    <>
      <g filter="url(#hex-tile-fx)">
        <polygon points={points} fill={color} stroke="none" />
        {pattern && <polygon points={points} fill={pattern} stroke="none" />}
        {/* Inset dark edge */}
        <polygon points={innerPoints} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth={5} />
        {/* Dice-roll flash overlay */}
        {isRolled && (
          <polygon
            points={hexPolygonPoints(center, size * 0.92)}
            fill="rgba(255,235,50,0.3)"
            stroke="rgba(255,215,0,0.9)"
            strokeWidth={3}
            className="hex-roll-flash"
          />
        )}
        {hex.numberToken !== null && !hex.hasRobber && (
          <>
            <circle cx={x} cy={y} r={size * 0.22} fill="#f5e6c8" stroke="#555" strokeWidth={1} />
            <text
              x={x}
              y={y + size * 0.085}
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
      </g>

      {/* Robber piece — rendered outside tile filter so it gets its own shadow */}
      {hex.hasRobber && <RobberPiece cx={x} cy={y} r={size * 0.26} />}
    </>
  );
}

function RobberPiece({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  // Hooded cloak silhouette — 8-point shape wider at bottom
  const pts = [
    [cx,           cy - r * 1.15],  // hood tip
    [cx + r * 0.62, cy - r * 0.68],  // upper right
    [cx + r * 0.95, cy + r * 0.10],  // mid right
    [cx + r * 0.85, cy + r * 0.88],  // lower right
    [cx + r * 0.30, cy + r * 1.05],  // bottom right
    [cx - r * 0.30, cy + r * 1.05],  // bottom left
    [cx - r * 0.85, cy + r * 0.88],  // lower left
    [cx - r * 0.95, cy + r * 0.10],  // mid left
    [cx - r * 0.62, cy - r * 0.68],  // upper left
  ].map(([px, py]) => `${px},${py}`).join(' ');

  return (
    <g filter="drop-shadow(0 3px 5px rgba(0,0,0,0.8))" style={{ pointerEvents: 'none' }}>
      {/* White border behind */}
      <polygon points={pts} fill="none" stroke="rgba(255,255,255,0.68)" strokeWidth={2.5} strokeLinejoin="round" />
      {/* Dark cloak fill */}
      <polygon points={pts} fill="#1a1008" strokeLinejoin="round" />
      {/* Glowing red eyes */}
      <circle cx={cx - r * 0.26} cy={cy - r * 0.18} r={r * 0.16} fill="#b91c1c" />
      <circle cx={cx + r * 0.26} cy={cy - r * 0.18} r={r * 0.16} fill="#b91c1c" />
      {/* Menacing grin */}
      <path
        d={`M ${cx - r * 0.30} ${cy + r * 0.28} Q ${cx} ${cy + r * 0.52} ${cx + r * 0.30} ${cy + r * 0.28}`}
        stroke="#b91c1c" strokeWidth={1.8} fill="none" strokeLinecap="round"
      />
    </g>
  );
}
