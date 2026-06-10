import { TERRAIN_TO_RESOURCE, canAfford, hexVertexKeys } from '@opensettlers/shared';
import type { GameBoard, Player, Resource } from '@opensettlers/shared';
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
  roll: number,
  bank: Record<Resource, number>
): Record<string, Partial<Record<Resource, number>>> {
  // First pass: calculate total demand per resource
  const demand: Partial<Record<Resource, number>> = {};
  const rawDist: Record<string, Partial<Record<Resource, number>>> = {};

  for (const hex of Object.values(board.hexes)) {
    if (hex.hasRobber || hex.numberToken !== roll) continue;
    const resource = (TERRAIN_TO_RESOURCE as Record<string, Resource | undefined>)[hex.terrain];
    if (!resource) continue;

    for (const vk of hexVertexKeys(hex.coord)) {
      const vertex = board.vertices[vk];
      if (!vertex?.building) continue;
      const amount = vertex.building.type === 'city' ? 2 : 1;
      const pid = vertex.building.owner;
      demand[resource] = (demand[resource] ?? 0) + amount;
      if (!rawDist[pid]) rawDist[pid] = {};
      rawDist[pid]![resource] = (rawDist[pid]![resource] ?? 0) + amount;
    }
  }

  // Second pass: official rule — if total demand exceeds bank supply, nobody gets that resource
  const distributions: Record<string, Partial<Record<Resource, number>>> = {};
  for (const [pid, dist] of Object.entries(rawDist)) {
    const filtered: Partial<Record<Resource, number>> = {};
    for (const [res, amt] of Object.entries(dist) as [Resource, number][]) {
      if ((demand[res] ?? 0) <= (bank[res] ?? 0)) {
        filtered[res] = amt;
      }
    }
    if (Object.keys(filtered).length > 0) distributions[pid] = filtered;
  }

  // Grant resources and deduct from bank
  for (const player of players) {
    const dist = distributions[player.id];
    if (!dist) continue;
    grantResources(player, dist);
    for (const [res, amt] of Object.entries(dist) as [Resource, number][]) {
      bank[res] = (bank[res] ?? 0) - amt;
    }
  }

  return distributions;
}

/**
 * Returns a map of playerId -> number of resources they may pick freely
 * because of adjacent gold hexes matching the roll.
 */
export function computeGoldChoices(
  board: GameBoard,
  players: Player[],
  roll: number,
): Record<string, number> {
  const choices: Record<string, number> = {};
  for (const hex of Object.values(board.hexes)) {
    if (hex.terrain !== 'gold' || hex.hasRobber || hex.numberToken !== roll) continue;
    for (const vk of hexVertexKeys(hex.coord)) {
      const vertex = board.vertices[vk];
      if (!vertex?.building) continue;
      const amount = vertex.building.type === 'city' ? 2 : 1;
      const pid = vertex.building.owner;
      choices[pid] = (choices[pid] ?? 0) + amount;
    }
  }
  return choices;
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
