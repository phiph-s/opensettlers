import { TERRAIN_TO_RESOURCE, canAfford } from '@opensettlers/shared';
import type { GameBoard, GameState, Player, Resource } from '@opensettlers/shared';
import type { Cost } from '@opensettlers/shared';

export { canAfford };

export function deductCost(player: Player, cost: Cost): void {
  for (const [res, amount] of Object.entries(cost) as [Resource, number][]) {
    player.hand[res] = (player.hand[res] ?? 0) - amount;
  }
}

export function grantResources(player: Player, resources: Partial<Record<Resource, number>>): void {
  for (const [res, amount] of Object.entries(resources) as [Resource, number][]) {
    player.hand[res] = (player.hand[res] ?? 0) + amount;
  }
}

export function handTotal(player: Player): number {
  return Object.values(player.hand).reduce((sum, n) => sum + n, 0);
}

export function distributeResources(
  board: GameBoard,
  players: Player[],
  roll: number
): Record<string, Partial<Record<Resource, number>>> {
  const distributions: Record<string, Partial<Record<Resource, number>>> = {};

  for (const hex of Object.values(board.hexes)) {
    if (hex.hasRobber) continue;
    if (hex.numberToken !== roll) continue;
    const resource = (TERRAIN_TO_RESOURCE as Record<string, Resource | undefined>)[hex.terrain];
    if (!resource) continue;

    for (const vertex of Object.values(board.vertices)) {
      if (!vertex.adjacentHexKeys.includes(hex.coord.q + ',' + hex.coord.r + ',' + hex.coord.s)) continue;
      if (!vertex.building) continue;
      const amount = vertex.building.type === 'city' ? 2 : 1;
      const pid = vertex.building.owner;
      if (!distributions[pid]) distributions[pid] = {};
      distributions[pid]![resource] = (distributions[pid]![resource] ?? 0) + amount;
    }
  }

  // Actually grant the resources
  for (const player of players) {
    const dist = distributions[player.id];
    if (dist) grantResources(player, dist);
  }

  return distributions;
}

/** Cheapest resources to discard (prioritize excess of any type) */
export function autoDiscard(player: Player, count: number): Partial<Record<Resource, number>> {
  const resources: [Resource, number][] = (
    Object.entries(player.hand) as [Resource, number][]
  ).filter(([, n]) => n > 0);
  // Sort descending by count so we discard the most plentiful first
  resources.sort((a, b) => b[1] - a[1]);

  const result: Partial<Record<Resource, number>> = {};
  let remaining = count;
  for (const [res, avail] of resources) {
    if (remaining <= 0) break;
    const toDiscard = Math.min(avail, remaining);
    result[res] = toDiscard;
    remaining -= toDiscard;
  }
  return result;
}
