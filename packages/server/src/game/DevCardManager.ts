import { DEV_CARD_COUNTS, LARGEST_ARMY_MINIMUM } from '@opensettlers/shared';
import type { DevCardType, GameState, Player } from '@opensettlers/shared';

export function buildDeck(): DevCardType[] {
  const deck: DevCardType[] = [];
  for (const [type, count] of Object.entries(DEV_CARD_COUNTS) as [DevCardType, number][]) {
    for (let i = 0; i < count; i++) deck.push(type);
  }
  return deck;
}

export function shuffleDeck(deck: DevCardType[], rng: () => number): DevCardType[] {
  const a = [...deck];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

export function canPlayDevCard(player: Player, cardType: DevCardType, turnNumber: number): string | null {
  const card = player.devCards.find(
    (c) => c.type === cardType && (cardType === 'victory_point' || c.turnDrawn < turnNumber)
  );
  if (!card) return 'Card not in hand or drawn this turn';
  return null;
}

export function removeDevCard(player: Player, cardType: DevCardType, turnNumber: number): boolean {
  const idx = player.devCards.findIndex(
    (c) => c.type === cardType && (cardType === 'victory_point' || c.turnDrawn < turnNumber)
  );
  if (idx === -1) return false;
  player.devCards.splice(idx, 1);
  return true;
}

export function updateLargestArmy(state: GameState): boolean {
  const currentOwner = state.largestArmyOwner;
  const currentSize = state.largestArmySize;
  let changed = false;

  for (const player of state.players) {
    if (
      player.knightsPlayed >= LARGEST_ARMY_MINIMUM &&
      player.knightsPlayed > currentSize
    ) {
      if (currentOwner && currentOwner !== player.id) {
        const prev = state.players.find((p) => p.id === currentOwner);
        if (prev) prev.hasLargestArmy = false;
      }
      state.largestArmyOwner = player.id;
      state.largestArmySize = player.knightsPlayed;
      player.hasLargestArmy = true;
      changed = true;
    }
  }
  return changed;
}
