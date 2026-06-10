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
  gold: '#b8860b',
};

const TERRAIN_PATTERN: Partial<Record<TerrainType, string>> = {
  forest: 'url(#pat-forest)',
  hills: 'url(#pat-hills)',
  fields: 'url(#pat-fields)',
  pasture: 'url(#pat-pasture)',
  mountains: 'url(#pat-mountains)',
  desert: 'url(#pat-desert)',
  clouds: 'url(#pat-clouds)',
  gold: 'url(#pat-gold)',
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
  const headCy = cy - r * 0.58;
  const headR  = r * 0.40;

  // Cloak path: shoulders narrow, hem wide
  const cloak = [
    `M ${cx - r*0.40} ${cy - r*0.22}`,
    `Q ${cx - r*0.52} ${cy + r*0.42} ${cx - r*0.92} ${cy + r*1.05}`,
    `L ${cx + r*0.92} ${cy + r*1.05}`,
    `Q ${cx + r*0.52} ${cy + r*0.42} ${cx + r*0.40} ${cy - r*0.22} Z`,
  ].join(' ');

  // Pointed hood behind the head
  const hood = [
    `M ${cx - headR*1.12} ${headCy + headR*0.35}`,
    `Q ${cx - headR*0.55} ${headCy - headR*2.0} ${cx} ${headCy - headR*2.35}`,
    `Q ${cx + headR*0.55} ${headCy - headR*2.0} ${cx + headR*1.12} ${headCy + headR*0.35}`,
    `Q ${cx} ${headCy + headR*0.15} ${cx - headR*1.12} ${headCy + headR*0.35} Z`,
  ].join(' ');

  // Red bandana covers the lower half of the face
  const bandana = [
    `M ${cx - headR*0.90} ${headCy + headR*0.08}`,
    `A ${headR} ${headR} 0 0 0 ${cx + headR*0.90} ${headCy + headR*0.08}`,
    `Q ${cx + headR*0.78} ${headCy + headR*0.94} ${cx} ${headCy + headR*0.98}`,
    `Q ${cx - headR*0.78} ${headCy + headR*0.94} ${cx - headR*0.90} ${headCy + headR*0.08} Z`,
  ].join(' ');

  const ex = r * 0.155; // eye x-offset from center
  const ey = headCy - headR * 0.10;

  return (
    <g filter="drop-shadow(0 2px 5px rgba(0,0,0,0.9))" style={{ pointerEvents: 'none' }}>
      {/* White glow outline */}
      <path d={hood}  fill="rgba(255,255,255,0.45)" />
      <path d={cloak} fill="rgba(255,255,255,0.45)" />
      <circle cx={cx} cy={headCy} r={headR + 1.8} fill="rgba(255,255,255,0.42)" />

      {/* Hood */}
      <path d={hood} fill="#1c1408" stroke="rgba(255,255,255,0.28)" strokeWidth={1.2} strokeLinejoin="round" />
      {/* Cloak */}
      <path d={cloak} fill="#1c1408" />
      {/* Head */}
      <circle cx={cx} cy={headCy} r={headR} fill="#28200e" />
      {/* Bandana */}
      <path d={bandana} fill="#991515" opacity={0.9} />

      {/* Eyes: white sclera + red iris */}
      <circle cx={cx - ex} cy={ey} r={r * 0.118} fill="rgba(255,255,255,0.92)" />
      <circle cx={cx + ex} cy={ey} r={r * 0.118} fill="rgba(255,255,255,0.92)" />
      <circle cx={cx - ex} cy={ey} r={r * 0.068} fill="#e03030" />
      <circle cx={cx + ex} cy={ey} r={r * 0.068} fill="#e03030" />
    </g>
  );
}
