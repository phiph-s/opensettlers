import type { CubeCoord, MapTemplate, PortType, TerrainType } from '@opensettlers/shared';

function c(q: number, r: number): CubeCoord { return { q, r, s: -q - r }; }

// North America: triangular — wide Canada, tapering to Mexico, Alaska extension
const NORTH_AMERICA: CubeCoord[] = [
  c(-10,-6), c(-9,-6),                                        // Alaska
  c(-11,-5), c(-10,-5), c(-9,-5), c(-8,-5), c(-7,-5),         // Canada (wide)
  c(-10,-4), c(-9,-4), c(-8,-4), c(-7,-4),                    // USA
  c(-9,-3), c(-8,-3), c(-7,-3),                               // Southern USA
  c(-8,-2),                                                   // Mexico tip
]; // 15 hexes

// Greenland: pushed far north for clear isolation
const GREENLAND: CubeCoord[] = [
  c(-6,-7), c(-5,-7),
]; // 2 hexes

// Europe: compact peninsula
const EUROPE: CubeCoord[] = [
  c(-3,-5), c(-2,-5), c(-1,-5), c(0,-5),
  c(-3,-4), c(-2,-4), c(-1,-4),
  c(-2,-3), c(-1,-3),
]; // 9 hexes

// Asia: largest landmass, spreading east
const ASIA: CubeCoord[] = [
  c(2,-5), c(3,-5), c(4,-5), c(5,-5), c(6,-5),
  c(2,-4), c(3,-4), c(4,-4), c(5,-4), c(6,-4), c(7,-4),
  c(3,-3), c(4,-3), c(5,-3), c(6,-3), c(7,-3),
  c(4,-2), c(5,-2), c(6,-2),
  c(6,-1), c(7,-1),
]; // 21 hexes

// Middle East: bridge between Asia and Africa
const MIDDLE_EAST: CubeCoord[] = [
  c(3,-2), c(4,-1), c(5,-1),
]; // 3 hexes

// Africa: wider at the Sahara belt, tapering south to Cape
const AFRICA: CubeCoord[] = [
  c(0,-2), c(1,-2), c(2,-2),                                  // North Africa
  c(-1,-1), c(0,-1), c(1,-1), c(2,-1), c(3,-1),               // Sahara + West Africa bulge
  c(0,0), c(1,0),                                             // Central Africa
  c(1,1), c(2,1),                                             // Southern Africa
  c(1,2),                                                     // Cape
]; // 13 hexes

// South America: shifted east to sit naturally below Caribbean
const SOUTH_AMERICA: CubeCoord[] = [
  c(-6,1), c(-5,1), c(-4,1),
  c(-6,2), c(-5,2), c(-4,2), c(-3,2),
  c(-5,3), c(-4,3), c(-3,3),
  c(-4,4),
]; // 11 hexes

// Australia: compact isolated continent
const AUSTRALIA: CubeCoord[] = [
  c(7,2), c(8,2), c(9,2),
  c(7,3), c(8,3), c(9,3),
  c(8,4),
]; // 7 hexes

// Caribbean islands: shifted east to bridge NA and SA
const CARIBBEAN: CubeCoord[] = [
  c(-5,0), c(-4,0), c(-3,0),
]; // 3 hexes

// SE Asian island chain
const SE_ASIA_ISLANDS: CubeCoord[] = [
  c(5,0), c(6,0), c(7,0),
  c(7,1),
]; // 4 hexes

// Total: 15+2+9+21+3+13+11+7+3+4 = 88 hexes
const ALL_COORDS: CubeCoord[] = [
  ...NORTH_AMERICA, ...GREENLAND, ...EUROPE, ...ASIA,
  ...MIDDLE_EAST, ...AFRICA, ...SOUTH_AMERICA,
  ...AUSTRALIA, ...CARIBBEAN, ...SE_ASIA_ISLANDS,
];

// 88 terrain entries: 17 forest + 17 fields + 17 pasture + 16 hills + 16 mountains + 5 desert
const TERRAIN_POOL: TerrainType[] = [
  'forest',    'forest',    'forest',    'forest',    'forest',    'forest',    'forest',    'forest',    'forest',
  'forest',    'forest',    'forest',    'forest',    'forest',    'forest',    'forest',    'forest',
  'fields',    'fields',    'fields',    'fields',    'fields',    'fields',    'fields',    'fields',    'fields',
  'fields',    'fields',    'fields',    'fields',    'fields',    'fields',    'fields',    'fields',
  'pasture',   'pasture',   'pasture',   'pasture',   'pasture',   'pasture',   'pasture',   'pasture',   'pasture',
  'pasture',   'pasture',   'pasture',   'pasture',   'pasture',   'pasture',   'pasture',   'pasture',
  'hills',     'hills',     'hills',     'hills',     'hills',     'hills',     'hills',     'hills',
  'hills',     'hills',     'hills',     'hills',     'hills',     'hills',     'hills',     'hills',
  'mountains', 'mountains', 'mountains', 'mountains', 'mountains', 'mountains', 'mountains', 'mountains',
  'mountains', 'mountains', 'mountains', 'mountains', 'mountains', 'mountains', 'mountains', 'mountains',
  'desert',    'desert',    'desert',    'desert',    'desert',
]; // 17+17+17+16+16+5 = 88 ✓

// 83 number tokens (one per non-desert hex)
const NUMBER_TOKENS: number[] = [
  2, 2, 2, 2,
  3, 3, 3, 3, 3, 3, 3, 3, 3,
  4, 4, 4, 4, 4, 4, 4, 4, 4,
  5, 5, 5, 5, 5, 5, 5, 5, 5,
  6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
  8, 8, 8, 8, 8, 8, 8, 8, 8, 8,
  9, 9, 9, 9, 9, 9, 9, 9, 9,
  10, 10, 10, 10, 10, 10, 10, 10, 10,
  11, 11, 11, 11, 11, 11, 11, 11, 11,
  12, 12, 12, 12, 12,
]; // 4+9+9+9+10+10+9+9+9+5 = 83 ✓

const PORT_TYPES: PortType[] = [
  'ore_2_1', 'wood_2_1', 'brick_2_1', 'wheat_2_1', 'sheep_2_1',
  'generic_3_1', 'generic_3_1', 'generic_3_1', 'generic_3_1',
  'generic_3_1', 'generic_3_1', 'generic_3_1', 'generic_3_1',
  'generic_3_1', 'generic_3_1', 'generic_3_1',
]; // 16 ports

export const WORLD_MAP: MapTemplate = {
  id: 'world',
  name: 'World (continent shapes, 2-8 players)',
  hexes: ALL_COORDS.map((coord, i) => ({
    coord,
    terrain: TERRAIN_POOL[i] ?? 'desert',
  })),
  numberTokens: NUMBER_TOKENS,
  portTypes: PORT_TYPES,
  playerCounts: [2, 3, 4, 5, 6, 7, 8],
};
