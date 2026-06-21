import { cubeKey } from '@opensettlers/shared';
import type { CubeCoord, GameState } from '@opensettlers/shared';
import { handTotal } from './ResourceManager.js';
import { MAX_HAND_SIZE_BEFORE_DISCARD } from '@opensettlers/shared';

/** Returns player IDs who need to discard after a 7 roll */
export function computePendingDiscards(state: GameState): Record<string, number> {
  const pending: Record<string, number> = {};
  for (const p of state.players) {
    const total = handTotal(p);
    if (total > MAX_HAND_SIZE_BEFORE_DISCARD) {
      pending[p.id] = Math.floor(total / 2);
    }
  }
  return pending;
}

/** Returns player IDs adjacent to the robber's new hex (excluding active player) */
export function computeRobberCandidates(state: GameState, hexCoord: CubeCoord): string[] {
  const hk = cubeKey(hexCoord);
  const activeId = state.players[state.activePlayerIndex]?.id;
  const candidates = new Set<string>();

  for (const vertex of Object.values(state.board.vertices)) {
    if (!vertex.adjacentHexKeys.includes(hk)) continue;
    if (!vertex.building) continue;
    const ownerId = vertex.building.owner;
    if (ownerId === activeId) continue;
    const owner = state.players.find((p) => p.id === ownerId);
    if (!owner || handTotal(owner) <= 0) continue;
    // Friendly robber: players with ≤ 3 VP are protected and can't be stolen from,
    // even when they share a hex with a targetable (> 3 VP) player.
    if (state.friendlyRobber && owner.victoryPoints <= 3) continue;
    candidates.add(ownerId);
  }

  return Array.from(candidates);
}
