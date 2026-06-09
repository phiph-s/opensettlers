import type { BuildingType, PortType, TerrainType } from './primitives.js';

export interface CubeCoord {
  q: number;
  r: number;
  s: number;
}

/** Canonical key for a hex: "q,r,s" */
export type HexKey = string;

/**
 * Canonical key for a vertex (intersection of 2-3 hexes).
 * Format: sorted hex keys joined by "|": "q1,r1,s1|q2,r2,s2|q3,r3,s3"
 */
export type VertexKey = string;

/**
 * Canonical key for an edge (shared by 2 adjacent hexes).
 * Format: sorted hex keys joined by "|": "q1,r1,s1|q2,r2,s2"
 */
export type EdgeKey = string;

export interface Hex {
  coord: CubeCoord;
  terrain: TerrainType;
  numberToken: number | null;
  hasRobber: boolean;
}

export interface Vertex {
  key: VertexKey;
  adjacentHexKeys: HexKey[];
  adjacentEdgeKeys: EdgeKey[];
  adjacentVertexKeys: VertexKey[];
  building: { type: BuildingType; owner: string } | null;
  port: PortType | null;
}

export interface Edge {
  key: EdgeKey;
  adjacentHexKeys: HexKey[];
  adjacentVertexKeys: [VertexKey, VertexKey];
  road: { owner: string } | null;
}

export interface GameBoard {
  hexes: Record<HexKey, Hex>;
  vertices: Record<VertexKey, Vertex>;
  edges: Record<EdgeKey, Edge>;
}

export interface MapTemplate {
  id: string;
  name: string;
  /** Fixed terrain assignments; if null, terrain pool is shuffled */
  hexes: Array<{ coord: CubeCoord; terrain: TerrainType | null }>;
  /** Number token pool placed in spiral order (skip desert) */
  numberTokens: number[];
  /** Fixed port assignments by edge key */
  ports: Array<{ type: PortType; edgeKey: EdgeKey }>;
  playerCounts: number[];
}
