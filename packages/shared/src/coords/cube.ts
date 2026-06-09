import type { CubeCoord, HexKey } from '../types/board.js';

export function cubeKey(c: CubeCoord): HexKey {
  return `${c.q},${c.r},${c.s}`;
}

export function parseCubeKey(key: HexKey): CubeCoord {
  const [q, r, s] = key.split(',').map(Number);
  return { q: q!, r: r!, s: s! };
}

const CUBE_DIRECTIONS: CubeCoord[] = [
  { q: 1, r: -1, s: 0 },
  { q: 1, r: 0, s: -1 },
  { q: 0, r: 1, s: -1 },
  { q: -1, r: 1, s: 0 },
  { q: -1, r: 0, s: 1 },
  { q: 0, r: -1, s: 1 },
];

export function cubeAdd(a: CubeCoord, b: CubeCoord): CubeCoord {
  return { q: a.q + b.q, r: a.r + b.r, s: a.s + b.s };
}

export function cubeNeighbors(c: CubeCoord): CubeCoord[] {
  return CUBE_DIRECTIONS.map((d) => cubeAdd(c, d));
}

export function cubeDistance(a: CubeCoord, b: CubeCoord): number {
  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s));
}

/** Returns all coords in a ring at the given radius */
export function cubeRing(center: CubeCoord, radius: number): CubeCoord[] {
  if (radius === 0) return [center];
  const results: CubeCoord[] = [];
  let cur = cubeAdd(center, {
    q: CUBE_DIRECTIONS[4]!.q * radius,
    r: CUBE_DIRECTIONS[4]!.r * radius,
    s: CUBE_DIRECTIONS[4]!.s * radius,
  });
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < radius; j++) {
      results.push(cur);
      cur = cubeAdd(cur, CUBE_DIRECTIONS[i]!);
    }
  }
  return results;
}

/** Returns coords in spiral order: center first, then rings 1..radius */
export function cubeSpiral(center: CubeCoord, radius: number): CubeCoord[] {
  const results: CubeCoord[] = [center];
  for (let r = 1; r <= radius; r++) {
    results.push(...cubeRing(center, r));
  }
  return results;
}

export function cubeEquals(a: CubeCoord, b: CubeCoord): boolean {
  return a.q === b.q && a.r === b.r && a.s === b.s;
}
