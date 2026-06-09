import type { CubeCoord, MapTemplate, PortType } from '@opensettlers/shared';
import { distributePorts } from './portUtils.js';

/**
 * Large map — 6 hexes wide, 30 land hexes.
 * 7-row elongated hexagonal shape:
 *   r=-3:  3 hexes  (q: 0..2)
 *   r=-2:  4 hexes  (q: 0..3)
 *   r=-1:  5 hexes  (q:-1..3)
 *   r= 0:  6 hexes  (q:-2..3)  ← widest row
 *   r= 1:  5 hexes  (q:-2..2)
 *   r= 2:  4 hexes  (q:-2..1)
 *   r= 3:  3 hexes  (q:-2..0)
 */
function makeHexes(): CubeCoord[] {
  const rows = [
    { r: -3, qMin:  0, qMax: 2 },
    { r: -2, qMin:  0, qMax: 3 },
    { r: -1, qMin: -1, qMax: 3 },
    { r:  0, qMin: -2, qMax: 3 },
    { r:  1, qMin: -2, qMax: 2 },
    { r:  2, qMin: -2, qMax: 1 },
    { r:  3, qMin: -2, qMax: 0 },
  ];
  const hexes: CubeCoord[] = [];
  for (const { r, qMin, qMax } of rows) {
    for (let q = qMin; q <= qMax; q++) {
      hexes.push({ q, r, s: -q - r });
    }
  }
  return hexes; // 30 hexes
}

const HEX_COORDS = makeHexes();

// 30 hexes: 6+6+6+4+4+2 = 28 non-desert + 2 desert
const TERRAIN_POOL = [
  'forest',   'forest',   'forest',   'forest',   'forest',   'forest',
  'fields',   'fields',   'fields',   'fields',   'fields',   'fields',
  'pasture',  'pasture',  'pasture',  'pasture',  'pasture',  'pasture',
  'hills',    'hills',    'hills',    'hills',
  'mountains','mountains','mountains','mountains',
  'desert',   'desert',
] as const;

// 28 tokens for 28 non-desert hexes
const NUMBER_TOKENS = [
  2, 3, 3, 4, 4, 4,
  5, 5, 5, 6, 6, 6,
  8, 8, 8, 9, 9, 9,
  10, 10, 10, 11, 11, 11,
  12, 12, 2, 3,
];

const PORT_TYPES: PortType[] = [
  'ore_2_1', 'wood_2_1', 'brick_2_1', 'wheat_2_1', 'sheep_2_1',
  'generic_3_1', 'generic_3_1', 'generic_3_1',
  'generic_3_1', 'generic_3_1', 'generic_3_1',
];

export const LARGE_MAP: MapTemplate = {
  id: 'large',
  name: 'Large (6-wide, 4-6 players)',
  hexes: HEX_COORDS.map((coord, i) => ({
    coord,
    terrain: (TERRAIN_POOL[i] ?? 'desert') as import('@opensettlers/shared').TerrainType,
  })),
  numberTokens: NUMBER_TOKENS,
  ports: distributePorts(HEX_COORDS, PORT_TYPES),
  playerCounts: [4, 5, 6],
};
