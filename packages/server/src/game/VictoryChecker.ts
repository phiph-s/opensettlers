import type { GameState, Player, VictoryBreakdown } from '@opensettlers/shared';

export function computeVP(state: GameState, player: Player): VictoryBreakdown {
  let settlements = 0;
  let cities = 0;
  for (const vertex of Object.values(state.board.vertices)) {
    if (vertex.building?.owner !== player.id) continue;
    if (vertex.building.type === 'settlement') settlements++;
    else cities++;
  }

  const longestRoad = player.hasLongestRoad ? 2 : 0;
  const largestArmy = player.hasLargestArmy ? 2 : 0;
  const vpCards = player.devCards.filter((c) => c.type === 'victory_point').length;

  // Seafarers discovery bonus: 2 VP per island first-settled by this player
  let discoveryVP = 0;
  if (state.seafarers && state.discoveryBonus) {
    for (const ownerId of Object.values(state.claimedIslands)) {
      if (ownerId === player.id) discoveryVP += 2;
    }
  }

  return {
    settlements,
    cities,
    longestRoad,
    largestArmy,
    vpCards,
    total: settlements + cities * 2 + longestRoad + largestArmy + vpCards + discoveryVP,
  };
}

export function checkWin(state: GameState): string | null {
  for (const player of state.players) {
    const breakdown = computeVP(state, player);
    player.victoryPoints = breakdown.total;
    if (breakdown.total >= state.winTarget) return player.id;
  }
  return null;
}
