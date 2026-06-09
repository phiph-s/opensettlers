import React from 'react';
import type { Vertex } from '@opensettlers/shared';
import type { Point } from '@opensettlers/shared';
import '../hud/animations.css';

interface Props {
  vertex: Vertex;
  position: Point;
  isValid: boolean;
  size: number;
  myPlayerId: string | null;
  playerColorMap: Record<string, string>;
  onClick?: () => void;
}

function Settlement({ cx, cy, color, s }: { cx: number; cy: number; color: string; s: number }) {
  // Roof: triangle peak above, wider than body
  // Body: rectangle below roof line
  const roofBase = cy + s * 0.12;
  const bodyBottom = cy + s * 0.98;
  const bodyHW = s * 0.76;  // body half-width
  const roofHW = s * 1.02;  // roof overhang half-width

  const d = [
    `M ${cx} ${cy - s}`,
    `L ${cx + roofHW} ${roofBase}`,
    `L ${cx + bodyHW} ${roofBase}`,
    `L ${cx + bodyHW} ${bodyBottom}`,
    `L ${cx - bodyHW} ${bodyBottom}`,
    `L ${cx - bodyHW} ${roofBase}`,
    `L ${cx - roofHW} ${roofBase}`,
    'Z',
  ].join(' ');

  // Lighter roof tint for the roof triangle part only
  const roofD = [
    `M ${cx} ${cy - s}`,
    `L ${cx + roofHW} ${roofBase}`,
    `L ${cx - roofHW} ${roofBase}`,
    'Z',
  ].join(' ');

  return (
    <g>
      <path d={d} fill={color} stroke="#222" strokeWidth={1.2} strokeLinejoin="round" />
      {/* Roof shading — slightly darker overlay on the triangle */}
      <path d={roofD} fill="rgba(0,0,0,0.12)" strokeWidth={0} />
      {/* Door */}
      <rect
        x={cx - s * 0.2}
        y={cy + s * 0.38}
        width={s * 0.4}
        height={s * 0.6}
        rx={s * 0.07}
        fill="#111"
        opacity={0.75}
      />
    </g>
  );
}

function City({ cx, cy, color, s }: { cx: number; cy: number; color: string; s: number }) {
  // L-shaped silhouette: tall tower on left, shorter main hall on right
  const towerTop   = cy - s * 1.05;
  const hallTop    = cy - s * 0.32;
  const baseBottom = cy + s * 0.95;
  const leftX      = cx - s * 0.88;
  const towerRX    = cx - s * 0.05;
  const rightX     = cx + s * 0.88;

  const d = [
    `M ${leftX} ${towerTop}`,
    `L ${towerRX} ${towerTop}`,
    `L ${towerRX} ${hallTop}`,
    `L ${rightX} ${hallTop}`,
    `L ${rightX} ${baseBottom}`,
    `L ${leftX} ${baseBottom}`,
    'Z',
  ].join(' ');

  // Tower darker shade
  const towerD = [
    `M ${leftX} ${towerTop}`,
    `L ${towerRX} ${towerTop}`,
    `L ${towerRX} ${hallTop}`,
    `L ${leftX} ${hallTop}`,
    'Z',
  ].join(' ');

  return (
    <g>
      <path d={d} fill={color} stroke="#222" strokeWidth={1.2} strokeLinejoin="round" />
      {/* Tower roof shading */}
      <path d={towerD} fill="rgba(0,0,0,0.1)" strokeWidth={0} />
      {/* Dividing line between tower and hall */}
      <line x1={towerRX} y1={hallTop} x2={towerRX} y2={baseBottom} stroke="#222" strokeWidth={0.8} opacity={0.5} />
      {/* Tower window */}
      <rect
        x={leftX + s * 0.18}
        y={towerTop + s * 0.28}
        width={s * 0.38}
        height={s * 0.32}
        rx={s * 0.06}
        fill="#111"
        opacity={0.7}
      />
      {/* Hall window */}
      <rect
        x={towerRX + s * 0.22}
        y={hallTop + s * 0.18}
        width={s * 0.38}
        height={s * 0.32}
        rx={s * 0.06}
        fill="#111"
        opacity={0.7}
      />
    </g>
  );
}

export function VertexSpot({ vertex, position, isValid, size, myPlayerId, playerColorMap, onClick }: Props) {
  const s = size * 0.155;
  const { x, y } = position;
  const building = vertex.building;

  if (building) {
    const color = playerColorMap[building.owner] ?? '#aaa';
    return (
      <g
        key={`${building.type}-${building.owner}`}
        className="piece-drop-in"
        onClick={isValid ? onClick : undefined}
        style={isValid ? { cursor: 'pointer' } : undefined}
      >
        {building.type === 'city'
          ? <City cx={x} cy={y} color={color} s={s} />
          : <Settlement cx={x} cy={y} color={color} s={s} />}
        {/* Highlight ring when this building is a valid upgrade target */}
        {isValid && (
          <circle
            cx={x} cy={y} r={s * 1.3}
            fill="rgba(255,240,100,0.18)"
            stroke="rgba(255,220,50,0.75)"
            strokeWidth={1.5}
          />
        )}
      </g>
    );
  }

  if (!isValid) return null;

  return (
    <circle
      cx={x}
      cy={y}
      r={s * 0.72}
      fill="rgba(255,255,255,0.18)"
      stroke="rgba(255,255,255,0.7)"
      strokeWidth={1.5}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    />
  );
}
