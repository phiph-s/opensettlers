import { cubeSpiral } from '@opensettlers/shared';
import type { MapTemplate, PortType } from '@opensettlers/shared';
import { distributePorts } from './portUtils.js';

/**
 * Huge map — 7 hexes wide, 37 land hexes.
 * Regular hexagon of radius 3 (all (q,r,s) with max(|q|,|r|,|s|) ≤ 3).
 */
const HEX_COORDS = cubeSpiral({ q: 0, r: 0, s: 0 }, 3); // 37 hexes

// 37 hexes: 8+8+7+6+6+2 = 35 non-desert + 2 desert
const TERRAIN_POOL = [
  'forest',    'forest',    'forest',    'forest',    'forest',    'forest',    'forest',    'forest',
  'fields',    'fields',    'fields',    'fields',    'fields',    'fields',    'fields',    'fields',
  'pasture',   'pasture',   'pasture',   'pasture',   'pasture',   'pasture',   'pasture',
  'hills',     'hills',     'hills',     'hills',     'hills',     'hills',
  'mountains', 'mountains', 'mountains', 'mountains', 'mountains', 'mountains',
  'desert',    'desert',
] as const;

// 35 tokens for 35 non-desert hexes (balanced distribution)
const NUMBER_TOKENS = [
  2, 2, 3, 3, 3,
  4, 4, 4, 4,
  5, 5, 5, 5,
  6, 6, 6, 6,
  8, 8, 8, 8,
  9, 9, 9, 9,
  10, 10, 10, 10,
  11, 11, 11, 11,
  12, 12,
];

const PORT_TYPES: PortType[] = [
  'ore_2_1', 'wood_2_1', 'brick_2_1', 'wheat_2_1', 'sheep_2_1',
  'generic_3_1', 'generic_3_1', 'generic_3_1',
  'generic_3_1', 'generic_3_1', 'generic_3_1', 'generic_3_1',
];

export const HUGE_MAP: MapTemplate = {
  id: 'huge',
  name: 'Huge (7-wide, 5-6 players)',
  hexes: HEX_COORDS.map((coord, i) => ({
    coord,
    terrain: (TERRAIN_POOL[i] ?? 'desert') as import('@opensettlers/shared').TerrainType,
  })),
  numberTokens: NUMBER_TOKENS,
  ports: distributePorts(HEX_COORDS, PORT_TYPES),
  playerCounts: [5, 6],
};
