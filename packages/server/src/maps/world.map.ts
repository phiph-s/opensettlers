import type { CubeCoord, MapTemplate, PortType, TerrainType } from '@opensettlers/shared';
import { cubeNeighbors, cubeKey } from '@opensettlers/shared';

function c(q: number, r: number): CubeCoord { return { q, r, s: -q - r }; }

// North America
const NORTH_AMERICA: CubeCoord[] = [
  c(-11,-5), c(-10,-5), c(-9,-5),                          // Northern Canada (3)
  c(-11,-4), c(-10,-4), c(-9,-4), c(-8,-4),                // Canada (4)
  c(-10,-3), c(-9,-3), c(-8,-3),                           // USA (3)
  c(-9,-2), c(-8,-2), c(-7,-2),                            // Southern USA (3)
  c(-8,-1), c(-7,-1),                                      // Mexico (2)
]; // 15

const GREENLAND: CubeCoord[] = [
  c(-6,-6), c(-5,-6),
]; // 2

const EUROPE: CubeCoord[] = [
  c(-3,-7), c(-2,-7), c(-1,-7), c(0,-7),   // Scandinavia (4)
  c(-2,-6), c(-1,-6), c(0,-6),             // Western Europe (3)
  c(-1,-5), c(0,-5),                        // Southern Europe (2)
]; // 9

// Asia + Middle East (connected landmass)
const ASIA: CubeCoord[] = [
  c(1,-7), c(2,-7), c(3,-7), c(4,-7), c(5,-7),             // Siberia (5)
  c(1,-6), c(2,-6), c(3,-6), c(4,-6), c(5,-6), c(6,-6),   // Central Asia (6)
  c(2,-5), c(3,-5), c(4,-5), c(5,-5), c(6,-5),             // South Asia (5)
  c(4,-4), c(5,-4), c(6,-4),                               // SE Asia mainland (3)
  c(3,-3), c(4,-3), c(5,-3), c(6,-3), c(7,-3),             // Middle East + Far East (5)
]; // 24

// Africa — island south of Europe (separated by sea)
const AFRICA: CubeCoord[] = [
  c(-1,-3), c(0,-3), c(1,-3),   // North Africa (3)
  c(-1,-2), c(0,-2), c(1,-2),   // Central Africa (3)
  c(0,-1), c(1,-1),             // Southern Africa (2)
  c(0,0),                        // Cape (1)
]; // 9

// Caribbean: bridge between NA and SA
const CARIBBEAN: CubeCoord[] = [
  c(-6,0), c(-5,0), c(-4,0),
]; // 3

// South America
const SOUTH_AMERICA: CubeCoord[] = [
  c(-9,1), c(-8,1), c(-7,1),
  c(-9,2), c(-8,2), c(-7,2), c(-6,2),
  c(-8,3), c(-7,3), c(-6,3),
  c(-7,4),
]; // 11

// SE Asian island chain
const SE_ASIA_ISLANDS: CubeCoord[] = [
  c(7,0), c(8,0), c(9,0),
  c(8,1),
]; // 4

// Australia — smaller (was 7, now 4)
const AUSTRALIA: CubeCoord[] = [
  c(7,2), c(8,2),
  c(7,3), c(8,3),
]; // 4

// Iceland — small island between Greenland and Europe
const ICELAND: CubeCoord[] = [
  c(-5,-4), c(-4,-4),
]; // 2

// Mid-Atlantic island — between NA/SA and Europe/Africa
const ATLANTIC_ISLAND: CubeCoord[] = [
  c(-4,-2), c(-3,-2),
]; // 2

// Pacific island — open ocean south of SE Asia
const PACIFIC_ISLAND: CubeCoord[] = [
  c(3,3), c(4,3),
]; // 2

// Total: 15+2+9+24+9+3+11+4+4+2+2+2 = 87
const LAND_COORDS: CubeCoord[] = [
  ...NORTH_AMERICA, ...GREENLAND, ...EUROPE, ...ASIA,
  ...AFRICA, ...CARIBBEAN, ...SOUTH_AMERICA,
  ...SE_ASIA_ISLANDS, ...AUSTRALIA,
  ...ICELAND, ...ATLANTIC_ISLAND, ...PACIFIC_ISLAND,
];

// Generate sea hexes within buffer distance K around all land hexes
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

// 87 terrain entries — 3 deserts, rest shuffled
const TERRAIN_POOL: TerrainType[] = [
  ...Array(17).fill('forest'),
  ...Array(17).fill('fields'),
  ...Array(17).fill('pasture'),
  ...Array(17).fill('hills'),
  ...Array(16).fill('mountains'),
  ...Array(3).fill('desert'),
] as TerrainType[]; // 87 ✓

// 84 number tokens (one per non-desert land hex)
const NUMBER_TOKENS: number[] = [
  2, 2, 2, 2,
  3, 3, 3, 3, 3, 3, 3,
  4, 4, 4, 4, 4, 4, 4, 4, 4,
  5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
  6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
  8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,
  9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
  10, 10, 10, 10, 10, 10, 10, 10, 10,
  11, 11, 11, 11, 11, 11, 11,
  12, 12, 12, 12,
]; // 4+7+9+11+11+11+11+9+7+4 = 84 ✓

const PORT_TYPES: PortType[] = [
  'ore_2_1', 'wood_2_1', 'brick_2_1', 'wheat_2_1', 'sheep_2_1',
  'generic_3_1', 'generic_3_1', 'generic_3_1', 'generic_3_1',
  'generic_3_1', 'generic_3_1', 'generic_3_1', 'generic_3_1',
  'generic_3_1', 'generic_3_1', 'generic_3_1',
]; // 16 ports

export const WORLD_MAP: MapTemplate = {
  id: 'world',
  name: 'World (continent shapes, 3-8 players)',
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
  playerCounts: [3, 4, 5, 6, 7, 8],
  seafarers: true,
};
