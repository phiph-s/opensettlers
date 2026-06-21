import {
  validSetupVertices,
  validSetupRoads,
  validSettlementVertices,
  validCityVertices,
  validRoadEdges,
  validRobberHexKeys,
  BUILDING_COSTS,
  hexVertexKeys,
} from '@opensettlers/shared';
import type { CubeCoord, GameState, Resource, Player, TradeOffer } from '@opensettlers/shared';
import type { GameEngine } from './GameEngine.js';
import { getBestMaritimeRate } from './TradeManager.js';

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


/** Try a port-aware maritime trade to get one resource we need toward a goal. */
function tryMaritimeTrade(
  state: GameState,
  me: Player,
  needed: Partial<Record<Resource, number>>,
  engine: GameEngine,
  playerId: string
): boolean {
  // What we're still short of
  const missing = (Object.entries(needed) as [Resource, number][]).filter(
    ([r, n]) => (me.hand[r] ?? 0) < n
  );
  if (missing.length === 0) return false;
  const targetRes = missing[0]![0];

  // Pick the best resource to give away: tradeable at our actual port rate, with a
  // genuine surplus beyond what the goal still needs. Prefer the biggest surplus,
  // breaking ties toward the cheapest rate (so 2:1 / 3:1 ports get used).
  let bestGive: Resource | null = null;
  let bestRate = 4;
  let bestExcess = -1;
  for (const r of RESOURCES) {
    if (r === targetRes) continue;
    const rate = getBestMaritimeRate(me, state.board, r);
    const goalNeed = (needed as Partial<Record<Resource, number>>)[r] ?? 0;
    const excess = (me.hand[r] ?? 0) - goalNeed; // resources beyond the goal's own requirement
    if (excess < rate) continue;                 // can't give a full lot without starving the goal
    if (excess > bestExcess || (excess === bestExcess && rate < bestRate)) {
      bestGive = r;
      bestRate = rate;
      bestExcess = excess;
    }
  }
  if (!bestGive) return false;

  const err = engine.handleMaritimeTrade(playerId, { [bestGive]: bestRate }, { [targetRes]: 1 });
  return err === null;
}

/** Play Year of Plenty if available and we're missing 1–2 resources toward goal. */
function tryPlayYearOfPlenty(state: GameState, me: Player, playerId: string, engine: GameEngine): boolean {
  if (state.devCardPlayedThisTurn) return false;
  const card = me.devCards.find((c) => c.type === 'year_of_plenty' && c.turnDrawn < state.turnNumber);
  if (!card) return false;

  const goal = primaryGoalCost(state, me, playerId);
  if (!goal) return false;

  const missing = (Object.entries(goal) as [Resource, number][])
    .flatMap(([r, n]) => Array.from({ length: Math.max(0, n - (me.hand[r] ?? 0)) }, () => r as Resource));

  if (missing.length === 0 || missing.length > 2) return false;

  const r1 = missing[0]!;
  const r2 = missing[1] ?? missing[0]!;
  const err = engine.handlePlayYearOfPlenty(playerId, r1, r2);
  return err === null;
}

/** Play Monopoly if available and opponents collectively hold resources we need. */
function tryPlayMonopoly(state: GameState, me: Player, playerId: string, engine: GameEngine): boolean {
  if (state.devCardPlayedThisTurn) return false;
  const card = me.devCards.find((c) => c.type === 'monopoly' && c.turnDrawn < state.turnNumber);
  if (!card) return false;

  const goal = primaryGoalCost(state, me, playerId);
  if (!goal) return false;

  // Pick the resource we're missing that opponents hold the most of
  const missing = (Object.entries(goal) as [Resource, number][])
    .filter(([r, n]) => (me.hand[r] ?? 0) < n)
    .map(([r]) => r as Resource);
  if (missing.length === 0) return false;

  let bestRes: Resource = missing[0]!;
  let bestTotal = 0;
  for (const r of missing) {
    const total = state.players
      .filter((p) => p.id !== playerId)
      .reduce((sum, p) => sum + (p.hand[r] ?? 0), 0);
    if (total > bestTotal) { bestTotal = total; bestRes = r; }
  }

  if (bestTotal === 0) return false;
  const err = engine.handlePlayMonopoly(playerId, bestRes);
  return err === null;
}

/** Returns the bot's primary build goal cost (settlement > city > dev card). */
function primaryGoalCost(state: GameState, me: Player, playerId: string): Partial<Record<Resource, number>> | null {
  if (me.settlementsLeft > 0 && validSettlementVertices(state.board, playerId).length > 0) {
    return BUILDING_COSTS.settlement;
  }
  if (me.citiesLeft > 0 && validCityVertices(state.board, playerId).length > 0) {
    return BUILDING_COSTS.city;
  }
  if (state.devCardDeckSize > 0) return BUILDING_COSTS.dev_card;
  return null;
}

/** Total deficit of `hand` against `cost` (sum of missing amounts). */
function goalDeficit(cost: Partial<Record<Resource, number>>, hand: Partial<Record<Resource, number>>): number {
  return (Object.entries(cost) as [Resource, number][])
    .reduce((sum, [r, n]) => sum + Math.max(0, n - (hand[r] ?? 0)), 0);
}

/** Should this bot accept an incoming trade offer? Accept if it reduces goal deficit without going below 0 on any given resource. */
function shouldAcceptTrade(state: GameState, me: Player, offer: TradeOffer, playerId: string): boolean {
  for (const [r, n] of Object.entries(offer.requesting) as [Resource, number][]) {
    if ((me.hand[r] ?? 0) < n) return false;
  }
  const goal = primaryGoalCost(state, me, playerId);
  if (!goal) return false;

  const postHand: Partial<Record<Resource, number>> = { ...me.hand };
  for (const [r, n] of Object.entries(offer.requesting) as [Resource, number][]) {
    postHand[r as Resource] = (postHand[r as Resource] ?? 0) - n;
  }
  for (const [r, n] of Object.entries(offer.offering) as [Resource, number][]) {
    postHand[r as Resource] = (postHand[r as Resource] ?? 0) + n;
  }

  return goalDeficit(goal, postHand) < goalDeficit(goal, me.hand);
}

/** Propose a 1:1 player trade for a resource we're short of, giving a genuine surplus. */
function tryProposeTrade(state: GameState, me: Player, playerId: string, engine: GameEngine): boolean {
  const goal = primaryGoalCost(state, me, playerId);
  if (!goal) return false;

  // Resources we're short of for the goal, that at least one opponent actually holds.
  const wantRes = (Object.entries(goal) as [Resource, number][])
    .filter(([r, n]) => (me.hand[r] ?? 0) < n)
    .map(([r]) => r as Resource)
    .find((r) => state.players.some((p) => p.id !== playerId && (p.hand[r] ?? 0) > 0));
  if (!wantRes) return false;

  // Offer a resource we hold beyond the goal's need (keeping a 1-card buffer).
  for (const r of RESOURCES) {
    if (r === wantRes) continue;
    const have = me.hand[r] ?? 0;
    const goalNeed = (goal as Partial<Record<Resource, number>>)[r] ?? 0;
    if (have - 1 > goalNeed) {
      const err = engine.handleProposeTrade(playerId, { [r]: 1 }, { [wantRes]: 1 });
      if (err === null) return true;
    }
  }
  return false;
}

export class BotController {
  private active = false;
  private pendingAction = false;
  private tradeProposedThisTurn = false;
  private actTimer: ReturnType<typeof setTimeout> | null = null;

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
    this.pendingAction = false;
    if (this.actTimer) {
      clearTimeout(this.actTimer);
      this.actTimer = null;
    }
  }

  onStateChange(): void {
    if (!this.active || this.pendingAction) return;
    this.scheduleAct();
  }

  private scheduleAct(): void {
    if (!this.active) return;
    this.pendingAction = true;
    const delay = 1500 + Math.random() * 1500;
    this.actTimer = setTimeout(() => {
      this.actTimer = null;
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
        this.tradeProposedThisTurn = false;
        // Play Knight before rolling if robber is on one of our hexes
        const knightCard = me.devCards.find(
          (c) => c.type === 'knight' && c.turnDrawn < state.turnNumber
        );
        const knightsOwned = me.devCards.filter((c) => c.type === 'knight').length;
        const largestArmySize = state.players.reduce((max, p) => Math.max(max, p.knightsPlayed), 0);
        const shouldPlayKnight = knightCard && state.phase === 'PRE_ROLL' && (
          robberOnOwnHex(state, this.playerId) ||
          // Play proactively only when holding more than one knight (don't burn the only one)
          (knightsOwned > 1 && (
            (me.knightsPlayed < 3) ||
            (me.knightsPlayed <= largestArmySize && me.knightsPlayed + 1 >= 3)
          ))
        );
        if (shouldPlayKnight) {
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
        // validRobberHexKeys already applies the friendly-robber rule
        const candidates = validRobberHexKeys(state, this.playerId);
        // Never place on a hex adjacent to own buildings; fall back to full list only if no other option
        const safeFromOwn = candidates.filter((hk) => {
          const hex = board.hexes[hk];
          if (!hex) return false;
          return hexVertexKeys(hex.coord).every((vk) => {
            const v = board.vertices[vk];
            return !v?.building || v.building.owner !== this.playerId;
          });
        });
        const pool = safeFromOwn.length > 0 ? safeFromOwn : candidates;
        let bestCoord: CubeCoord | null = null;
        let bestScore = -1;
        for (const hk of pool) {
          const hex = board.hexes[hk];
          if (!hex) continue;
          // Score: pip-weight × opponent building value on this hex
          const p = pips(hex.numberToken);
          let score = 0;
          for (const vk of hexVertexKeys(hex.coord)) {
            const v = board.vertices[vk];
            if (v?.building && v.building.owner !== this.playerId) {
              score += p * (v.building.type === 'city' ? 2 : 1);
            }
          }
          if (score > bestScore) { bestScore = score; bestCoord = hex.coord; }
        }
        // Fallback: any hex from the safe pool
        if (!bestCoord && pool.length > 0) {
          bestCoord = board.hexes[pool[0]!]?.coord ?? null;
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

        // Loop: take as many actions as possible per act() call before ending turn.
        // Re-read state after each action since resources/hand change in-place.
        while (true) {
          const currentState = this.engine.getState();
          if (currentState.phase !== 'BUILD_PHASE') return; // phase changed (e.g. trade proposed)
          const currentMe = currentState.players.find((p) => p.id === this.playerId);
          if (!currentMe) return;
          const currentBoard = currentState.board;

          const canSettlement = currentMe.settlementsLeft > 0 && validSettlementVertices(currentBoard, this.playerId).length > 0;
          const canCity = currentMe.citiesLeft > 0 && validCityVertices(currentBoard, this.playerId).length > 0;
          const canRoad = currentMe.roadsLeft > 0 && validRoadEdges(currentBoard, this.playerId).length > 0;

          // 1. Build settlement
          if (canAfford(currentMe.hand, BUILDING_COSTS.settlement) && canSettlement) {
            const verts = validSettlementVertices(currentBoard, this.playerId);
            let best = verts[0]!;
            let bestScore = -1;
            for (const vk of verts) {
              const s = scoreVertex(currentState, vk);
              if (s > bestScore) { bestScore = s; best = vk; }
            }
            this.engine.handleBuildSettlement(this.playerId, best);
            continue;
          }

          // 2. Build city
          if (canAfford(currentMe.hand, BUILDING_COSTS.city) && canCity) {
            const verts = validCityVertices(currentBoard, this.playerId);
            let best = verts[0]!;
            let bestScore = -1;
            for (const vk of verts) {
              const s = scoreVertex(currentState, vk);
              if (s > bestScore) { bestScore = s; best = vk; }
            }
            this.engine.handleBuildCity(this.playerId, best);
            continue;
          }

          // 3. Play Year of Plenty if it unlocks an immediate build goal
          if (tryPlayYearOfPlenty(currentState, currentMe, this.playerId, this.engine)) continue;

          // 4. Play Monopoly if opponents hold resources we need
          if (tryPlayMonopoly(currentState, currentMe, this.playerId, this.engine)) continue;

          // 5. Maritime trade toward top-priority build goal
          if (canSettlement) {
            if (tryMaritimeTrade(currentState, currentMe, BUILDING_COSTS.settlement, this.engine, this.playerId)) continue;
          } else if (canCity) {
            if (tryMaritimeTrade(currentState, currentMe, BUILDING_COSTS.city, this.engine, this.playerId)) continue;
          } else if (canRoad) {
            // No settlement/city spots — trade toward roads to expand the network
            if (tryMaritimeTrade(currentState, currentMe, BUILDING_COSTS.road, this.engine, this.playerId)) continue;
          }

          // 6. Buy dev card — cap at 3 total unplayed non-VP cards (including bought this turn)
          const unplayedActionCards = currentMe.devCards.filter(
            (c) => c.type !== 'victory_point'
          ).length;
          if (canAfford(currentMe.hand, BUILDING_COSTS.dev_card) && currentState.devCardDeckSize > 0 && unplayedActionCards < 3) {
            if (this.engine.handleBuyDevCard(this.playerId) === null) continue;
          }

          // 7. Maritime trade to dump surplus when hand is large and dev cards are worth buying
          if (handTotal(currentMe.hand) > 7 && currentState.devCardDeckSize > 0 && unplayedActionCards < 3) {
            if (tryMaritimeTrade(currentState, currentMe, BUILDING_COSTS.dev_card, this.engine, this.playerId)) continue;
          }

          // 8. Propose a 1:1 player trade (at most once per turn) — exits loop since phase changes
          if (!this.tradeProposedThisTurn && currentState.players.length > 1) {
            if (tryProposeTrade(currentState, currentMe, this.playerId, this.engine)) {
              this.tradeProposedThisTurn = true;
              return; // phase is now TRADE_OFFER_PENDING
            }
          }

          // 9. Play Road Building card
          if (!currentState.devCardPlayedThisTurn && canRoad) {
            const rbCard = currentMe.devCards.find((c) => c.type === 'road_building' && c.turnDrawn < currentState.turnNumber);
            if (rbCard && this.engine.handlePlayRoadBuilding(this.playerId) === null) return; // phase changes to DEV_ROAD_BUILDING
          }

          // 10. Build road when no settlement spots available
          if (canAfford(currentMe.hand, BUILDING_COSTS.road) && canRoad && !canSettlement) {
            const edges = validRoadEdges(currentBoard, this.playerId);
            this.engine.handleBuildRoad(this.playerId, edges[0]!);
            continue;
          }

          // Nothing left to do
          this.engine.handleEndTurn(this.playerId);
          break;
        }
        break;
      }

      case 'TRADE_OFFER_PENDING': {
        const offer = state.activeTradeOffer;
        if (!offer) return;

        if (isActive) {
          // We proposed the trade — confirm as soon as someone accepts
          if (offer.acceptedBy.length > 0) {
            this.engine.handleConfirmTrade(this.playerId, offer.id, offer.acceptedBy[0]!);
          }
          // Otherwise wait; timer will auto-cancel
          return;
        }

        // Non-active player: respond if we haven't already
        if (offer.rejectedBy.includes(this.playerId) || offer.acceptedBy.includes(this.playerId)) return;
        if (shouldAcceptTrade(state, me, offer, this.playerId)) {
          this.engine.handleAcceptTrade(this.playerId, offer.id);
        } else {
          this.engine.handleRejectTrade(this.playerId, offer.id);
        }
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
