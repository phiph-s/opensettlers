import {
  validSetupVertices,
  validSetupRoads,
  validSettlementVertices,
  validCityVertices,
  validRoadEdges,
  BUILDING_COSTS,
} from '@opensettlers/shared';
import type { CubeCoord, Resource } from '@opensettlers/shared';
import type { GameEngine } from './GameEngine.js';

const RESOURCES: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];

function canAfford(hand: Partial<Record<Resource, number>>, cost: Partial<Record<string, number>>): boolean {
  for (const [r, n] of Object.entries(cost)) {
    if ((hand[r as Resource] ?? 0) < (n ?? 0)) return false;
  }
  return true;
}

function handTotal(hand: Partial<Record<Resource, number>>): number {
  return RESOURCES.reduce((s, r) => s + (hand[r] ?? 0), 0);
}

export class BotController {
  private active = false;
  private pendingAction = false;

  constructor(
    private readonly engine: GameEngine,
    private readonly playerId: string,
  ) {}

  start(): void {
    this.active = true;
    this.scheduleAct();
  }

  stop(): void {
    this.active = false;
  }

  onStateChange(): void {
    if (!this.active || this.pendingAction) return;
    this.scheduleAct();
  }

  private scheduleAct(): void {
    if (!this.active) return;
    this.pendingAction = true;
    const delay = 1500 + Math.random() * 1500;
    setTimeout(() => {
      this.pendingAction = false;
      if (this.active) this.act();
    }, delay);
  }

  private act(): void {
    const state = this.engine.getState();
    if (state.winner) return;

    const me = state.players.find((p) => p.id === this.playerId);
    if (!me) return;

    const activePlayer = state.players[state.activePlayerIndex];
    const isActive = activePlayer?.id === this.playerId;

    switch (state.phase) {
      case 'SETUP_PLACE_SETTLEMENT': {
        if (!isActive) return;
        const vertices = validSetupVertices(state.board);
        if (vertices.length > 0) {
          this.engine.handlePlaceSetupSettlement(this.playerId, vertices[0]!);
        }
        break;
      }

      case 'SETUP_PLACE_ROAD': {
        if (!isActive) return;
        const edges = validSetupRoads(state.board, state.lastPlacedSettlementKey ?? '');
        if (edges.length > 0) {
          this.engine.handlePlaceSetupRoad(this.playerId, edges[0]!);
        }
        break;
      }

      case 'PRE_ROLL':
      case 'ROLL': {
        if (!isActive) return;
        this.engine.handleRoll(this.playerId);
        break;
      }

      case 'DISCARD_PHASE': {
        const needed = state.pendingDiscards[this.playerId];
        if (needed === undefined) return;
        const toDiscard: Partial<Record<Resource, number>> = {};
        let remaining = needed;
        // Discard cheapest/most abundant first
        const priority: Resource[] = ['sheep', 'wood', 'brick', 'wheat', 'ore'];
        for (const res of priority) {
          if (remaining === 0) break;
          const have = me.hand[res] ?? 0;
          const take = Math.min(have, remaining);
          if (take > 0) {
            toDiscard[res] = take;
            remaining -= take;
          }
        }
        this.engine.handleDiscard(this.playerId, toDiscard);
        break;
      }

      case 'ROBBER_PLACEMENT': {
        if (!isActive) return;
        const board = state.board;
        // Build hex -> vertex keys map via vertex adjacency
        const hexToVerts = new Map<string, string[]>();
        for (const [vk, v] of Object.entries(board.vertices)) {
          for (const hk of v.adjacentHexKeys) {
            const arr = hexToVerts.get(hk) ?? [];
            arr.push(vk);
            hexToVerts.set(hk, arr);
          }
        }
        let bestCoord: CubeCoord | null = null;
        let bestScore = -1;
        for (const [hk, hex] of Object.entries(board.hexes)) {
          if (hex.terrain === 'sea' || hex.hasRobber) continue;
          let score = 0;
          for (const vk of (hexToVerts.get(hk) ?? [])) {
            const v = board.vertices[vk];
            if (v?.building && v.building.owner !== this.playerId) {
              score += v.building.type === 'city' ? 2 : 1;
            }
          }
          if (score > bestScore) {
            bestScore = score;
            bestCoord = hex.coord;
          }
        }
        if (bestCoord) {
          this.engine.handleMoveRobber(this.playerId, bestCoord);
        }
        break;
      }

      case 'STEAL': {
        if (!isActive) return;
        const candidates = state.robberCandidates;
        if (candidates.length === 0) return;
        const richest = candidates.reduce((best, pid) => {
          const p = state.players.find((pl) => pl.id === pid);
          const t = p ? handTotal(p.hand) : 0;
          const bp = state.players.find((pl) => pl.id === best);
          const bt = bp ? handTotal(bp.hand) : 0;
          return t > bt ? pid : best;
        }, candidates[0]!);
        this.engine.handleSteal(this.playerId, richest);
        break;
      }

      case 'BUILD_PHASE': {
        if (!isActive) return;
        const board = state.board;

        // Settlement > City > Road > End Turn
        if (canAfford(me.hand, BUILDING_COSTS.settlement) && me.settlementsLeft > 0) {
          const verts = validSettlementVertices(board, this.playerId);
          if (verts.length > 0) {
            this.engine.handleBuildSettlement(this.playerId, verts[0]!);
            return;
          }
        }
        if (canAfford(me.hand, BUILDING_COSTS.city) && me.citiesLeft > 0) {
          const verts = validCityVertices(board, this.playerId);
          if (verts.length > 0) {
            this.engine.handleBuildCity(this.playerId, verts[0]!);
            return;
          }
        }
        if (canAfford(me.hand, BUILDING_COSTS.road) && me.roadsLeft > 0) {
          const edges = validRoadEdges(board, this.playerId);
          if (edges.length > 0) {
            this.engine.handleBuildRoad(this.playerId, edges[0]!);
            return;
          }
        }
        this.engine.handleEndTurn(this.playerId);
        break;
      }

      case 'DEV_ROAD_BUILDING': {
        if (!isActive) return;
        if (me.roadsLeft > 0) {
          const edges = validRoadEdges(state.board, this.playerId);
          if (edges.length > 0) {
            this.engine.handleBuildRoad(this.playerId, edges[0]!);
            return;
          }
        }
        // No roads left or no valid edges — force end turn to unstick
        this.engine.handleEndTurn(this.playerId);
        break;
      }
    }
  }
}
