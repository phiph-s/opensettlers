import { useMemo } from 'react';
import { cubeToPixel, hexCorners } from '@opensettlers/shared';
import type { GameBoard, HexKey, VertexKey, EdgeKey } from '@opensettlers/shared';
import type { Point } from '@opensettlers/shared';

export interface BoardLayout {
  hexCenters: Record<HexKey, Point>;
  vertexPositions: Record<VertexKey, Point>;
  edgeMidpoints: Record<EdgeKey, Point>;
  size: number;
  viewBox: string;
}

export function useBoardLayout(board: GameBoard, size = 70): BoardLayout {
  return useMemo(() => {
    const hexCenters: Record<HexKey, Point> = {};
    const vertexPositions: Record<VertexKey, Point> = {};
    const edgeMidpoints: Record<EdgeKey, Point> = {};

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const [hk, hex] of Object.entries(board.hexes)) {
      const center = cubeToPixel(hex.coord, size);
      hexCenters[hk] = center;
      const corners = hexCorners(center, size);
      minX = Math.min(minX, ...corners.map((c) => c.x));
      minY = Math.min(minY, ...corners.map((c) => c.y));
      maxX = Math.max(maxX, ...corners.map((c) => c.x));
      maxY = Math.max(maxY, ...corners.map((c) => c.y));
    }

    // Compute vertex pixel positions by averaging all 3 cube coords from the vertex key
    for (const vk of Object.keys(board.vertices)) {
      const parts = vk.split('|');
      const centers = parts.map((part) => {
        const [q, r, s] = part.split(',').map(Number);
        return cubeToPixel({ q: q!, r: r!, s: s! }, size);
      });
      vertexPositions[vk] = {
        x: centers.reduce((sum, c) => sum + c.x, 0) / centers.length,
        y: centers.reduce((sum, c) => sum + c.y, 0) / centers.length,
      };
    }

    // Compute edge midpoints by averaging their two vertex positions
    for (const [ek, edge] of Object.entries(board.edges)) {
      const [vk1, vk2] = edge.adjacentVertexKeys;
      const p1 = vertexPositions[vk1];
      const p2 = vertexPositions[vk2];
      if (p1 && p2) {
        edgeMidpoints[ek] = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      }
    }

    const pad = size * 1.8; // extra room for port markers pushed outside the board
    const vbX = minX - pad;
    const vbY = minY - pad;
    const vbW = maxX - minX + pad * 2;
    const vbH = maxY - minY + pad * 2;

    return {
      hexCenters,
      vertexPositions,
      edgeMidpoints,
      size,
      viewBox: `${vbX} ${vbY} ${vbW} ${vbH}`,
    };
  }, [board, size]);
}
