import {
  cubeKey,
  cubeSpiral,
  edgeKey,
  cubeAdd,
} from '@opensettlers/shared';
import type { MapTemplate } from '@opensettlers/shared';
import { STANDARD_NUMBER_TOKENS, STANDARD_TERRAIN_POOL } from '@opensettlers/shared';

const CENTER = { q: 0, r: 0, s: 0 };
const hexCoords = cubeSpiral(CENTER, 2);

// Ports: 9 ports placed on coastline edges (edges between land and sea hexes)
// Standard map has a well-known port layout. We define them by the two land hex coords
// that share the edge facing the sea port.
// In the standard board, ports are on the outer ring edges.
const SEA_RING = [
  { q: 3, r: -3, s: 0 }, { q: 3, r: -2, s: -1 }, { q: 3, r: -1, s: -2 },
  { q: 2, r: 1, s: -3 }, { q: 1, r: 2, s: -3 }, { q: 0, r: 3, s: -3 },
  { q: -1, r: 3, s: -2 }, { q: -2, r: 3, s: -1 }, { q: -3, r: 3, s: 0 },
  { q: -3, r: 2, s: 1 }, { q: -3, r: 1, s: 2 }, { q: -3, r: 0, s: 3 },
  { q: -2, r: -1, s: 3 }, { q: -1, r: -2, s: 3 }, { q: 0, r: -3, s: 3 },
  { q: 1, r: -3, s: 2 }, { q: 2, r: -3, s: 1 }, { q: 3, r: -3, s: 0 },
];

// Outer ring land hexes (ring 2 in spiral order)
const RING2 = [
  { q: 2, r: -2, s: 0 }, { q: 2, r: -1, s: -1 }, { q: 2, r: 0, s: -2 },
  { q: 1, r: 1, s: -2 }, { q: 0, r: 2, s: -2 }, { q: -1, r: 2, s: -1 },
  { q: -2, r: 2, s: 0 }, { q: -2, r: 1, s: 1 }, { q: -2, r: 0, s: 2 },
  { q: -1, r: -1, s: 2 }, { q: 0, r: -2, s: 2 }, { q: 1, r: -2, s: 1 },
];

// Define the 9 port edges: each port occupies an edge between a land hex and a sea hex
// We encode them as edgeKey(landHex, seaNeighbor)
function makePortEdges() {
  // Standard port positions (fixed, well-known layout)
  // [landHexIndex in RING2, seaNeighborOffset]
  const portPlacements: Array<{ land: { q: number; r: number; s: number }; sea: { q: number; r: number; s: number } }> = [
    { land: RING2[0]!, sea: { q: 3, r: -3, s: 0 } },
    { land: RING2[1]!, sea: { q: 3, r: -2, s: -1 } },
    { land: RING2[3]!, sea: { q: 2, r: 1, s: -3 } },
    { land: RING2[4]!, sea: { q: 0, r: 3, s: -3 } },
    { land: RING2[5]!, sea: { q: -1, r: 3, s: -2 } },
    { land: RING2[7]!, sea: { q: -3, r: 2, s: 1 } },
    { land: RING2[8]!, sea: { q: -3, r: 0, s: 3 } },
    { land: RING2[10]!, sea: { q: 0, r: -3, s: 3 } },
    { land: RING2[11]!, sea: { q: 2, r: -3, s: 1 } },
  ];
  return portPlacements.map((p) => edgeKey(p.land, p.sea));
}

const PORT_EDGE_KEYS = makePortEdges();

export const STANDARD_MAP: MapTemplate = {
  id: 'standard',
  name: 'Standard Catan (3-4 players)',
  hexes: hexCoords.map((coord, i) => ({
    coord,
    terrain: STANDARD_TERRAIN_POOL[i] ?? 'desert',
  })),
  numberTokens: STANDARD_NUMBER_TOKENS,
  ports: [
    { type: 'ore_2_1', edgeKey: PORT_EDGE_KEYS[0]! },
    { type: 'generic_3_1', edgeKey: PORT_EDGE_KEYS[1]! },
    { type: 'generic_3_1', edgeKey: PORT_EDGE_KEYS[2]! },
    { type: 'wheat_2_1', edgeKey: PORT_EDGE_KEYS[3]! },
    { type: 'generic_3_1', edgeKey: PORT_EDGE_KEYS[4]! },
    { type: 'wood_2_1', edgeKey: PORT_EDGE_KEYS[5]! },
    { type: 'brick_2_1', edgeKey: PORT_EDGE_KEYS[6]! },
    { type: 'generic_3_1', edgeKey: PORT_EDGE_KEYS[7]! },
    { type: 'sheep_2_1', edgeKey: PORT_EDGE_KEYS[8]! },
  ],
  playerCounts: [3, 4],
};
