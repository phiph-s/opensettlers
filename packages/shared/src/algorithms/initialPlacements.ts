import type { EdgeKey, GameBoard, HexKey, VertexKey } from '../types/board.js';
import type { GameState } from '../types/game.js';
import { hexVertexKeys } from '../coords/vertexKey.js';

/** Computes a map of hexKey → island size (size of connected non-sea component) */
function computeIslandSizes(board: GameBoard): Map<HexKey, number> {
  const sizeMap = new Map<HexKey, number>();
  const visited = new Set<HexKey>();

  // Build land-hex adjacency from edges
  const hexAdj = new Map<HexKey, HexKey[]>();
  for (const edge of Object.values(board.edges)) {
    const [h1, h2] = edge.adjacentHexKeys;
    if (!h1 || !h2) continue;
    if (!hexAdj.has(h1)) hexAdj.set(h1, []);
    if (!hexAdj.has(h2)) hexAdj.set(h2, []);
    hexAdj.get(h1)!.push(h2);
    hexAdj.get(h2)!.push(h1);
  }

  for (const hk of Object.keys(board.hexes)) {
    if (visited.has(hk)) continue;
    const hex = board.hexes[hk];
    if (!hex || hex.terrain === 'sea') { visited.add(hk); continue; }

    const component: HexKey[] = [];
    const queue: HexKey[] = [hk];
    while (queue.length) {
      const curr = queue.pop()!;
      if (visited.has(curr)) continue;
      visited.add(curr);
      const h = board.hexes[curr];
      if (!h || h.terrain === 'sea') continue;
      component.push(curr);
      for (const nb of (hexAdj.get(curr) ?? [])) {
        if (!visited.has(nb)) queue.push(nb);
      }
    }
    for (const k of component) sizeMap.set(k, component.length);
  }
  return sizeMap;
}

/** Returns all vertex keys valid for setup settlement placement */
export function validSetupVertices(board: GameBoard, cloudOriginKeys?: string[], blockDiscoveryIslands?: boolean): VertexKey[] {
  const cloudSet = cloudOriginKeys ? new Set(cloudOriginKeys) : null;
  // When discovery bonus is active, block setup placement on small islands (≤7 tiles)
  const islandSizes = blockDiscoveryIslands ? computeIslandSizes(board) : null;

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
      // When discovery bonus enabled: cannot start on a small island (≤7 tiles)
      if (islandSizes) {
        const onSmallIsland = v.adjacentHexKeys.some((hk) => {
          const sz = islandSizes.get(hk);
          return sz !== undefined && sz <= 7;
        });
        if (onSmallIsland) return false;
      }
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
    return edge !== undefined && edge.road === null && !edge.isWaterEdge;
  });
}

/** Returns valid ship edges adjacent to a freshly placed setup settlement (seafarers) */
export function validSetupShips(board: GameBoard, settlementVertexKey: VertexKey): EdgeKey[] {
  const vertex = board.vertices[settlementVertexKey];
  if (!vertex) return [];
  return vertex.adjacentEdgeKeys.filter((ek) => {
    const edge = board.edges[ek];
    return edge !== undefined && edge.ship === null && edge.road === null && edge.isWaterEdge;
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
      // Must be connected to player's road or ship network
      return v.adjacentEdgeKeys.some((ek) => {
        const e = board.edges[ek];
        return e?.road?.owner === playerId || e?.ship?.owner === playerId;
      });
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
      if (e.isWaterEdge) return false; // roads cannot go on water edges
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

/** Returns valid ship edges for a player during normal play (seafarers) */
export function validShipEdges(board: GameBoard, playerId: string): EdgeKey[] {
  return Object.values(board.edges)
    .filter((e) => {
      if (e.ship !== null || e.road !== null) return false;
      if (!e.isWaterEdge) return false; // ships can only go on water edges
      // Must connect to player's ship network, road network (via settlement), or own building
      return e.adjacentVertexKeys.some((vk) => {
        const vertex = board.vertices[vk];
        if (!vertex) return false;
        // Own building (settlement/city bridges road↔ship networks)
        if (vertex.building?.owner === playerId) return true;
        // Connected ship not blocked by opponent building
        const hasOwnShip = vertex.adjacentEdgeKeys.some(
          (ek) => ek !== e.key && board.edges[ek]?.ship?.owner === playerId
        );
        if (!hasOwnShip) return false;
        return !vertex.building || vertex.building.owner === playerId;
      });
    })
    .map((e) => e.key);
}

/**
 * Returns the edge keys of ships that can be MOVED this turn for a player.
 * A ship can be moved if it is at the open END of an open ship line.
 * A ship line is "open" when at least one endpoint has no settlement/city.
 * A ship at one endpoint can be moved if:
 *   - The endpoint has no settlement/city
 *   - Removing the ship doesn't disconnect the rest of the line (i.e. it's truly a free end)
 * Only returns ships whose edge key is NOT equal to `builtThisTurnKey`.
 */
export function validShipMoveOrigins(
  board: GameBoard,
  playerId: string,
  builtThisTurnKey: string | null
): EdgeKey[] {
  const shipEdges = Object.values(board.edges).filter((e) => e.ship?.owner === playerId);
  if (shipEdges.length === 0) return [];

  return shipEdges
    .filter((e) => {
      if (e.key === builtThisTurnKey) return false; // can't move a ship built this turn
      // Check each endpoint vertex
      for (const vk of e.adjacentVertexKeys) {
        const vertex = board.vertices[vk];
        if (!vertex) continue;
        // Endpoint must not have any settlement/city
        if (vertex.building) continue;
        // Count how many own ships are adjacent to this vertex (excluding this edge)
        const adjacentOwn = vertex.adjacentEdgeKeys.filter(
          (ek) => ek !== e.key && board.edges[ek]?.ship?.owner === playerId
        ).length;
        // This ship is a "free end" if there's at most 1 other ship adjacent (it terminates the line)
        if (adjacentOwn <= 1) return true;
      }
      return false;
    })
    .map((e) => e.key);
}

/** Returns valid destination edges for moving a specific ship (seafarers) */
export function validShipMoveDestinations(
  board: GameBoard,
  playerId: string,
  fromEdgeKey: EdgeKey
): EdgeKey[] {
  // Build the set of player ship edges EXCLUDING the one being moved
  const remaining = Object.values(board.edges).filter(
    (e) => e.ship?.owner === playerId && e.key !== fromEdgeKey
  );
  // Valid destinations: water edges connected to remaining network (same rules as validShipEdges but using remaining set)
  return Object.values(board.edges)
    .filter((e) => {
      if (e.ship !== null || e.road !== null) return false;
      if (!e.isWaterEdge) return false;
      if (e.key === fromEdgeKey) return false;
      return e.adjacentVertexKeys.some((vk) => {
        const vertex = board.vertices[vk];
        if (!vertex) return false;
        if (vertex.building?.owner === playerId) return true;
        const hasOwnShip = remaining.some(
          (re) => re.adjacentVertexKeys.includes(vk)
        );
        if (!hasOwnShip) return false;
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
      // Seafarers: sea hexes are valid for pirate placement; land hexes for robber
      if (!state.seafarers && hex.terrain === 'sea') return false;
      if (state.seafarers && hex.terrain === 'sea') {
        // Pirate: must move to a different sea hex
        return hk !== state.pirateHexKey;
      }
      // Robber: cannot place on sea hex, must be different from current robber
      if (hex.terrain === 'sea') return false;
      if (hk === currentRobberKey) return false;

      if (state.friendlyRobber) {
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

/**
 * Returns all sea hex keys the active player may legally move the pirate to (seafarers).
 * Excludes the current pirate hex.
 * The pirate steals from any player whose ship is adjacent to the target hex.
 */
export function validPirateHexKeys(state: GameState, playerId: string): HexKey[] {
  const currentPirateKey = state.pirateHexKey;

  return Object.entries(state.board.hexes)
    .filter(([hk, hex]) => {
      if (hex.terrain !== 'sea') return false;
      if (hk === currentPirateKey) return false;
      return true;
    })
    .map(([hk]) => hk);
}
