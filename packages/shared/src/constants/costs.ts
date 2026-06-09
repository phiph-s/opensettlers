import type { Resource } from '../types/primitives.js';
import type { Player } from '../types/player.js';

export type Cost = Partial<Record<Resource, number>>;

export const BUILDING_COSTS = {
  road: { wood: 1, brick: 1 } as Cost,
  settlement: { wood: 1, brick: 1, wheat: 1, sheep: 1 } as Cost,
  city: { ore: 3, wheat: 2 } as Cost,
  dev_card: { ore: 1, wheat: 1, sheep: 1 } as Cost,
} as const;

export function canAfford(player: Player, cost: Cost): boolean {
  for (const [res, amount] of Object.entries(cost) as [Resource, number][]) {
    if ((player.hand[res] ?? 0) < amount) return false;
  }
  return true;
}
