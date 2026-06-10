import type { EdgeKey, GameBoard, HexKey, VertexKey } from '../types/board.js';
import type { GameState } from '../types/game.js';
import { hexVertexKeys } from '../coords/vertexKey.js';

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

/**
 * Returns all hex keys the active player may legally move the robber to.
 * Excludes sea hexes, the current robber hex, and — when friendlyRobber is on —
 * hexes whose only adjacent opponent buildings belong to players with ≤ 3 VP.
 */
export function validRobberHexKeys(state: GameState, playerId: string): HexKey[] {
  const currentRobberKey = Object.keys(state.board.hexes).find(
    (hk) => state.board.hexes[hk]?.hasRobber
  );

  return Object.entries(state.board.hexes)
    .filter(([hk, hex]) => {
      if (hex.terrain === 'sea') return false;
      if (hk === currentRobberKey) return false;

      if (state.friendlyRobber) {
        // Collect distinct opponent owners adjacent to this hex
        const opponentOwners = hexVertexKeys(hex.coord)
          .map((vk) => state.board.vertices[vk]?.building)
          .filter((b): b is NonNullable<typeof b> => !!b && b.owner !== playerId)
          .map((b) => b.owner);

        if (opponentOwners.length > 0) {
          const allLowVP = opponentOwners.every((oid) => {
            const p = state.players.find((pl) => pl.id === oid);
            return p && p.victoryPoints <= 3;
          });
          if (allLowVP) return false;
        }
      }

      return true;
    })
    .map(([hk]) => hk);
}
