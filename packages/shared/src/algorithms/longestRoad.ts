import type { EdgeKey, GameBoard, VertexKey } from '../types/board.js';

/**
 * Computes the longest continuous road length for a player.
 *
 * Rules:
 * - Only traverses edges owned by the player.
 * - Opponent settlements/cities on vertices block traversal through that vertex.
 * - Own settlements/cities do NOT block.
 * - Uses backtracking DFS; each edge can only be used once per path.
 */
export function longestRoadForPlayer(board: GameBoard, playerId: string): number {
  const playerEdges = Object.values(board.edges).filter((e) => e.road?.owner === playerId);
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

  function dfs(currentVertex: VertexKey): number {
    const vertex = board.vertices[currentVertex];
    // Blocked by opponent building
    if (vertex?.building && vertex.building.owner !== playerId) return 0;

    const edges = vertexToEdges.get(currentVertex) ?? [];
    let best = 0;
    for (const ek of edges) {
      if (visited.has(ek)) continue;
      const edge = board.edges[ek];
      if (!edge) continue;
      const nextVertex = edge.adjacentVertexKeys[0] === currentVertex
        ? edge.adjacentVertexKeys[1]
        : edge.adjacentVertexKeys[0];
      visited.add(ek);
      best = Math.max(best, 1 + dfs(nextVertex));
      visited.delete(ek);
    }
    return best;
  }

  // Try starting DFS from every vertex that has player roads
  for (const vk of vertexToEdges.keys()) {
    const length = dfs(vk);
    if (length > max) max = length;
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
