import {
  validSetupVertices,
  validSetupRoads,
  validSettlementVertices,
  validCityVertices,
  validRoadEdges,
  BUILDING_COSTS,
  hexVertexKeys,
} from '@opensettlers/shared';
import type { CubeCoord, GameState, Resource, Player } from '@opensettlers/shared';
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

/** Standard pip count for a number token (probability weight). */
function pips(token: number | null): number {
  if (!token) return 0;
  return [0, 0, 1, 2, 3, 4, 5, 0, 5, 4, 3, 2, 1][token] ?? 0;
}

/** Score a vertex: sum of pips on adjacent productive hexes + diversity bonus. */
function scoreVertex(state: GameState, vk: string): number {
  const vertex = state.board.vertices[vk];
  if (!vertex) return 0;
  const resources = new Set<Resource>();
  let score = 0;
  for (const hk of vertex.adjacentHexKeys) {
    const hex = state.board.hexes[hk];
    if (!hex) continue;
    const p = pips(hex.numberToken);
    score += p;
    // Count resource diversity (gold counts as wildcard)
    if (hex.terrain === 'gold') {
      score += 3; // bonus for gold adjacency
    } else {
      const resMap: Record<string, Resource> = {
        forest: 'wood', hills: 'brick', fields: 'wheat', pasture: 'sheep', mountains: 'ore',
      };
      const res = resMap[hex.terrain];
      if (res) resources.add(res);
    }
  }
  // Diversity bonus: +1 per unique resource type (max 3 hexes per vertex)
  score += resources.size;
  return score;
}

/** Find which resources we're weakest in (least pip coverage). */
function weakResources(state: GameState, playerId: string): Set<Resource> {
  const pipsByRes: Partial<Record<Resource, number>> = {};
  for (const hex of Object.values(state.board.hexes)) {
    for (const vk of hexVertexKeys(hex.coord)) {
      const v = state.board.vertices[vk];
      if (v?.building?.owner !== playerId) continue;
      const resMap: Record<string, Resource> = {
        forest: 'wood', hills: 'brick', fields: 'wheat', pasture: 'sheep', mountains: 'ore',
      };
      const res = resMap[hex.terrain];
      if (res) {
        const mult = v.building.type === 'city' ? 2 : 1;
        pipsByRes[res] = (pipsByRes[res] ?? 0) + pips(hex.numberToken) * mult;
      }
    }
  }
  const weak = new Set<Resource>();
  for (const r of RESOURCES) {
    if ((pipsByRes[r] ?? 0) < 3) weak.add(r);
  }
  return weak;
}

/** Determine if robber is on a hex adjacent to our own buildings. */
function robberOnOwnHex(state: GameState, playerId: string): boolean {
  for (const hex of Object.values(state.board.hexes)) {
    if (!hex.hasRobber) continue;
    for (const vk of hexVertexKeys(hex.coord)) {
      const v = state.board.vertices[vk];
      if (v?.building?.owner === playerId) return true;
    }
  }
  return false;
}

/** Score a hex for robber placement: higher = better target. Does not target own hexes. */
function scoreRobberHex(state: GameState, hk: string, playerId: string): number {
  const hex = state.board.hexes[hk];
  if (!hex || hex.terrain === 'sea' || hex.terrain === 'clouds' || hex.hasRobber) return -1;

  // Never place on own hexes
  for (const vk of hexVertexKeys(hex.coord)) {
    const v = state.board.vertices[vk];
    if (v?.building?.owner === playerId) return -1;
  }

  // Score = sum of (pip-weight × building-value) for opponent buildings
  const p = pips(hex.numberToken);
  let score = 0;
  for (const vk of hexVertexKeys(hex.coord)) {
    const v = state.board.vertices[vk];
    if (v?.building && v.building.owner !== playerId) {
      score += p * (v.building.type === 'city' ? 2 : 1);
    }
  }
  return score;
}

/** Try a 4:1 maritime trade to get one resource we need toward a goal. */
function tryMaritimeTrade(
  state: GameState,
  me: Player,
  needed: Partial<Record<Resource, number>>,
  engine: GameEngine,
  playerId: string
): boolean {
  // Find what we need
  const missing = (Object.entries(needed) as [Resource, number][]).filter(
    ([r, n]) => (me.hand[r] ?? 0) < n
  );
  if (missing.length === 0) return false;

  // Find what we have 4+ of
  const surplus = (RESOURCES.filter((r) => (me.hand[r] ?? 0) >= 4)) as Resource[];
  if (surplus.length === 0) return false;

  // Trade surplus for first missing resource
  const [targetRes] = missing[0]!;
  const giveRes = surplus[0]!;
  if (giveRes === targetRes) return false;

  const err = engine.handleMaritimeTrade(playerId, { [giveRes]: 4 }, { [targetRes]: 1 });
  return err === null;
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
        const vertices = validSetupVertices(state.board, state.cloudOriginKeys);
        if (vertices.length === 0) return;
        // Score all candidates and pick the best
        let best = vertices[0]!;
        let bestScore = -1;
        const weak = weakResources(state, this.playerId);
        for (const vk of vertices) {
          let score = scoreVertex(state, vk);
          // Extra bonus for covering weak resources
          const vertex = state.board.vertices[vk];
          if (vertex) {
            const resMap: Record<string, Resource> = {
              forest: 'wood', hills: 'brick', fields: 'wheat', pasture: 'sheep', mountains: 'ore',
            };
            for (const hk of vertex.adjacentHexKeys) {
              const hex = state.board.hexes[hk];
              const res = hex ? resMap[hex.terrain] : undefined;
              if (res && weak.has(res)) score += 2;
            }
          }
          if (score > bestScore) { bestScore = score; best = vk; }
        }
        this.engine.handlePlaceSetupSettlement(this.playerId, best);
        break;
      }

      case 'SETUP_PLACE_ROAD': {
        if (!isActive) return;
        const edges = validSetupRoads(state.board, state.lastPlacedSettlementKey ?? '');
        if (edges.length === 0) return;
        // Pick road toward the highest-scoring reachable future settlement spot
        let bestEdge = edges[0]!;
        let bestScore = -1;
        for (const ek of edges) {
          const edge = state.board.edges[ek];
          if (!edge) continue;
          // Score = best setup vertex reachable from this edge's far endpoint
          for (const vk of edge.adjacentVertexKeys) {
            if (vk === state.lastPlacedSettlementKey) continue;
            const vertex = state.board.vertices[vk];
            if (!vertex) continue;
            // Look at vertices adjacent to the far endpoint
            for (const avk of vertex.adjacentVertexKeys) {
              const av = state.board.vertices[avk];
              if (!av || av.building !== null) continue;
              const s = scoreVertex(state, avk);
              if (s > bestScore) { bestScore = s; bestEdge = ek; }
            }
          }
        }
        this.engine.handlePlaceSetupRoad(this.playerId, bestEdge);
        break;
      }

      case 'PRE_ROLL':
      case 'ROLL': {
        if (!isActive) return;
        // Play Knight before rolling if robber is on one of our hexes
        const knightCard = me.devCards.find(
          (c) => c.type === 'knight' && c.turnDrawn < state.turnNumber
        );
        if (state.phase === 'PRE_ROLL' && knightCard && robberOnOwnHex(state, this.playerId)) {
          this.engine.handlePlayKnight(this.playerId);
          return;
        }
        this.engine.handleRoll(this.playerId);
        break;
      }

      case 'DISCARD_PHASE': {
        const needed = state.pendingDiscards[this.playerId];
        if (needed === undefined) return;
        const toDiscard: Partial<Record<Resource, number>> = {};
        let remaining = needed;
        // Discard most abundant first, prioritizing resources we have excess of
        const sorted = RESOURCES
          .map((r) => [r, me.hand[r] ?? 0] as [Resource, number])
          .sort((a, b) => b[1] - a[1]);
        for (const [res, have] of sorted) {
          if (remaining === 0) break;
          const take = Math.min(have, remaining);
          if (take > 0) { toDiscard[res] = take; remaining -= take; }
        }
        this.engine.handleDiscard(this.playerId, toDiscard);
        break;
      }

      case 'GOLD_SELECT': {
        const needed = state.pendingGoldChoices[this.playerId];
        if (needed === undefined) return;
        // Pick resources we're most deficient in
        const weak = weakResources(state, this.playerId);
        const priority: Resource[] = [
          ...RESOURCES.filter((r) => weak.has(r)),
          ...RESOURCES.filter((r) => !weak.has(r)),
        ];
        const picks: Resource[] = [];
        for (let i = 0; i < needed; i++) picks.push(priority[i % priority.length]!);
        this.engine.handleGoldSelect(this.playerId, picks);
        break;
      }

      case 'ROBBER_PLACEMENT': {
        if (!isActive) return;
        const board = state.board;
        let bestCoord: CubeCoord | null = null;
        let bestScore = -1;
        for (const [hk, hex] of Object.entries(board.hexes)) {
          const score = scoreRobberHex(state, hk, this.playerId);
          if (score > bestScore) { bestScore = score; bestCoord = hex.coord; }
        }
        // Fallback: pick any non-sea, non-robber hex we don't own
        if (bestCoord === null || bestScore < 0) {
          for (const hex of Object.values(board.hexes)) {
            if (hex.terrain !== 'sea' && !hex.hasRobber) {
              // Ensure no own buildings
              const hasOwn = hexVertexKeys(hex.coord).some(
                (vk) => board.vertices[vk]?.building?.owner === this.playerId
              );
              if (!hasOwn) { bestCoord = hex.coord; break; }
            }
          }
          // Last resort: any non-sea hex
          if (bestCoord === null) {
            bestCoord = Object.values(board.hexes).find(
              (h) => h.terrain !== 'sea' && !h.hasRobber
            )?.coord ?? null;
          }
        }
        if (bestCoord) this.engine.handleMoveRobber(this.playerId, bestCoord);
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

        // Determine build goal priority
        const canSettlement = me.settlementsLeft > 0 && validSettlementVertices(board, this.playerId).length > 0;
        const canCity = me.citiesLeft > 0 && validCityVertices(board, this.playerId).length > 0;
        const canRoad = me.roadsLeft > 0 && validRoadEdges(board, this.playerId).length > 0;

        // 1. Build settlement if affordable
        if (canAfford(me.hand, BUILDING_COSTS.settlement) && canSettlement) {
          const verts = validSettlementVertices(board, this.playerId);
          let best = verts[0]!;
          let bestScore = -1;
          for (const vk of verts) {
            const s = scoreVertex(state, vk);
            if (s > bestScore) { bestScore = s; best = vk; }
          }
          this.engine.handleBuildSettlement(this.playerId, best);
          return;
        }

        // 2. Build city if affordable
        if (canAfford(me.hand, BUILDING_COSTS.city) && canCity) {
          const verts = validCityVertices(board, this.playerId);
          // Upgrade the settlement on the highest-pip hex
          let best = verts[0]!;
          let bestScore = -1;
          for (const vk of verts) {
            const s = scoreVertex(state, vk);
            if (s > bestScore) { bestScore = s; best = vk; }
          }
          this.engine.handleBuildCity(this.playerId, best);
          return;
        }

        // 3. Try maritime trade toward settlement (if we can get there in 1 trade)
        if (canSettlement) {
          if (tryMaritimeTrade(state, me, BUILDING_COSTS.settlement, this.engine, this.playerId)) return;
        } else if (canCity) {
          if (tryMaritimeTrade(state, me, BUILDING_COSTS.city, this.engine, this.playerId)) return;
        }

        // 4. Build road if affordable and useful (more roads = more settlement spots)
        if (canAfford(me.hand, BUILDING_COSTS.road) && canRoad) {
          const edges = validRoadEdges(board, this.playerId);
          this.engine.handleBuildRoad(this.playerId, edges[0]!);
          return;
        }

        // 5. Buy dev card if affordable and deck not empty
        if (canAfford(me.hand, BUILDING_COSTS.dev_card) && state.devCardDeckSize > 0) {
          const err = this.engine.handleBuyDevCard(this.playerId);
          if (err === null) return;
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
