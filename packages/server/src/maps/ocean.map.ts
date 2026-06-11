import type { CubeCoord, MapTemplate, PortType, TerrainType } from '@opensettlers/shared';
import { cubeNeighbors, cubeKey } from '@opensettlers/shared';

function c(q: number, r: number): CubeCoord { return { q, r, s: -q - r }; }

// ── Large islands (8-10 hexes) ──────────────────────────────────────────────

// Island A — NW, 9 hexes
const ISLAND_A: CubeCoord[] = [
  c(-9,-4),
  c(-8,-5), c(-8,-4), c(-8,-3),
  c(-7,-5), c(-7,-4), c(-7,-3),
  c(-6,-5), c(-6,-4),
];

// Island B — NE, 9 hexes
const ISLAND_B: CubeCoord[] = [
  c(4,-5),
  c(5,-6), c(5,-5), c(5,-4),
  c(6,-6), c(6,-5), c(6,-4),
  c(7,-6), c(7,-5),
];

// Island C — SW, 10 hexes
const ISLAND_C: CubeCoord[] = [
  c(-9,3), c(-8,3), c(-8,4),
  c(-7,3), c(-7,4), c(-7,5),
  c(-6,3), c(-6,4), c(-6,5),
  c(-5,4),
];

// Island D — SE, 10 hexes
const ISLAND_D: CubeCoord[] = [
  c(4,3), c(4,4),
  c(5,2), c(5,3), c(5,4),
  c(6,2), c(6,3), c(6,4),
  c(7,2), c(7,3),
];

// ── Small islands (3-4 hexes) ────────────────────────────────────────────────

// Island E — N center, 4 hexes
const ISLAND_E: CubeCoord[] = [
  c(-1,-7), c(0,-7), c(1,-7),
  c(0,-6),
];

// Island F — W edge, 3 hexes
const ISLAND_F: CubeCoord[] = [
  c(-11,-1), c(-11,0), c(-10,-1),
];

// Island G — center, 4 hexes
const ISLAND_G: CubeCoord[] = [
  c(-1,-1), c(0,-1),
  c(-1,0),  c(0,0),
];

// Island H — E edge, 3 hexes
const ISLAND_H: CubeCoord[] = [
  c(10,-1), c(10,0), c(11,0),
];

// Island I — S center, 4 hexes
const ISLAND_I: CubeCoord[] = [
  c(-1,6), c(0,6), c(1,6),
  c(0,7),
];

// Island J — far NE, 3 hexes
const ISLAND_J: CubeCoord[] = [
  c(10,-4), c(11,-5), c(11,-4),
];

// Total: 9+9+10+10+4+3+4+3+4+3 = 59 land hexes
const LAND_COORDS: CubeCoord[] = [
  ...ISLAND_A, ...ISLAND_B, ...ISLAND_C, ...ISLAND_D,
  ...ISLAND_E, ...ISLAND_F, ...ISLAND_G, ...ISLAND_H,
  ...ISLAND_I, ...ISLAND_J,
];

function generateSeaHexes(landCoords: CubeCoord[], buffer: number): CubeCoord[] {
  const landSet = new Set(landCoords.map((c) => cubeKey(c)));
  const seaMap = new Map<string, CubeCoord>();
  let frontier = [...landCoords];
  for (let step = 0; step < buffer; step++) {
    const nextFrontier: CubeCoord[] = [];
    for (const coord of frontier) {
      for (const neighbor of cubeNeighbors(coord)) {
        const key = cubeKey(neighbor);
        if (!landSet.has(key) && !seaMap.has(key)) {
          seaMap.set(key, neighbor);
          nextFrontier.push(neighbor);
        }
      }
    }
    frontier = nextFrontier;
  }
  return Array.from(seaMap.values());
}

const SEA_COORDS = generateSeaHexes(LAND_COORDS, 2);

// 59 terrain entries — 2 deserts, rest shuffled
const TERRAIN_POOL: TerrainType[] = [
  ...Array(12).fill('forest'),
  ...Array(12).fill('fields'),
  ...Array(12).fill('pasture'),
  ...Array(11).fill('hills'),
  ...Array(10).fill('mountains'),
  ...Array(2).fill('desert'),
] as TerrainType[]; // 59 ✓

// 57 number tokens (59 hexes − 2 deserts)
const NUMBER_TOKENS: number[] = [
  2, 2, 2, 2,
  3, 3, 3, 3, 3,
  4, 4, 4, 4, 4, 4,
  5, 5, 5, 5, 5, 5, 5,
  6, 6, 6, 6, 6, 6, 6,
  8, 8, 8, 8, 8, 8, 8,
  9, 9, 9, 9, 9, 9, 9,
  10, 10, 10, 10, 10, 10,
  11, 11, 11, 11, 11,
  12, 12, 12,
]; // 4+5+6+7+7+7+7+6+5+3 = 57 ✓

const PORT_TYPES: PortType[] = [
  'ore_2_1', 'wood_2_1', 'brick_2_1', 'wheat_2_1', 'sheep_2_1',
  'generic_3_1', 'generic_3_1', 'generic_3_1', 'generic_3_1',
  'generic_3_1', 'generic_3_1', 'generic_3_1',
]; // 12 ports

export const OCEAN_MAP: MapTemplate = {
  id: 'ocean',
  name: 'Ocean (10 islands, 2-6 players)',
  hexes: [
    ...LAND_COORDS.map((coord, i) => ({
      coord,
      terrain: TERRAIN_POOL[i] ?? 'desert' as TerrainType,
    })),
    ...SEA_COORDS.map((coord) => ({
      coord,
      terrain: 'sea' as TerrainType,
      locked: true,
    })),
  ],
  numberTokens: NUMBER_TOKENS,
  portTypes: PORT_TYPES,
  playerCounts: [2, 3, 4, 5, 6],
  seafarers: true,
};
