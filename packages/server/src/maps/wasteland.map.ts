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

// 17 productive hexes arranged around the central wasteland
const MAIN_PRODUCTIVE: CubeCoord[] = [
  // Top row
  c(-1,-2), c(0,-2), c(1,-2),
  // Upper-middle row (desert cluster starts at q=2)
  c(-2,-1), c(-1,-1), c(0,-1), c(1,-1),
  // Middle row (desert takes q=1,2,3)
  c(-2, 0), c(-1, 0), c(0, 0),
  // Lower-middle row (desert at q=2)
  c(-2, 1), c(-1, 1), c(0, 1), c(1, 1),
  // Bottom row
  c(-1, 2), c(0, 2), c(1, 2),
]; // 17

// 5-hex desert wasteland core — always fixed in the center-right
const MAIN_DESERT: CubeCoord[] = [
  c(2,-1),
  c(1, 0), c(2, 0), c(3, 0),
  c(2, 1),
]; // 5

// ── Foreign islands (discovery targets) ─────────────────────────────────────

// NE island — 2 hexes, distance 3 from main island
const NE_ISLAND: CubeCoord[] = [
  c(5,-4), c(6,-4),
]; // 2

// SW island — 2 hexes, distance 3 from main island
const SW_ISLAND: CubeCoord[] = [
  c(-5, 3), c(-5, 4),
]; // 2

// ── Full land + sea ──────────────────────────────────────────────────────────

const ALL_PRODUCTIVE: CubeCoord[] = [...MAIN_PRODUCTIVE, ...NE_ISLAND, ...SW_ISLAND]; // 21
const ALL_LAND: CubeCoord[] = [...ALL_PRODUCTIVE, ...MAIN_DESERT]; // 26

const SEA_COORDS = generateSeaHexes(ALL_LAND, 2);

// ── Terrain pool for 21 productive hexes (shuffled by MapGenerator) ──────────

const TERRAIN_POOL: TerrainType[] = [
  ...Array(5).fill('forest'),
  ...Array(4).fill('fields'),
  ...Array(5).fill('pasture'),
  ...Array(4).fill('hills'),
  ...Array(3).fill('mountains'),
] as TerrainType[]; // 21 ✓

// ── Number tokens for 21 productive hexes ────────────────────────────────────

const NUMBER_TOKENS: number[] = [
  2,
  3, 3, 3,
  4, 4,
  5, 5,
  6, 6, 6,
  8, 8, 8,
  9, 9,
  10, 10,
  11, 11,
  12,
]; // 21 ✓

// ── Ports ────────────────────────────────────────────────────────────────────

const PORT_TYPES: PortType[] = [
  'ore_2_1',
  'wood_2_1',
  'sheep_2_1',
  'generic_3_1',
  'generic_3_1',
  'generic_3_1',
  'generic_3_1',
]; // 7

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
    // Desert wasteland core — always fixed
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
