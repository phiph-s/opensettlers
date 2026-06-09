import type { CubeCoord, VertexKey } from '../types/board.js';
import { cubeAdd, cubeKey } from './cube.js';

/**
 * For a pointy-top hex, each of the 6 vertex directions is shared by 3 hexes.
 * Each entry is the two neighbor offsets that share the vertex with the current hex.
 * Direction index corresponds to: 0=NE, 1=E, 2=SE, 3=SW, 4=W, 5=NW (clockwise from top-right)
 */
const VERTEX_NEIGHBOR_OFFSETS: [CubeCoord, CubeCoord][] = [
  [{ q: 1, r: -1, s: 0 }, { q: 0, r: -1, s: 1 }], // NE
  [{ q: 1, r: 0, s: -1 }, { q: 1, r: -1, s: 0 }], // E
  [{ q: 0, r: 1, s: -1 }, { q: 1, r: 0, s: -1 }], // SE
  [{ q: -1, r: 1, s: 0 }, { q: 0, r: 1, s: -1 }], // SW
  [{ q: -1, r: 0, s: 1 }, { q: -1, r: 1, s: 0 }], // W
  [{ q: 0, r: -1, s: 1 }, { q: -1, r: 0, s: 1 }], // NW
];

/** Builds a canonical vertex key from a hex coord and vertex direction index (0-5) */
export function vertexKey(coord: CubeCoord, dir: number): VertexKey {
  const [off1, off2] = VERTEX_NEIGHBOR_OFFSETS[dir % 6]!;
  const keys = [cubeKey(coord), cubeKey(cubeAdd(coord, off1)), cubeKey(cubeAdd(coord, off2))];
  keys.sort();
  return keys.join('|');
}

/** Returns all 6 vertex keys for a hex */
export function hexVertexKeys(coord: CubeCoord): VertexKey[] {
  return Array.from({ length: 6 }, (_, i) => vertexKey(coord, i));
}
