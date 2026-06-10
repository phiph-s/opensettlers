import type { EdgeKey, GameBoard, VertexKey } from '../types/board.js';

/** Returns all vertex keys valid for setup settlement placement */
export function validSetupVertices(board: GameBoard, cloudOriginKeys?: string[]): VertexKey[] {
  const cloudSet = cloudOriginKeys ? new Set(cloudOriginKeys) : null;
  return Object.values(board.vertices)
    .filter((v) => {
      // Must touch at least one non-sea hex
      const touchesLand = v.adjacentHexKeys.some((hk) => {
        const hex = board.hexes[hk];
        return hex && hex.terrain !== 'sea';
      });
      if (!touchesLand) return false;
      // Cannot place adjacent to cloud-origin hexes during setup (whether still clouded or revealed)
      const touchesCloudZone = v.adjacentHexKeys.some(
        (hk) => board.hexes[hk]?.terrain === 'clouds' || cloudSet?.has(hk)
      );
      if (touchesCloudZone) return false;
      // No existing building here
      if (v.building !== null) return false;
      // Distance rule: all adjacent vertices must be empty
      return v.adjacentVertexKeys.every((avk) => board.vertices[avk]?.building === null);
    })
    .map((v) => v.key);
}

/** Returns valid road edges adjacent to a freshly placed setup settlement */
export function validSetupRoads(board: GameBoard, settlementVertexKey: VertexKey): EdgeKey[] {
  const vertex = board.vertices[settlementVertexKey];
  if (!vertex) return [];
  return vertex.adjacentEdgeKeys.filter((ek) => {
    const edge = board.edges[ek];
    return edge !== undefined && edge.road === null;
  });
}

/** Returns valid settlement vertices for a player during normal play */
export function validSettlementVertices(board: GameBoard, playerId: string): VertexKey[] {
  return Object.values(board.vertices)
    .filter((v) => {
      if (v.building !== null) return false;
      const touchesLand = v.adjacentHexKeys.some((hk) => {
        const hex = board.hexes[hk];
        return hex && hex.terrain !== 'sea';
      });
      if (!touchesLand) return false;
      // Distance rule
      if (!v.adjacentVertexKeys.every((avk) => board.vertices[avk]?.building === null)) return false;
      // Must be connected to player's road network
      return v.adjacentEdgeKeys.some((ek) => board.edges[ek]?.road?.owner === playerId);
    })
    .map((v) => v.key);
}

/** Returns valid city vertices for a player (player's existing settlements) */
export function validCityVertices(board: GameBoard, playerId: string): VertexKey[] {
  return Object.values(board.vertices)
    .filter((v) => v.building?.owner === playerId && v.building.type === 'settlement')
    .map((v) => v.key);
}

/** Returns valid road edges for a player during normal play */
export function validRoadEdges(board: GameBoard, playerId: string): EdgeKey[] {
  return Object.values(board.edges)
    .filter((e) => {
      if (e.road !== null) return false;
      // Must touch at least one non-sea hex
      const touchesLand = e.adjacentHexKeys.some((hk) => board.hexes[hk]?.terrain !== 'sea');
      if (!touchesLand) return false;
      // Must connect to player's road or building
      return e.adjacentVertexKeys.some((vk) => {
        const vertex = board.vertices[vk];
        if (!vertex) return false;
        // Own building
        if (vertex.building?.owner === playerId) return true;
        // Connected road not blocked by opponent building
        const hasOwnRoad = vertex.adjacentEdgeKeys.some(
          (ek) => ek !== e.key && board.edges[ek]?.road?.owner === playerId
        );
        if (!hasOwnRoad) return false;
        // Vertex must not have an opponent building (which would block road extension)
        return !vertex.building || vertex.building.owner === playerId;
      });
    })
    .map((e) => e.key);
}
