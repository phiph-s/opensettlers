import { useMemo } from 'react';
import {
  validSetupVertices,
  validSetupRoads,
  validSettlementVertices,
  validCityVertices,
  validRoadEdges,
  BUILDING_COSTS,
} from '@opensettlers/shared';
import type { Player, Resource } from '@opensettlers/shared';
import type { Cost } from '@opensettlers/shared';

function canAfford(player: Player, cost: Cost): boolean {
  for (const [res, amount] of Object.entries(cost) as [Resource, number][]) {
    if ((player.hand[res] ?? 0) < amount) return false;
  }
  return true;
}
import type { GameState, EdgeKey, VertexKey } from '@opensettlers/shared';

export interface ValidMoves {
  settlementVertices: Set<VertexKey>;
  roadEdges: Set<EdgeKey>;
  cityVertices: Set<VertexKey>;
  canRoll: boolean;
  canEndTurn: boolean;
  canBuyDevCard: boolean;
  canMaritimeTrade: boolean;
  canProposeTrade: boolean;
}

export function useValidMoves(state: GameState | null, myPlayerId: string | null): ValidMoves {
  return useMemo(() => {
    const empty: ValidMoves = {
      settlementVertices: new Set(),
      roadEdges: new Set(),
      cityVertices: new Set(),
      canRoll: false,
      canEndTurn: false,
      canBuyDevCard: false,
      canMaritimeTrade: false,
      canProposeTrade: false,
    };

    if (!state || !myPlayerId) return empty;
    const me = state.players.find((p) => p.id === myPlayerId);
    if (!me) return empty;
    const isActive = state.players[state.activePlayerIndex]?.id === myPlayerId;

    const { phase, board } = state;

    if (phase === 'SETUP_PLACE_SETTLEMENT' && isActive) {
      return {
        ...empty,
        settlementVertices: new Set(validSetupVertices(board, state.cloudOriginKeys)),
      };
    }

    if (phase === 'SETUP_PLACE_ROAD' && isActive && state.lastPlacedSettlementKey) {
      return {
        ...empty,
        roadEdges: new Set(validSetupRoads(board, state.lastPlacedSettlementKey)),
      };
    }

    if (phase === 'BUILD_PHASE' && isActive) {
      return {
        settlementVertices: canAfford(me, BUILDING_COSTS.settlement) && me.settlementsLeft > 0
          ? new Set(validSettlementVertices(board, myPlayerId))
          : new Set(),
        roadEdges: canAfford(me, BUILDING_COSTS.road) && me.roadsLeft > 0
          ? new Set(validRoadEdges(board, myPlayerId))
          : new Set(),
        cityVertices: canAfford(me, BUILDING_COSTS.city) && me.citiesLeft > 0
          ? new Set(validCityVertices(board, myPlayerId))
          : new Set(),
        canRoll: false,
        canEndTurn: true,
        canBuyDevCard: canAfford(me, BUILDING_COSTS.dev_card) && state.devCardDeckSize > 0,
        canMaritimeTrade: true,
        canProposeTrade: true,
      };
    }

    if (phase === 'DEV_ROAD_BUILDING' && isActive) {
      return {
        ...empty,
        roadEdges: me.roadsLeft > 0 ? new Set(validRoadEdges(board, myPlayerId)) : new Set(),
      };
    }

    if ((phase === 'PRE_ROLL' || phase === 'ROLL') && isActive) {
      return { ...empty, canRoll: true };
    }

    return empty;
  }, [state, myPlayerId]);
}

