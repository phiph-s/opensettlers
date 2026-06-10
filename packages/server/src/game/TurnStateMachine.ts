import {
  validSetupVertices,
  validSetupRoads,
  validSettlementVertices,
  validCityVertices,
  validRoadEdges,
  cubeKey,
} from '@opensettlers/shared';
import type {
  CubeCoord,
  EdgeKey,
  GameState,
  TurnPhase,
  VertexKey,
} from '@opensettlers/shared';
import { BUILDING_COSTS } from '@opensettlers/shared';
import { canAfford } from './ResourceManager.js';

export function getActivePlayer(state: GameState) {
  return state.players[state.activePlayerIndex];
}

export function isActivePlayer(state: GameState, playerId: string): boolean {
  return getActivePlayer(state)?.id === playerId;
}

export function canRoll(state: GameState, playerId: string): boolean {
  return (
    (state.phase === 'PRE_ROLL' || state.phase === 'ROLL') &&
    isActivePlayer(state, playerId)
  );
}

export function canEndTurn(state: GameState, playerId: string): boolean {
  return state.phase === 'BUILD_PHASE' && isActivePlayer(state, playerId);
}

export function canBuild(
  state: GameState,
  playerId: string,
  type: 'road' | 'settlement' | 'city' | 'dev_card'
): boolean {
  if (state.phase !== 'BUILD_PHASE' && state.phase !== 'DEV_ROAD_BUILDING') return false;
  if (!isActivePlayer(state, playerId)) return false;
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return false;

  if (type === 'road') {
    return canAfford(player, BUILDING_COSTS.road) && player.roadsLeft > 0;
  }
  if (type === 'settlement') {
    return canAfford(player, BUILDING_COSTS.settlement) && player.settlementsLeft > 0;
  }
  if (type === 'city') {
    return canAfford(player, BUILDING_COSTS.city) && player.citiesLeft > 0;
  }
  if (type === 'dev_card') {
    return (
      state.phase === 'BUILD_PHASE' &&
      canAfford(player, BUILDING_COSTS.dev_card) &&
      state.devCardDeckSize > 0
    );
  }
  return false;
}

export function canPlaceSettlementAt(
  state: GameState,
  playerId: string,
  vertexKey: VertexKey
): boolean {
  if (state.phase === 'SETUP_PLACE_SETTLEMENT') {
    if (!isActivePlayer(state, playerId)) return false;
    return validSetupVertices(state.board, state.cloudOriginKeys).includes(vertexKey);
  }
  if (state.phase === 'BUILD_PHASE') {
    if (!isActivePlayer(state, playerId)) return false;
    const player = state.players.find((p) => p.id === playerId);
    if (!player || !canAfford(player, BUILDING_COSTS.settlement) || player.settlementsLeft === 0) return false;
    return validSettlementVertices(state.board, playerId).includes(vertexKey);
  }
  return false;
}

export function canPlaceRoadAt(
  state: GameState,
  playerId: string,
  edgeKey: EdgeKey
): boolean {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return false;

  if (state.phase === 'SETUP_PLACE_ROAD') {
    if (!isActivePlayer(state, playerId)) return false;
    if (!state.lastPlacedSettlementKey) return false;
    return validSetupRoads(state.board, state.lastPlacedSettlementKey).includes(edgeKey);
  }
  if (state.phase === 'BUILD_PHASE') {
    if (!isActivePlayer(state, playerId)) return false;
    if (!canAfford(player, BUILDING_COSTS.road) || player.roadsLeft === 0) return false;
    return validRoadEdges(state.board, playerId).includes(edgeKey);
  }
  if (state.phase === 'DEV_ROAD_BUILDING') {
    if (!isActivePlayer(state, playerId)) return false;
    if (player.roadsLeft === 0) return false;
    return validRoadEdges(state.board, playerId).includes(edgeKey);
  }
  return false;
}

export function canPlaceCityAt(
  state: GameState,
  playerId: string,
  vk: VertexKey
): boolean {
  if (state.phase !== 'BUILD_PHASE') return false;
  if (!isActivePlayer(state, playerId)) return false;
  const player = state.players.find((p) => p.id === playerId);
  if (!player || !canAfford(player, BUILDING_COSTS.city) || player.citiesLeft === 0) return false;
  return validCityVertices(state.board, playerId).includes(vk);
}

export function canMoveRobberTo(state: GameState, playerId: string, hexCoord: CubeCoord): boolean {
  if (state.phase !== 'ROBBER_PLACEMENT') return false;
  if (!isActivePlayer(state, playerId)) return false;
  const hk = cubeKey(hexCoord);
  const hex = state.board.hexes[hk];
  if (!hex || hex.terrain === 'sea') return false;
  // Must move to a different hex
  const currentRobberHex = Object.values(state.board.hexes).find((h) => h.hasRobber);
  if (currentRobberHex && cubeKey(currentRobberHex.coord) === hk) return false;
  return true;
}

/** Returns the next active player index for setup snake draft */
export function nextSetupPlayerIndex(state: GameState): {
  index: number;
  round: 1 | 2;
  direction: 'clockwise' | 'counter_clockwise';
  done: boolean;
} {
  const n = state.players.length;
  const { activePlayerIndex: cur, setupRound, setupDirection } = state;

  if (setupRound === 1) {
    if (cur < n - 1) {
      return { index: cur + 1, round: 1, direction: 'clockwise', done: false };
    }
    // Reached the last player in round 1 — start round 2 (same player goes again)
    return { index: cur, round: 2, direction: 'counter_clockwise', done: false };
  } else {
    if (cur > 0) {
      return { index: cur - 1, round: 2, direction: 'counter_clockwise', done: false };
    }
    return { index: 0, round: 2, direction: 'counter_clockwise', done: true };
  }
}
