import type { CubeCoord, MapTemplate, PortType, TerrainType } from '@opensettlers/shared';
import { cubeNeighbors, cubeKey } from '@opensettlers/shared';

function c(q: number, r: number): CubeCoord { return { q, r, s: -q - r }; }

function generateSeaHexes(landCoords: CubeCoord[], buffer: number): CubeCoord[] {
  const landSet = new Set(landCoords.map((c) => cubeKey(c)));
  const seaMap = new Map<string, CubeCoord>();
  let frontier = [...landCoords];
  for (let step = 0; step < buffer; step++) {
    const nextFrontier: CubeCoord[] = [];
    for (const coord of frontier) {
      for (const nb of cubeNeighbors(coord)) {
        const key = cubeKey(nb);
        if (!landSet.has(key) && !seaMap.has(key)) {
          seaMap.set(key, nb);
          nextFrontier.push(nb);
        }
      }
    }
    frontier = nextFrontier;
  }
  return Array.from(seaMap.values());
}

// ── Main island ─────────────────────────────────────────────────────────────
//
// The wasteland desert (5 hexes) forms a + cross through the CENTER of the
// island, splitting it visually into left and right productive wings that are
// joined only at the top and bottom rows.
//
//   r=-2:  . . .        ← top row (all productive)
//   r=-1:  . . D . .    ← D = desert cuts in at center
//   r=0:   . . D D D . .  ← widest desert band
//   r=1:   . . D . .    ← D again
//   r=2:  . . .         ← bottom row (all productive)

const MAIN_PRODUCTIVE: CubeCoord[] = [
  // Top row — connects left and right wings
  c(-1,-2), c(0,-2), c(1,-2),
  // Upper rows — left wing + right wing (desert at q=0 row r=-1)
  c(-2,-1), c(-1,-1),   c(1,-1), c(2,-1),
  // Middle rows — left wing + right wing (desert spans q=-1,0,1 at r=0)
  c(-3, 0), c(-2, 0),             c(2, 0), c(3, 0),
  // Lower rows — left wing + right wing (desert at q=0 row r=1)
  c(-2, 1), c(-1, 1),   c(1, 1), c(2, 1),
  // Bottom row — connects left and right wings
  c(-1, 2), c(0, 2), c(1, 2),
]; // 18 productive

// 5-hex cross-shaped wasteland — always fixed in the center
const MAIN_DESERT: CubeCoord[] = [
  c(0,-1),
  c(-1,0), c(0,0), c(1,0),
  c(0, 1),
]; // 5 desert

// ── Foreign islands (discovery targets, 2 hexes each) ───────────────────────
// One in each quadrant; each is ≥ 3 hex-distance from the main island coast.

const NE_ISLAND: CubeCoord[] = [ c(5,-3), c(6,-3) ]; // upper-right
const NW_ISLAND: CubeCoord[] = [ c(-5,-3), c(-4,-3) ]; // upper-left
const SE_ISLAND: CubeCoord[] = [ c(4, 3), c(5, 3) ]; // lower-right
const SW_ISLAND: CubeCoord[] = [ c(-5, 3), c(-5, 4) ]; // lower-left

// ── Full land coords ─────────────────────────────────────────────────────────

const ALL_PRODUCTIVE: CubeCoord[] = [
  ...MAIN_PRODUCTIVE,
  ...NE_ISLAND, ...NW_ISLAND, ...SE_ISLAND, ...SW_ISLAND,
]; // 18 + 2+2+2+2 = 26

const ALL_LAND: CubeCoord[] = [...ALL_PRODUCTIVE, ...MAIN_DESERT]; // 31

const SEA_COORDS = generateSeaHexes(ALL_LAND, 2);

// ── Terrain pool for 26 productive hexes (shuffled by MapGenerator) ──────────

const TERRAIN_POOL: TerrainType[] = [
  ...Array(6).fill('forest'),
  ...Array(5).fill('fields'),
  ...Array(6).fill('pasture'),
  ...Array(5).fill('hills'),
  ...Array(4).fill('mountains'),
] as TerrainType[]; // 26 ✓

// ── Number tokens for 26 productive hexes ────────────────────────────────────

const NUMBER_TOKENS: number[] = [
  2, 2,
  3, 3, 3,
  4, 4, 4,
  5, 5, 5,
  6, 6, 6,
  8, 8, 8,
  9, 9, 9,
  10, 10, 10,
  11, 11,
  12,
]; // 26 ✓

// ── Ports ────────────────────────────────────────────────────────────────────

const PORT_TYPES: PortType[] = [
  'ore_2_1',
  'wood_2_1',
  'sheep_2_1',
  'wheat_2_1',
  'brick_2_1',
  'generic_3_1',
  'generic_3_1',
  'generic_3_1',
  'generic_3_1',
]; // 9

// ── Map template ─────────────────────────────────────────────────────────────

export const WASTELAND_MAP: MapTemplate = {
  id: 'wasteland',
  name: 'Wasteland (Seafarers, 3-4 players)',
  hexes: [
    // Productive hexes — terrain shuffled by MapGenerator
    ...ALL_PRODUCTIVE.map((coord, i) => ({
      coord,
      terrain: TERRAIN_POOL[i] ?? ('forest' as TerrainType),
    })),
    // Desert wasteland cross — always fixed
    ...MAIN_DESERT.map((coord) => ({
      coord,
      terrain: 'desert' as TerrainType,
      locked: true,
    })),
    // Sea — always fixed
    ...SEA_COORDS.map((coord) => ({
      coord,
      terrain: 'sea' as TerrainType,
      locked: true,
    })),
  ],
  numberTokens: NUMBER_TOKENS,
  portTypes: PORT_TYPES,
  playerCounts: [3, 4],
  seafarers: true,
};
