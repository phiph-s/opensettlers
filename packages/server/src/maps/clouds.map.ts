import { cubeRing, cubeSpiral } from '@opensettlers/shared';
import type { CubeCoord, MapTemplate, PortType, TerrainType } from '@opensettlers/shared';

const CENTER: CubeCoord = { q: 0, r: 0, s: 0 };

// 7 hexes in the center (radius-1 spiral) — hidden terrain until roads reach them
const cloudedCoords = cubeSpiral(CENTER, 1);
// 12 desert hexes in ring-2 — locked barrier separating clouds from outer land
const desertRing = cubeRing(CENTER, 2);
// 18 + 24 = 42 outer land hexes (rings 3 and 4)
const outerRing3 = cubeRing(CENTER, 3);
const outerRing4 = cubeRing(CENTER, 4);

// 7 (cloud) + 42 (outer) = 49 productive hexes; the 12-desert ring is locked and uses no tokens
const TERRAIN_POOL: Array<TerrainType | null> = [
  null, null, null, null, null, null, null,                                              // 7 cloud hexes
  'forest', 'forest', 'forest', 'forest', 'forest', 'forest', 'forest', 'forest', 'forest',  // 9
  'fields', 'fields', 'fields', 'fields', 'fields', 'fields', 'fields', 'fields', 'fields',  // 9
  'pasture', 'pasture', 'pasture', 'pasture', 'pasture', 'pasture', 'pasture', 'pasture',    // 8
  'hills', 'hills', 'hills', 'hills', 'hills', 'hills', 'hills', 'hills',                    // 8
  'mountains', 'mountains', 'mountains', 'mountains', 'mountains', 'mountains', 'mountains', 'mountains', // 8
]; // null×7 + 9+9+8+8+8 = 49 ✓

const PORT_TYPES: PortType[] = [
  'ore_2_1', 'wood_2_1', 'brick_2_1', 'wheat_2_1', 'sheep_2_1',
  'generic_3_1', 'generic_3_1', 'generic_3_1',
  'generic_3_1', 'generic_3_1', 'generic_3_1',
  'generic_3_1', 'generic_3_1', 'generic_3_1',
];

export const CLOUDS_MAP: MapTemplate = {
  id: 'clouds',
  name: 'Clouds (exploration, 5-8 players)',
  hexes: [
    ...cloudedCoords.map((coord, i) => ({ coord, terrain: TERRAIN_POOL[i] ?? null })),
    ...desertRing.map((coord) => ({ coord, terrain: 'desert' as TerrainType, locked: true })),
    ...outerRing3.map((coord, i) => ({ coord, terrain: TERRAIN_POOL[7 + i] ?? null })),
    ...outerRing4.map((coord, i) => ({ coord, terrain: TERRAIN_POOL[25 + i] ?? null })),
  ],
  cloudedCoords,
  // 2×2, 3×5, 4×5, 5×6, 6×6, 8×6, 9×5, 10×5, 11×5, 12×4 = 49
  numberTokens: [
    2, 2,
    3, 3, 3, 3, 3,
    4, 4, 4, 4, 4,
    5, 5, 5, 5, 5, 5,
    6, 6, 6, 6, 6, 6,
    8, 8, 8, 8, 8, 8,
    9, 9, 9, 9, 9,
    10, 10, 10, 10, 10,
    11, 11, 11, 11, 11,
    12, 12, 12, 12,
  ],
  portTypes: PORT_TYPES,
  playerCounts: [5, 6, 7, 8],
};
