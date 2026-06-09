import type { GameBoard, Player, PortType, Resource } from '@opensettlers/shared';
import { PORT_RESOURCE } from '@opensettlers/shared';

/** Returns the best maritime trade rate for a player/resource combo */
export function getBestMaritimeRate(player: Player, board: GameBoard, resource: Resource): number {
  // Check all vertices the player has buildings on
  let best = 4;
  for (const vertex of Object.values(board.vertices)) {
    if (vertex.building?.owner !== player.id) continue;
    if (!vertex.port) continue;
    const portType = vertex.port as PortType;
    if (portType === 'generic_3_1') {
      best = Math.min(best, 3);
    } else {
      const portResource = PORT_RESOURCE[portType];
      if (portResource === resource) best = Math.min(best, 2);
    }
  }
  return best;
}

export function validateMaritimeTrade(
  player: Player,
  board: GameBoard,
  giving: Partial<Record<Resource, number>>,
  receiving: Partial<Record<Resource, number>>
): string | null {
  // Must give exactly one resource type
  const giveEntries = Object.entries(giving).filter(([, n]) => (n ?? 0) > 0) as [Resource, number][];
  const receiveEntries = Object.entries(receiving).filter(([, n]) => (n ?? 0) > 0) as [Resource, number][];
  if (giveEntries.length !== 1) return 'Must give exactly one resource type';
  if (receiveEntries.length !== 1) return 'Must receive exactly one resource type';

  const [giveRes, giveAmt] = giveEntries[0]!;
  const [, receiveAmt] = receiveEntries[0]!;
  if (receiveAmt !== 1) return 'Must receive exactly 1 card';

  const rate = getBestMaritimeRate(player, board, giveRes);
  if (giveAmt !== rate) return `Maritime rate for ${giveRes} is ${rate}:1`;
  if ((player.hand[giveRes] ?? 0) < giveAmt) return 'Insufficient resources';
  return null;
}

export function validatePlayerTrade(
  offering: Partial<Record<Resource, number>>,
  requesting: Partial<Record<Resource, number>>
): string | null {
  const offerTotal = Object.values(offering).reduce((s, n) => s + (n ?? 0), 0);
  const requestTotal = Object.values(requesting).reduce((s, n) => s + (n ?? 0), 0);
  if (offerTotal === 0) return 'Must offer at least one resource';
  if (requestTotal === 0) return 'Must request at least one resource';
  return null;
}
