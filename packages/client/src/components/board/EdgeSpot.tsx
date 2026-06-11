import React from 'react';
import type { Edge } from '@opensettlers/shared';
import type { Point } from '@opensettlers/shared';
import '../hud/animations.css';

interface Props {
  edge: Edge;
  midpoint: Point;
  v1: Point | undefined;
  v2: Point | undefined;
  isValid: boolean;
  isValidShip?: boolean;
  isMoveOrigin?: boolean;
  isMoveSelected?: boolean;
  size: number;
  uiScale?: number;
  playerColorMap: Record<string, string>;
  onClick?: () => void;
}

export function EdgeSpot({ edge, midpoint, v1, v2, isValid, isValidShip, isMoveOrigin, isMoveSelected, size, uiScale = 1, playerColorMap, onClick }: Props) {
  // Render road
  if (edge.road) {
    const color = playerColorMap[edge.road.owner] ?? '#aaa';
    if (v1 && v2) {
      return (
        <g className="road-drop-in" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.55))' }}>
          <line
            x1={v1.x} y1={v1.y}
            x2={v2.x} y2={v2.y}
            stroke="rgba(255,255,255,0.72)"
            strokeWidth={size * 0.145 * uiScale}
            strokeLinecap="round"
          />
          <line
            x1={v1.x} y1={v1.y}
            x2={v2.x} y2={v2.y}
            stroke={color}
            strokeWidth={size * 0.095 * uiScale}
            strokeLinecap="round"
          />
        </g>
      );
    }
    return (
      <g className="road-drop-in">
        <circle cx={midpoint.x} cy={midpoint.y} r={size * 0.08} fill={color}
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
      </g>
    );
  }

  // Render ship
  if (edge.ship) {
    const color = playerColorMap[edge.ship.owner] ?? '#aaa';
    const selRing = isMoveSelected
      ? <circle cx={midpoint.x} cy={midpoint.y} r={size * 0.28 * uiScale} fill="none" stroke="rgba(255,220,60,0.85)" strokeWidth={size * 0.055 * uiScale} strokeDasharray={`${size * 0.12} ${size * 0.06}`} />
      : isMoveOrigin
        ? <circle cx={midpoint.x} cy={midpoint.y} r={size * 0.28 * uiScale} fill="none" stroke="rgba(80,200,255,0.65)" strokeWidth={size * 0.04 * uiScale} strokeDasharray={`${size * 0.1} ${size * 0.06}`} />
        : null;
    if (v1 && v2) {
      return (
        <g className="road-drop-in" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.7))', cursor: isMoveOrigin ? 'pointer' : undefined }} onClick={isMoveOrigin ? onClick : undefined}>
          <ShipPiece v1={v1} v2={v2} color={color} size={size} uiScale={uiScale} />
          {selRing}
        </g>
      );
    }
    return (
      <g className="road-drop-in" style={{ cursor: isMoveOrigin ? 'pointer' : undefined }} onClick={isMoveOrigin ? onClick : undefined}>
        <circle cx={midpoint.x} cy={midpoint.y} r={size * 0.1} fill={color}
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
        {selRing}
      </g>
    );
  }

  // Valid road spot
  if (isValid) {
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

  // Valid ship spot
  if (isValidShip) {
    const r = size * 0.09;
    return (
      <circle
        cx={midpoint.x}
        cy={midpoint.y}
        r={r}
        fill="rgba(70,160,220,0.25)"
        stroke="rgba(70,160,220,0.7)"
        strokeWidth={1}
        strokeDasharray={`${3} ${2}`}
        style={{ cursor: 'pointer' }}
        onClick={onClick}
      />
    );
  }

  return null;
}

/** Renders a top-down ship silhouette centered between v1 and v2 */
function ShipPiece({ v1, v2, color, size, uiScale }: {
  v1: Point; v2: Point; color: string; size: number; uiScale: number;
}) {
  const mx = (v1.x + v2.x) / 2;
  const my = (v1.y + v2.y) / 2;
  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const L = size * 0.52 * uiScale; // half-length along edge
  const W = size * 0.15 * uiScale; // half-width perpendicular

  // Top-down hull: pointed bow (+L), rounded stern (-L)
  const hullPath = `M ${L} 0 Q ${L * 0.4} ${-W} ${-L * 0.65} ${-W} Q ${-L} ${-W * 0.6} ${-L} 0 Q ${-L} ${W * 0.6} ${-L * 0.65} ${W} Q ${L * 0.4} ${W} ${L} 0 Z`;

  return (
    <g transform={`translate(${mx}, ${my}) rotate(${angle})`}>
      {/* Shadow */}
      <path d={hullPath} fill="rgba(0,0,0,0.28)" transform="translate(1.5,2)" />
      {/* Hull body */}
      <path d={hullPath} fill={color} stroke="rgba(255,255,255,0.5)" strokeWidth={W * 0.22} />
      {/* Deck stripe */}
      <path
        d={`M ${L * 0.55} 0 Q ${L * 0.2} ${-W * 0.55} ${-L * 0.5} ${-W * 0.55} L ${-L * 0.5} ${W * 0.55} Q ${L * 0.2} ${W * 0.55} ${L * 0.55} 0 Z`}
        fill="rgba(255,255,255,0.18)"
      />
      {/* Mast dot */}
      <circle cx={L * 0.05} cy={0} r={W * 0.32} fill="rgba(255,255,255,0.75)" />
    </g>
  );
}
