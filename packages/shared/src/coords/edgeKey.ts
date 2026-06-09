import type { CubeCoord, EdgeKey } from '../types/board.js';
import { cubeAdd, cubeKey } from './cube.js';

/** The 6 neighbor offsets in the same order as CUBE_DIRECTIONS */
const EDGE_NEIGHBOR_OFFSETS: CubeCoord[] = [
  { q: 1, r: -1, s: 0 },
  { q: 1, r: 0, s: -1 },
  { q: 0, r: 1, s: -1 },
  { q: -1, r: 1, s: 0 },
  { q: -1, r: 0, s: 1 },
  { q: 0, r: -1, s: 1 },
];

/** Canonical edge key between two adjacent hexes */
export function edgeKey(a: CubeCoord, b: CubeCoord): EdgeKey {
  const keys = [cubeKey(a), cubeKey(b)];
  keys.sort();
  return keys.join('|');
}

/** Returns the 6 edge keys for a hex (one per neighbor direction) */
export function hexEdgeKeys(coord: CubeCoord): EdgeKey[] {
  return EDGE_NEIGHBOR_OFFSETS.map((off) => edgeKey(coord, cubeAdd(coord, off)));
}
