import {
  cubeKey,
  cubeNeighbors,
  edgeKey,
  parseCubeKey,
  vertexKey,
} from '@opensettlers/shared';
import { STANDARD_MAP } from './standard.map.js';
import { LARGE_MAP } from './large.map.js';
import { HUGE_MAP } from './huge.map.js';
import { CLOUDS_MAP } from './clouds.map.js';
import { WORLD_MAP } from './world.map.js';
import { distributePorts } from './portUtils.js';
import type {
  CubeCoord,
  Edge,
  EdgeKey,
  GameBoard,
  Hex,
  HexKey,
  MapTemplate,
  PortType,
  TerrainType,
  Vertex,
  VertexKey,
} from '@opensettlers/shared';

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

export type HexSecret = { terrain: TerrainType; numberToken: number | null };

export function buildBoard(template: MapTemplate, rng: () => number): { board: GameBoard; secrets: Map<HexKey, HexSecret> } {
  const hexes: Record<HexKey, Hex> = {};
  const vertices: Record<VertexKey, Vertex> = {};
  const edges: Record<EdgeKey, Edge> = {};

  // Separate locked hexes (fixed terrain, not shuffled) from the shuffle pool
  const poolTerrains: TerrainType[] = [];
  const lockedTerrainByIndex = new Map<number, TerrainType>();
  for (let i = 0; i < template.hexes.length; i++) {
    const h = template.hexes[i]!;
    if (h.locked && h.terrain !== null) {
      lockedTerrainByIndex.set(i, h.terrain);
    } else {
      poolTerrains.push(h.terrain ?? ('forest' as TerrainType));
    }
  }

  const shuffledPool = shuffle(poolTerrains, rng);
  let poolIdx = 0;
  const shuffledTerrains: TerrainType[] = template.hexes.map((_h, i) => {
    if (lockedTerrainByIndex.has(i)) return lockedTerrainByIndex.get(i)!;
    return shuffledPool[poolIdx++] ?? ('forest' as TerrainType);
  });

  // Find desert index for robber placement (first non-clouded desert)
  const desertIndex = shuffledTerrains.indexOf('desert');

  // Place number tokens for all productive hexes (skipping desert and sea; clouds get tokens hidden in secrets)
  const tokenQueue = shuffle([...template.numberTokens], rng);
  const tokenAssignments = new Map<number, number>();
  let tokenIdx = 0;
  for (let i = 0; i < shuffledTerrains.length; i++) {
    const t = shuffledTerrains[i];
    if (t !== 'desert' && t !== 'sea') {
      tokenAssignments.set(i, tokenQueue[tokenIdx++] ?? 0);
    }
  }

  // Build hex map
  for (let i = 0; i < template.hexes.length; i++) {
    const { coord } = template.hexes[i]!;
    const terrain = shuffledTerrains[i]!;
    const hk = cubeKey(coord);
    hexes[hk] = {
      coord,
      terrain,
      numberToken: tokenAssignments.get(i) ?? null,
      hasRobber: i === desertIndex,
    };
  }

  // Hide clouded hexes: store true terrain+token in secrets, display as 'clouds'
  const secrets = new Map<HexKey, HexSecret>();
  if (template.cloudedCoords) {
    const cloudedSet = new Set(template.cloudedCoords.map((c) => cubeKey(c)));
    for (const [hk, hex] of Object.entries(hexes)) {
      if (cloudedSet.has(hk)) {
        secrets.set(hk, { terrain: hex.terrain, numberToken: hex.numberToken });
        hex.terrain = 'clouds';
        hex.numberToken = null;
        hex.hasRobber = false;
      }
    }
  }

  // Determine which hex keys are "land" (non-sea)
  const landHexKeys = new Set(
    Object.values(hexes)
      .filter((h) => h.terrain !== 'sea')
      .map((h) => cubeKey(h.coord))
  );

  // Derive vertices and edges from hexes
  for (const hex of Object.values(hexes)) {
    const coord = hex.coord;
    const hk = cubeKey(coord);

    // 6 vertices per hex
    for (let dir = 0; dir < 6; dir++) {
      const vk = vertexKey(coord, dir);
      if (!vertices[vk]) {
        vertices[vk] = {
          key: vk,
          adjacentHexKeys: [],
          adjacentEdgeKeys: [],
          adjacentVertexKeys: [],
          building: null,
          port: null,
        };
      }
      if (!vertices[vk]!.adjacentHexKeys.includes(hk)) {
        vertices[vk]!.adjacentHexKeys.push(hk);
      }
    }

    // 6 edges per hex (shared with neighbors)
    const neighbors = cubeNeighbors(coord);
    for (const neighbor of neighbors) {
      const ek = edgeKey(coord, neighbor);
      if (!edges[ek]) {
        edges[ek] = {
          key: ek,
          adjacentHexKeys: [],
          adjacentVertexKeys: ['', ''],
          road: null,
          ship: null,
          isWaterEdge: false,
        };
      }
      const neighborHk = cubeKey(neighbor);
      if (!edges[ek]!.adjacentHexKeys.includes(hk)) {
        edges[ek]!.adjacentHexKeys.push(hk);
      }
      if (!edges[ek]!.adjacentHexKeys.includes(neighborHk)) {
        edges[ek]!.adjacentHexKeys.push(neighborHk);
      }
    }
  }

  // Direction vectors for the 6 cube-coordinate directions (used for geometric edge resolution)
  const CUBE_DIRS = [
    { q: 1, r: -1, s: 0 }, { q: 1, r: 0, s: -1 }, { q: 0, r: 1, s: -1 },
    { q: -1, r: 1, s: 0 }, { q: -1, r: 0, s: 1 }, { q: 0, r: -1, s: 1 },
  ];

  // Compute vertex-edge and vertex-vertex adjacency
  for (const edge of Object.values(edges)) {
    const hexPair = edge.adjacentHexKeys;
    if (hexPair.length < 2) continue;

    // If both hexes are present in the board (land-land, land-sea seafarers, or sea-sea seafarers)
    // use the shared-vertex lookup.
    const bothPresent = hexPair.every((hk) => hexes[hk] !== undefined);
    if (bothPresent) {
      const sharedVertices = Object.values(vertices).filter((v) => {
        const hks = v.adjacentHexKeys;
        return hexPair.every((hk) => hks.includes(hk));
      });
      if (sharedVertices.length >= 2) {
        edge.adjacentVertexKeys = [sharedVertices[0]!.key, sharedVertices[1]!.key];
        for (const sv of sharedVertices) {
          if (!sv.adjacentEdgeKeys.includes(edge.key)) {
            sv.adjacentEdgeKeys.push(edge.key);
          }
        }
      }
    } else {
      // Coastline edge: one hex is in the board, the other is outside (pre-seafarers standard maps).
      // Compute the two connecting vertices geometrically.
      const presentHk = hexes[hexPair[0]!] ? hexPair[0]! : hexPair[1]!;
      const absentHk = presentHk === hexPair[0]! ? hexPair[1]! : hexPair[0]!;
      const presentCoord = parseCubeKey(presentHk);
      const absentCoord = parseCubeKey(absentHk);
      const diff = {
        q: absentCoord.q - presentCoord.q,
        r: absentCoord.r - presentCoord.r,
        s: absentCoord.s - presentCoord.s,
      };
      const d = CUBE_DIRS.findIndex((dir) => dir.q === diff.q && dir.r === diff.r && dir.s === diff.s);
      if (d === -1) continue;
      const vk1 = vertexKey(presentCoord, d);
      const vk2 = vertexKey(presentCoord, (d + 1) % 6);
      if (vertices[vk1] && vertices[vk2]) {
        edge.adjacentVertexKeys = [vk1, vk2];
        if (!vertices[vk1]!.adjacentEdgeKeys.includes(edge.key)) vertices[vk1]!.adjacentEdgeKeys.push(edge.key);
        if (!vertices[vk2]!.adjacentEdgeKeys.includes(edge.key)) vertices[vk2]!.adjacentEdgeKeys.push(edge.key);
      }
    }
  }

  // Compute vertex-vertex adjacency (via shared edges)
  for (const vertex of Object.values(vertices)) {
    const neighborSet = new Set<VertexKey>();
    for (const ek of vertex.adjacentEdgeKeys) {
      const edge = edges[ek];
      if (!edge) continue;
      for (const vk of edge.adjacentVertexKeys) {
        if (vk && vk !== vertex.key) neighborSet.add(vk);
      }
    }
    vertex.adjacentVertexKeys = Array.from(neighborSet);
  }

  // Resolve port definitions — either fixed or randomly distributed.
  // Use only non-sea hex coords for perimeter calculation so ports land on the coastline.
  const portDistribCoords = template.hexes
    .map((h, i) => ({ coord: h.coord, terrain: shuffledTerrains[i] }))
    .filter((h) => h.terrain !== 'sea')
    .map((h) => h.coord);

  const resolvedPorts: Array<{ type: PortType; edgeKey: string }> =
    template.portTypes
      ? distributePorts(portDistribCoords, shuffle(template.portTypes, rng))
      : (template.ports ?? []);

  // Assign ports to vertices using direct vertex key computation
  for (const portDef of resolvedPorts) {
    const [hkA, hkB] = portDef.edgeKey.split('|') as [string, string];
    const landHk = landHexKeys.has(hkA) ? hkA : hkB;
    const seaHk = landHk === hkA ? hkB : hkA;
    const landCoord = parseCubeKey(landHk);
    const seaCoord = parseCubeKey(seaHk);
    const diff = { q: seaCoord.q - landCoord.q, r: seaCoord.r - landCoord.r, s: seaCoord.s - landCoord.s };
    const d = CUBE_DIRS.findIndex((dir) => dir.q === diff.q && dir.r === diff.r && dir.s === diff.s);
    if (d === -1) continue;
    const vk1 = vertexKey(landCoord, d);
    const vk2 = vertexKey(landCoord, (d + 1) % 6);
    if (vertices[vk1]) vertices[vk1]!.port = portDef.type as PortType;
    if (vertices[vk2]) vertices[vk2]!.port = portDef.type as PortType;
  }

  // For seafarers maps, keep all sea-adjacent vertices/edges (for ship lanes).
  // For non-seafarers maps, prune vertices/edges that don't touch land.
  const isSeafarers = template.seafarers === true;

  if (!isSeafarers) {
    // Remove sea-only vertices (vertices that touch no land hexes)
    for (const [vk, vertex] of Object.entries(vertices)) {
      const touchesLand = vertex.adjacentHexKeys.some((hk) => landHexKeys.has(hk));
      if (!touchesLand) delete vertices[vk];
    }
    // Remove edges that don't connect to any retained vertex
    for (const [ek, edge] of Object.entries(edges)) {
      const connectsToLand = edge.adjacentVertexKeys.some(
        (vk) => vk && vertices[vk] !== undefined
      );
      if (!connectsToLand) delete edges[ek];
    }
  } else {
    // Seafarers: keep vertices that touch at least one hex (land OR sea).
    // Only discard vertices at the very outer border of sea hexes that have no real neighbors.
    for (const [vk, vertex] of Object.entries(vertices)) {
      if (vertex.adjacentHexKeys.length === 0) delete vertices[vk];
    }
    // Keep all edges that have valid vertex endpoints
    for (const [ek, edge] of Object.entries(edges)) {
      const valid = edge.adjacentVertexKeys.every((vk) => vk && vertices[vk] !== undefined);
      if (!valid) delete edges[ek];
    }
  }

  // Compute isWaterEdge for all remaining edges
  for (const edge of Object.values(edges)) {
    edge.isWaterEdge = edge.adjacentHexKeys.some(
      (hk) => hexes[hk]?.terrain === 'sea'
    );
  }

  return { board: { hexes, vertices, edges }, secrets };
}

const ALL_MAPS: MapTemplate[] = [STANDARD_MAP, LARGE_MAP, HUGE_MAP, CLOUDS_MAP, WORLD_MAP];

export { STANDARD_MAP };

export function getAvailableMaps(): MapTemplate[] {
  return ALL_MAPS;
}

export function getMapById(id: string): MapTemplate {
  return ALL_MAPS.find((m) => m.id === id) ?? STANDARD_MAP;
}
