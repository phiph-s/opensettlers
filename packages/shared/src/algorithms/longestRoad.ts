import type { EdgeKey, GameBoard, VertexKey } from '../types/board.js';

/**
 * Computes the longest continuous trade-route length for a player.
 * In Seafarers mode, roads and ships are counted together. A road network
 * can only connect to a ship network through a settlement/city owned by
 * the same player (mode-switch bridge rule).
 */
export function longestRoadForPlayer(board: GameBoard, playerId: string): number {
  const playerEdges = Object.values(board.edges).filter(
    (e) => e.road?.owner === playerId || e.ship?.owner === playerId
  );
  if (playerEdges.length === 0) return 0;

  // Build adjacency: vertex -> edges owned by player
  const vertexToEdges = new Map<VertexKey, EdgeKey[]>();
  for (const edge of playerEdges) {
    for (const vk of edge.adjacentVertexKeys) {
      if (!vertexToEdges.has(vk)) vertexToEdges.set(vk, []);
      vertexToEdges.get(vk)!.push(edge.key);
    }
  }

  let max = 0;
  const visited = new Set<EdgeKey>();

  // mode: 'road' or 'ship' — which segment type we're currently traversing
  function dfs(currentVertex: VertexKey, mode: 'road' | 'ship'): number {
    const vertex = board.vertices[currentVertex];
    // Blocked by opponent building (same rule for roads and ships)
    if (vertex?.building && vertex.building.owner !== playerId) return 0;

    const canSwitch = !!vertex?.building && vertex.building.owner === playerId;
    const edges = vertexToEdges.get(currentVertex) ?? [];
    let best = 0;

    for (const ek of edges) {
      if (visited.has(ek)) continue;
      const edge = board.edges[ek];
      if (!edge) continue;

      const edgeMode: 'road' | 'ship' = edge.ship?.owner === playerId ? 'ship' : 'road';
      // Can only traverse edges matching current mode, or switch mode at an own building
      if (edgeMode !== mode && !canSwitch) continue;

      const nextVertex = edge.adjacentVertexKeys[0] === currentVertex
        ? edge.adjacentVertexKeys[1]
        : edge.adjacentVertexKeys[0];
      visited.add(ek);
      best = Math.max(best, 1 + dfs(nextVertex, edgeMode));
      visited.delete(ek);
    }
    return best;
  }

  // Try starting from every vertex that has player roads/ships, in both modes
  for (const vk of vertexToEdges.keys()) {
    max = Math.max(max, dfs(vk, 'road'), dfs(vk, 'ship'));
  }

  return max;
}

/** Recomputes longest road for all players and returns { owner, length } */
export function computeLongestRoad(
  board: GameBoard,
  playerIds: string[],
  currentOwner: string | null,
  currentLength: number
): { owner: string | null; length: number } {
  const MINIMUM = 5;
  let bestPlayerId: string | null = currentOwner;
  let bestLength = currentLength;

  for (const pid of playerIds) {
    const len = longestRoadForPlayer(board, pid);
    if (len >= MINIMUM && len > bestLength) {
      bestLength = len;
      bestPlayerId = pid;
    }
  }

  // If current owner's road was broken and someone else ties, keep current owner
  if (bestPlayerId && longestRoadForPlayer(board, bestPlayerId) < MINIMUM) {
    // Find new best
    let newBest: string | null = null;
    let newLen = MINIMUM - 1;
    for (const pid of playerIds) {
      const len = longestRoadForPlayer(board, pid);
      if (len >= MINIMUM && len > newLen) {
        newLen = len;
        newBest = pid;
      }
    }
    return { owner: newBest, length: newLen };
  }

  return { owner: bestPlayerId, length: bestLength };
}
