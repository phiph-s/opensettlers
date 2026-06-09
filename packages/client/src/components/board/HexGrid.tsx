import React, { useCallback, useMemo } from 'react';
import type { GameState, EdgeKey, HexKey, VertexKey, PortType } from '@opensettlers/shared';
import { cubeKey } from '@opensettlers/shared';
import { useBoardLayout } from '../../hooks/useBoardLayout.js';
import type { ValidMoves } from '../../hooks/useValidMoves.js';
import { HexTile } from './HexTile.js';
import { VertexSpot } from './VertexSpot.js';
import { EdgeSpot } from './EdgeSpot.js';
import { RobberSpot } from './RobberSpot.js';
import { PortMarker } from './PortMarker.js';
import { socket } from '../../socket.js';

const COLOR_HEX: Record<string, string> = {
  red: '#e63946', blue: '#457b9d', orange: '#f4a261', black: '#2c2c2c',
  green: '#2ecc71', purple: '#9b59b6',
};

interface Props {
  gameState: GameState;
  myPlayerId: string | null;
  validMoves: ValidMoves;
  buildMode: 'road' | 'settlement' | 'city' | null;
  onBuildModeChange: (mode: 'road' | 'settlement' | 'city' | null) => void;
}

export function HexGrid({ gameState, myPlayerId, validMoves, buildMode, onBuildModeChange }: Props) {
  const { board, phase } = gameState;
  const layout = useBoardLayout(board, 70);

  const playerColorMap = useMemo(
    () => Object.fromEntries(gameState.players.map((p) => [p.id, COLOR_HEX[p.color] ?? '#aaa'])),
    [gameState.players]
  );

  const onVertexClick = useCallback((vk: VertexKey) => {
    if (phase === 'SETUP_PLACE_SETTLEMENT') {
      socket.emit('game:place_settlement', { vertexKey: vk });
    } else if (phase === 'BUILD_PHASE') {
      const vertex = board.vertices[vk];
      if (vertex?.building) {
        socket.emit('game:build_city', { vertexKey: vk });
      } else {
        socket.emit('game:build_settlement', { vertexKey: vk });
      }
      onBuildModeChange(null);
    }
  }, [phase, board, onBuildModeChange]);

  const onEdgeClick = useCallback((ek: EdgeKey) => {
    if (phase === 'SETUP_PLACE_ROAD' || phase === 'DEV_ROAD_BUILDING') {
      socket.emit('game:place_road', { edgeKey: ek });
    } else if (phase === 'BUILD_PHASE') {
      socket.emit('game:build_road', { edgeKey: ek });
      onBuildModeChange(null);
    }
  }, [phase, onBuildModeChange]);

  const onHexClick = useCallback((hk: HexKey) => {
    if (phase === 'ROBBER_PLACEMENT') {
      const hex = board.hexes[hk];
      if (hex) socket.emit('game:move_robber', { hexCoord: hex.coord });
    }
  }, [phase, board]);

  // During setup/forced phases show all valid spots; in BUILD_PHASE only show the selected type
  const isSetupSettlement = phase === 'SETUP_PLACE_SETTLEMENT';
  const isSetupRoad = phase === 'SETUP_PLACE_ROAD' || phase === 'DEV_ROAD_BUILDING';
  const showRoadEdges = isSetupRoad || (phase === 'BUILD_PHASE' && buildMode === 'road');
  const showSettlementVertices = isSetupSettlement || (phase === 'BUILD_PHASE' && buildMode === 'settlement');
  const showCityVertices = phase === 'BUILD_PHASE' && buildMode === 'city';

  const isRobberPhase = phase === 'ROBBER_PLACEMENT';
  const activeId = gameState.players[gameState.activePlayerIndex]?.id;
  const canMoveRobber = isRobberPhase && activeId === myPlayerId;

  // Group port vertices into pairs by proximity, render one marker per port at midpoint
  // pushed outward from the board center (0,0) for visibility
  const portMarkers = useMemo(() => {
    const portVerts: Array<{ x: number; y: number; portType: PortType }> = [];
    for (const [vk, vertex] of Object.entries(board.vertices)) {
      if (!vertex.port) continue;
      const pos = layout.vertexPositions[vk];
      if (!pos) continue;
      portVerts.push({ x: pos.x, y: pos.y, portType: vertex.port });
    }
    const used = new Set<number>();
    const result: Array<{ pos: { x: number; y: number }; portType: PortType; v1: { x: number; y: number }; v2: { x: number; y: number } }> = [];
    const threshold = layout.size * 1.3;
    for (let i = 0; i < portVerts.length; i++) {
      if (used.has(i)) continue;
      const a = portVerts[i]!;
      let matched = false;
      for (let j = i + 1; j < portVerts.length; j++) {
        if (used.has(j)) continue;
        const b = portVerts[j]!;
        if (b.portType !== a.portType) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        if (Math.sqrt(dx * dx + dy * dy) < threshold) {
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          const len = Math.sqrt(mx * mx + my * my);
          const push = layout.size * 1.2;
          const px = len > 0 ? mx + (mx / len) * push : mx;
          const py = len > 0 ? my + (my / len) * push : my;
          result.push({ pos: { x: px, y: py }, portType: a.portType, v1: { x: a.x, y: a.y }, v2: { x: b.x, y: b.y } });
          used.add(i); used.add(j); matched = true; break;
        }
      }
      if (!matched) { used.add(i); }
    }
    return result;
  }, [board.vertices, layout]);

  const [vbX, vbY, vbW, vbH] = layout.viewBox.split(' ').map(Number);

  return (
    <svg
      viewBox={layout.viewBox}
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        {/* Seamlessly tiling wave pattern — 120×60 tile */}
        <pattern
          id="oceanWaves"
          x="0" y="0"
          width="120" height="60"
          patternUnits="userSpaceOnUse"
          patternTransform="translate(0 0)"
        >
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-ignore — animateTransform is valid SVG but has no React types */}
          <animateTransform
            attributeName="patternTransform"
            type="translate"
            from="0 0"
            to="-120 0"
            dur="7s"
            repeatCount="indefinite"
          />
          {/* Main wave */}
          <path d="M 0 22 C 30 12, 90 32, 120 22" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" strokeLinecap="round" />
          {/* Counter wave */}
          <path d="M 0 44 C 40 54, 80 34, 120 44" fill="none" stroke="rgba(255,255,255,0.11)" strokeWidth="1.8" strokeLinecap="round" />
          {/* Ripple */}
          <path d="M 0 10 C 20 6, 100 14, 120 10"  fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1.2" strokeLinecap="round" />
          {/* Deep ripple */}
          <path d="M 0 54 C 60 48, 80 60, 120 54"  fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"   strokeLinecap="round" />
        </pattern>
      </defs>

      {/* Ocean background */}
      <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="#1a6b9a" />
      <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="url(#oceanWaves)" />

      {/* Hex tiles */}
      {Object.entries(board.hexes).map(([hk, hex]) => {
        const center = layout.hexCenters[hk];
        if (!center) return null;
        return (
          <g key={hk}>
            <HexTile hex={hex} center={center} size={layout.size} />
            {canMoveRobber && hex.terrain !== 'sea' && !hex.hasRobber && (
              <RobberSpot
                hex={hex}
                center={center}
                size={layout.size}
                isValidTarget={true}
                onClick={() => onHexClick(hk)}
              />
            )}
          </g>
        );
      })}

      {/* Edges (roads) */}
      {Object.entries(board.edges).map(([ek, edge]) => {
        const midpoint = layout.edgeMidpoints[ek];
        if (!midpoint) return null;
        const [vk1, vk2] = edge.adjacentVertexKeys;
        const v1 = vk1 ? layout.vertexPositions[vk1] : undefined;
        const v2 = vk2 ? layout.vertexPositions[vk2] : undefined;
        return (
          <EdgeSpot
            key={ek}
            edge={edge}
            midpoint={midpoint}
            v1={v1}
            v2={v2}
            isValid={showRoadEdges && validMoves.roadEdges.has(ek)}
            size={layout.size}
            playerColorMap={playerColorMap}
            onClick={() => onEdgeClick(ek)}
          />
        );
      })}

      {/* Port markers — rendered before vertices so they don't block clicks */}
      {portMarkers.map(({ pos, portType, v1, v2 }, i) => (
        <g key={`port-${i}`}>
          {/* Pier lines connecting the marker to the two coastline vertices */}
          <line x1={pos.x} y1={pos.y} x2={v1.x} y2={v1.y} stroke="#c8a96e" strokeWidth={2.5} opacity={0.75} />
          <line x1={pos.x} y1={pos.y} x2={v2.x} y2={v2.y} stroke="#c8a96e" strokeWidth={2.5} opacity={0.75} />
          <PortMarker position={pos} portType={portType} size={layout.size} />
        </g>
      ))}

      {/* Vertices (settlements/cities) */}
      {Object.entries(board.vertices).map(([vk, vertex]) => {
        const pos = layout.vertexPositions[vk];
        if (!pos) return null;
        const isValidSettlement = showSettlementVertices && validMoves.settlementVertices.has(vk);
        const isValidCity = showCityVertices && validMoves.cityVertices.has(vk);
        const isValid = isValidSettlement || isValidCity;
        return (
          <VertexSpot
            key={vk}
            vertex={vertex}
            position={pos}
            isValid={isValid}
            size={layout.size}
            myPlayerId={myPlayerId}
            playerColorMap={playerColorMap}
            onClick={isValid ? () => onVertexClick(vk) : undefined}
          />
        );
      })}
    </svg>
  );
}
