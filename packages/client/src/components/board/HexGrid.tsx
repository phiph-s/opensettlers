import React, { useCallback, useMemo, useState } from 'react';
import type { GameState, EdgeKey, HexKey, VertexKey, PortType } from '@opensettlers/shared';
import { cubeKey, hexPolygonPoints, cubeToPixel, validShipMoveDestinations } from '@opensettlers/shared';
import { useBoardLayout } from '../../hooks/useBoardLayout.js';
import { usePanZoom } from './PanZoomBoard.js';
import type { ValidMoves } from '../../hooks/useValidMoves.js';
import { HexTile } from './HexTile.js';
import { VertexSpot } from './VertexSpot.js';
import { EdgeSpot } from './EdgeSpot.js';
import { RobberSpot } from './RobberSpot.js';
import { PortMarker } from './PortMarker.js';
import { TerrainPatterns } from './TerrainPatterns.js';
import { socket } from '../../socket.js';

const COLOR_HEX: Record<string, string> = {
  red: '#e63946', blue: '#457b9d', orange: '#f4a261', black: '#2c2c2c',
  green: '#2ecc71', purple: '#9b59b6', yellow: '#e8c730', pink: '#e91e8c',
};

interface Props {
  gameState: GameState;
  myPlayerId: string | null;
  validMoves: ValidMoves;
  buildMode: 'road' | 'settlement' | 'city' | 'ship' | null;
  onBuildModeChange: (mode: 'road' | 'settlement' | 'city' | 'ship' | null) => void;
}

export function HexGrid({ gameState, myPlayerId, validMoves, buildMode, onBuildModeChange }: Props) {
  const { board, phase } = gameState;
  const layout = useBoardLayout(board, 70);
  const panZoom = usePanZoom();
  const [shipMoveOrigin, setShipMoveOrigin] = useState<EdgeKey | null>(null);
  const prevPhaseRef = React.useRef<string | null>(null);
  if (gameState.phase !== prevPhaseRef.current) {
    prevPhaseRef.current = gameState.phase;
    if (shipMoveOrigin !== null) setShipMoveOrigin(null);
  }

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

  // Compute valid ship move destinations when an origin is selected
  const shipMoveDestSet = useMemo(() => {
    if (!shipMoveOrigin || !myPlayerId) return new Set<EdgeKey>();
    return new Set(validShipMoveDestinations(board, myPlayerId, shipMoveOrigin, gameState.pirateHexKey));
  }, [shipMoveOrigin, board, myPlayerId, gameState.pirateHexKey]);

  const onEdgeClick = useCallback((ek: EdgeKey, isShip?: boolean) => {
    if (phase === 'SETUP_PLACE_ROAD') {
      if (isShip) {
        socket.emit('game:build_ship', { edgeKey: ek });
      } else {
        socket.emit('game:place_road', { edgeKey: ek });
      }
    } else if (phase === 'DEV_ROAD_BUILDING') {
      if (isShip) {
        socket.emit('game:build_ship', { edgeKey: ek });
      } else {
        socket.emit('game:place_road', { edgeKey: ek });
      }
    } else if (phase === 'BUILD_PHASE') {
      // Ship move: click origin → then click destination
      if (validMoves.shipMoveOrigins.has(ek)) {
        setShipMoveOrigin((prev) => prev === ek ? null : ek);
        return;
      }
      if (shipMoveOrigin && shipMoveDestSet.has(ek)) {
        socket.emit('game:move_ship', { fromEdgeKey: shipMoveOrigin, toEdgeKey: ek });
        setShipMoveOrigin(null);
        return;
      }
      if (buildMode === 'ship' || isShip) {
        socket.emit('game:build_ship', { edgeKey: ek });
        onBuildModeChange(null);
      } else {
        socket.emit('game:build_road', { edgeKey: ek });
        onBuildModeChange(null);
      }
    }
  }, [phase, buildMode, onBuildModeChange, validMoves.shipMoveOrigins, shipMoveDestSet, shipMoveOrigin]);

  const onHexClick = useCallback((hk: HexKey) => {
    if (phase === 'ROBBER_PLACEMENT' && validMoves.robberHexes.has(hk)) {
      const hex = board.hexes[hk];
      if (hex) socket.emit('game:move_robber', { hexCoord: hex.coord });
    }
  }, [phase, board, validMoves.robberHexes]);

  // During setup/forced phases show all valid spots; in BUILD_PHASE only show the selected type
  const isSetupSettlement = phase === 'SETUP_PLACE_SETTLEMENT';
  const isSetupRoad = phase === 'SETUP_PLACE_ROAD' || phase === 'DEV_ROAD_BUILDING';
  const showRoadEdges = isSetupRoad || (phase === 'BUILD_PHASE' && buildMode === 'road');
  const showShipEdges = isSetupRoad || (phase === 'BUILD_PHASE' && buildMode === 'ship');
  const showSettlementVertices = isSetupSettlement || (phase === 'BUILD_PHASE' && buildMode === 'settlement');
  const showCityVertices = phase === 'BUILD_PHASE' && buildMode === 'city';

  const activeId = gameState.players[gameState.activePlayerIndex]?.id;

  // Compensate zoom so buildings/roads/ports never shrink below their natural size
  const uiScale = panZoom ? Math.max(1, 1 / panZoom.transform.scale) : 1;

  // Group port vertices into pairs by proximity, place marker at center of adjacent sea hex
  const portMarkers = useMemo(() => {
    const portVerts: Array<{ x: number; y: number; portType: PortType; vk: string }> = [];
    for (const [vk, vertex] of Object.entries(board.vertices)) {
      if (!vertex.port) continue;
      const pos = layout.vertexPositions[vk];
      if (!pos) continue;
      portVerts.push({ x: pos.x, y: pos.y, portType: vertex.port, vk });
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
          // Find the sea hex adjacent to both vertices (the one not in board.hexes or terrain === 'sea')
          const hexKeysA = new Set(a.vk.split('|'));
          const seaHk = b.vk.split('|').find(
            (hk) => hexKeysA.has(hk) && (!board.hexes[hk] || board.hexes[hk]?.terrain === 'sea'),
          );
          let pos: { x: number; y: number };
          if (seaHk) {
            const [q, r, s] = seaHk.split(',').map(Number);
            const seaCenter = cubeToPixel({ q: q!, r: r!, s: s! }, layout.size);
            // Lerp toward the shared edge midpoint (land-sea border) so ports sit closer to land
            const edgeMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            const t = 0.55;
            pos = { x: seaCenter.x + (edgeMid.x - seaCenter.x) * t, y: seaCenter.y + (edgeMid.y - seaCenter.y) * t };
          } else {
            // Fallback: midpoint pushed outward from centroid
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            const len = Math.sqrt(mx * mx + my * my);
            const push = layout.size * 1.2;
            pos = len > 0 ? { x: mx + (mx / len) * push, y: my + (my / len) * push } : { x: mx, y: my };
          }
          result.push({ pos, portType: a.portType, v1: { x: a.x, y: a.y }, v2: { x: b.x, y: b.y } });
          used.add(i); used.add(j); matched = true; break;
        }
      }
      if (!matched) { used.add(i); }
    }
    return result;
  }, [board.vertices, board.hexes, layout]);

  // Compute effective viewBox: manipulate directly instead of CSS scale (preserves SVG resolution)
  let effectiveViewBox = layout.viewBox;
  if (panZoom) {
    const { transform: { x, y, scale }, containerRef } = panZoom;
    const W = containerRef.current?.clientWidth ?? 0;
    const H = containerRef.current?.clientHeight ?? 0;
    if (W > 0 && H > 0) {
      const parts = layout.viewBox.split(' ').map(Number);
      const [nvx, nvy, nvw, nvh] = parts as [number, number, number, number];
      const evw = nvw / scale;
      const evh = nvh / scale;
      const evx = nvx - x * nvw / (W * scale);
      const evy = nvy - y * nvh / (H * scale);
      effectiveViewBox = `${evx} ${evy} ${evw} ${evh}`;
    }
  }

  return (
    <svg
      viewBox={effectiveViewBox}
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        <TerrainPatterns />
        {/* Hex tile shadow: outer drop shadow behind each tile */}
        <filter id="hex-tile-fx" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.55" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Sandy island base — slightly inflated polygon behind each land hex */}
      {Object.entries(board.hexes).map(([hk, hex]) => {
        if (hex.terrain === 'sea') return null;
        const center = layout.hexCenters[hk];
        if (!center) return null;
        return (
          <polygon
            key={`sandy-${hk}`}
            points={hexPolygonPoints(center, layout.size * 1.05)}
            fill="#e8d4a0"
            stroke="none"
          />
        );
      })}

      {/* Sea hex overlays — visible in seafarers maps as transparent tinted hexagons */}
      {gameState.seafarers && Object.entries(board.hexes).map(([hk, hex]) => {
        if (hex.terrain !== 'sea') return null;
        const center = layout.hexCenters[hk];
        if (!center) return null;
        const isRobberTarget = validMoves.robberHexes.has(hk);
        const isPirate = gameState.pirateHexKey === hk;
        return (
          <g key={`sea-${hk}`} onClick={isRobberTarget ? () => onHexClick(hk) : undefined} style={isRobberTarget ? { cursor: 'pointer' } : undefined}>
            <polygon
              points={hexPolygonPoints(center, layout.size * 0.92)}
              fill={isRobberTarget ? 'rgba(80,160,220,0.18)' : 'rgba(26,90,138,0.22)'}
              stroke={isRobberTarget ? 'rgba(80,160,220,0.55)' : 'rgba(26,90,138,0.35)'}
              strokeWidth={isRobberTarget ? 2 : 1}
              strokeDasharray={isRobberTarget ? '6 3' : undefined}
            />
            {isPirate && <PiratePiece cx={center.x} cy={center.y} r={layout.size * 0.26} uiScale={uiScale} />}
          </g>
        );
      })}

      {/* Hex tiles (sea hexes skipped — animated ocean background shows through) */}
      {Object.entries(board.hexes).map(([hk, hex]) => {
        if (hex.terrain === 'sea') return null;
        const center = layout.hexCenters[hk];
        if (!center) return null;
        const rolledSum = gameState.diceRoll ? gameState.diceRoll[0] + gameState.diceRoll[1] : null;
        return (
          <g key={hk}>
            <HexTile hex={hex} center={center} size={layout.size} rolledNumber={rolledSum} uiScale={uiScale} />
            {validMoves.robberHexes.has(hk) && (
              <RobberSpot
                hex={hex}
                center={center}
                size={layout.size}
                isValidTarget={true}
                uiScale={uiScale}
                onClick={() => onHexClick(hk)}
              />
            )}
          </g>
        );
      })}

      {/* Edges (roads and ships) */}
      {Object.entries(board.edges).map(([ek, edge]) => {
        const midpoint = layout.edgeMidpoints[ek];
        if (!midpoint) return null;
        const [vk1, vk2] = edge.adjacentVertexKeys;
        const v1 = vk1 ? layout.vertexPositions[vk1] : undefined;
        const v2 = vk2 ? layout.vertexPositions[vk2] : undefined;
        const isShipBuild = showShipEdges && (validMoves.shipEdges.has(ek) || validMoves.setupShipEdges.has(ek));
        const isMoveOrigin = validMoves.shipMoveOrigins.has(ek);
        const isMoveSelected = shipMoveOrigin === ek;
        const isMoveDest = !!shipMoveOrigin && shipMoveDestSet.has(ek);
        const isShipAction = isShipBuild || edge.ship != null || isMoveOrigin || isMoveDest;
        return (
          <EdgeSpot
            key={ek}
            edge={edge}
            midpoint={midpoint}
            v1={v1}
            v2={v2}
            isValid={showRoadEdges && validMoves.roadEdges.has(ek)}
            isValidShip={isShipBuild || isMoveDest}
            isMoveOrigin={isMoveOrigin}
            isMoveSelected={isMoveSelected}
            size={layout.size}
            uiScale={uiScale}
            playerColorMap={playerColorMap}
            onClick={() => onEdgeClick(ek, isShipAction)}
          />
        );
      })}

      {/* Port markers — rendered before vertices so they don't block clicks */}
      {portMarkers.map(({ pos, portType, v1, v2 }, i) => (
        <g key={`port-${i}`}>
          {[v1, v2].map((v, vi) => {
            const dx = v.x - pos.x, dy = v.y - pos.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 1) return null;
            const ux = dx / len, uy = dy / len;
            const px = -uy, py = ux;
            const railOff = layout.size * 0.055;
            const plankSpacing = layout.size * 0.14;
            const plankHalf = railOff + layout.size * 0.022;
            const planks = [];
            for (let d = plankSpacing * 0.5; d < len - plankSpacing * 0.25; d += plankSpacing) {
              const cx = pos.x + ux * d, cy = pos.y + uy * d;
              planks.push(
                <line key={d}
                  x1={cx - px * plankHalf} y1={cy - py * plankHalf}
                  x2={cx + px * plankHalf} y2={cy + py * plankHalf}
                  stroke="#c8904a" strokeWidth={layout.size * 0.045}
                  strokeLinecap="butt"
                />
              );
            }
            return (
              <g key={vi}>
                {planks}
                {/* Side rails drawn on top of planks */}
                <line
                  x1={pos.x + px * railOff} y1={pos.y + py * railOff}
                  x2={v.x + px * railOff} y2={v.y + py * railOff}
                  stroke="#5a3010" strokeWidth={layout.size * 0.03} opacity={0.9}
                />
                <line
                  x1={pos.x - px * railOff} y1={pos.y - py * railOff}
                  x2={v.x - px * railOff} y2={v.y - py * railOff}
                  stroke="#5a3010" strokeWidth={layout.size * 0.03} opacity={0.9}
                />
              </g>
            );
          })}
          <PortMarker position={pos} portType={portType} size={layout.size} uiScale={uiScale} />
        </g>
      ))}

      {/* Vertices (settlements/cities) */}
      {(() => {
        const discoveryVerts = gameState.discoverySettlements
          ? new Set(Object.values(gameState.discoverySettlements))
          : null;
        return Object.entries(board.vertices).map(([vk, vertex]) => {
          const pos = layout.vertexPositions[vk];
          if (!pos) return null;
          const isValidSettlement = showSettlementVertices && validMoves.settlementVertices.has(vk);
          const isValidCity = showCityVertices && validMoves.cityVertices.has(vk);
          const isValid = isValidSettlement || isValidCity;
          const isDiscovery = discoveryVerts?.has(vk) ?? false;
          const badgeW = layout.size * 0.44 * uiScale;
          const badgeH = layout.size * 0.26 * uiScale;
          const badgeY = -layout.size * 0.62 * uiScale;
          const badge = isDiscovery ? (
            <g key={`disc-${vk}`} transform={`translate(${pos.x}, ${pos.y})`} style={{ pointerEvents: 'none' }}>
              <rect
                x={-badgeW / 2}
                y={badgeY}
                width={badgeW}
                height={badgeH}
                rx={layout.size * 0.07 * uiScale}
                fill="#d4a017"
                stroke="#fff"
                strokeWidth={layout.size * 0.025 * uiScale}
              />
              <text
                x={0}
                y={badgeY + badgeH / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize={layout.size * 0.18 * uiScale}
                fontWeight="bold"
                fontFamily="'Cinzel', Georgia, serif"
              >+2</text>
            </g>
          ) : null;
          return (
            <React.Fragment key={vk}>
              <VertexSpot
                vertex={vertex}
                position={pos}
                isValid={isValid}
                size={layout.size}
                uiScale={uiScale}
                myPlayerId={myPlayerId}
                playerColorMap={playerColorMap}
                onClick={isValid ? () => onVertexClick(vk) : undefined}
              />
              {badge}
            </React.Fragment>
          );
        });
      })()}
    </svg>
  );
}

function PiratePiece({ cx, cy, r, uiScale }: { cx: number; cy: number; r: number; uiScale: number }) {
  const s = r * uiScale;
  return (
    <g transform={`translate(${cx}, ${cy})`} style={{ pointerEvents: 'none' }}>
      {/* Black flag pole */}
      <line x1={s * 0.1} y1={-s * 1.1} x2={s * 0.1} y2={s * 0.3} stroke="#2c1a0e" strokeWidth={s * 0.14} strokeLinecap="round" />
      {/* Jolly Roger flag */}
      <polygon
        points={`${s * 0.1},${-s * 1.1} ${s * 0.85},${-s * 0.85} ${s * 0.1},${-s * 0.6}`}
        fill="#1a1a1a"
        stroke="#444"
        strokeWidth={s * 0.04}
      />
      {/* Skull on flag */}
      <circle cx={s * 0.45} cy={-s * 0.87} r={s * 0.13} fill="white" />
      {/* Ship hull */}
      <path
        d={`M ${-s * 0.85} ${s * 0.05} Q ${-s * 0.9} ${s * 0.5} 0 ${s * 0.55} Q ${s * 0.9} ${s * 0.5} ${s * 0.85} ${s * 0.05} L ${s * 0.6} ${-s * 0.15} L ${-s * 0.6} ${-s * 0.15} Z`}
        fill="#2c1a0e"
        stroke="#5a3010"
        strokeWidth={s * 0.07}
      />
    </g>
  );
}
