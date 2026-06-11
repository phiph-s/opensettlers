import type { CubeCoord, MapTemplate, PortType, TerrainType } from '@opensettlers/shared';
import { cubeNeighbors, cubeKey } from '@opensettlers/shared';

function c(q: number, r: number): CubeCoord { return { q, r, s: -q - r }; }

// ── Main island (30 hexes) ───────────────────────────────────────────────────
// Same row shape as the large map, shifted right by 4 (q += 4)
// Widest row at r=0 spans q=2..7
const MAIN_ISLAND: CubeCoord[] = [
  // r=-3  (3 hexes)
  c(5,-3), c(6,-3), c(7,-3),
  // r=-2  (4 hexes)
  c(4,-2), c(5,-2), c(6,-2), c(7,-2),
  // r=-1  (5 hexes)
  c(3,-1), c(4,-1), c(5,-1), c(6,-1), c(7,-1),
  // r=0   (6 hexes)
  c(2,0),  c(3,0),  c(4,0),  c(5,0),  c(6,0),  c(7,0),
  // r=1   (5 hexes)
  c(2,1),  c(3,1),  c(4,1),  c(5,1),  c(6,1),
  // r=2   (4 hexes)
  c(2,2),  c(3,2),  c(4,2),  c(5,2),
  // r=3   (3 hexes)
  c(2,3),  c(3,3),  c(4,3),
]; // 30 ✓

// Northeastern coast — hidden until explored via roads
// (rightmost hexes of rows -3, -2, -1 — indices 2, 6, 11 in MAIN_ISLAND)
const CLOUD_COORDS: CubeCoord[] = [c(7,-3), c(7,-2), c(7,-1)];

// ── Gold island (4 hexes, to the left) ──────────────────────────────────────
// T-shape:  c(-5,-1) top, c(-6,0) left, c(-5,0) center (gold), c(-4,0) right
// Nearest hex c(-4,0) is cube-distance 6 from main island's nearest c(2,0)
// → 5 sea hexes between the two islands
const GOLD_HEX: CubeCoord = c(-5, 0);          // locked gold, gets a number token
const SMALL_ISLAND_NORMAL: CubeCoord[] = [
  c(-5,-1), c(-6,0), c(-4,0),
]; // 3 normal terrain hexes

// ── Sea ─────────────────────────────────────────────────────────────────────
const LAND_COORDS: CubeCoord[] = [
  ...MAIN_ISLAND,
  GOLD_HEX,
  ...SMALL_ISLAND_NORMAL,
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

// ── Terrain pool (33 entries) ────────────────────────────────────────────────
// Covers 30 main island hexes + 3 small island normal hexes (gold is locked)
const TERRAIN_POOL: TerrainType[] = [
  ...Array(7).fill('forest'),
  ...Array(7).fill('fields'),
  ...Array(6).fill('pasture'),
  ...Array(6).fill('hills'),
  ...Array(6).fill('mountains'),
  ...Array(1).fill('desert'),
] as TerrainType[]; // 33 ✓

// ── Number tokens (33) ───────────────────────────────────────────────────────
// One per non-desert, non-sea hex (32 from pool + 1 gold = 33)
const NUMBER_TOKENS: number[] = [
  2, 2,
  3, 3, 3,
  4, 4, 4, 4,
  5, 5, 5, 5,
  6, 6, 6, 6,
  8, 8, 8, 8,
  9, 9, 9, 9,
  10, 10, 10,
  11, 11, 11,
  12, 12,
]; // 2+3+4+4+4+4+4+3+3+2 = 33 ✓

const PORT_TYPES: PortType[] = [
  'ore_2_1', 'wood_2_1', 'brick_2_1', 'wheat_2_1', 'sheep_2_1',
  'generic_3_1', 'generic_3_1', 'generic_3_1',
  'generic_3_1', 'generic_3_1',
]; // 10 ports

export const EXPEDITION_MAP: MapTemplate = {
  id: 'expedition',
  name: 'Expedition (gold isle + exploration, 3-6 players)',
  hexes: [
    // Gold island — gold hex locked, normal hexes from pool
    { coord: GOLD_HEX, terrain: 'gold' as TerrainType, locked: true },
    ...SMALL_ISLAND_NORMAL.map((coord, i) => ({
      coord,
      terrain: TERRAIN_POOL[30 + i] ?? ('forest' as TerrainType),
    })),
    // Main island — terrain from pool[0..29]; cloud hexes get terrain assigned here
    // (GameEngine hides them as 'clouds' using cloudedCoords)
    ...MAIN_ISLAND.map((coord, i) => ({
      coord,
      terrain: TERRAIN_POOL[i] ?? ('forest' as TerrainType),
    })),
    // Sea
    ...SEA_COORDS.map((coord) => ({
      coord,
      terrain: 'sea' as TerrainType,
      locked: true,
    })),
  ],
  cloudedCoords: CLOUD_COORDS,
  numberTokens: NUMBER_TOKENS,
  portTypes: PORT_TYPES,
  playerCounts: [3, 4, 5, 6],
  seafarers: true,
};
