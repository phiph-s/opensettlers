import { v4 as uuidv4 } from 'uuid';
import {
  computeLongestRoad,
  cubeKey,
  BUILDING_COSTS,
  LONGEST_ROAD_MINIMUM,
} from '@opensettlers/shared';
import type {
  CubeCoord,
  DevCardType,
  EdgeKey,
  GameState,
  LobbySettings,
  Player,
  Resource,
  TurnPhase,
  VertexKey,
} from '@opensettlers/shared';
import type { Server as IOServer, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@opensettlers/shared';

import { buildBoard, getMapById } from '../maps/MapGenerator.js';
import type { HexSecret } from '../maps/MapGenerator.js';
import { BotController } from './BotController.js';
import { TurnTimer } from './TurnTimer.js';
import {
  canAfford,
  deductCost,
  grantResources,
  distributeResources,
  computeGoldChoices,
  handTotal,
  autoDiscard,
} from './ResourceManager.js';
import {
  computePendingDiscards,
  computeRobberCandidates,
} from './RobberManager.js';
import {
  getBestMaritimeRate,
  validateMaritimeTrade,
  validatePlayerTrade,
} from './TradeManager.js';
import {
  buildDeck,
  shuffleDeck,
  canPlayDevCard,
  removeDevCard,
  updateLargestArmy,
} from './DevCardManager.js';
import { checkWin, computeVP } from './VictoryChecker.js';
import {
  canPlaceSettlementAt,
  canPlaceRoadAt,
  canPlaceCityAt,
  canMoveRobberTo,
  isActivePlayer,
  nextSetupPlayerIndex,
} from './TurnStateMachine.js';
import { PIECES_PER_PLAYER, EXTRA_PIECES_PER_PLAYER } from '@opensettlers/shared';

type IO = IOServer<ClientToServerEvents, ServerToClientEvents>;

export class GameEngine {
  readonly gameId: string;
  readonly lobbyId: string;
  private state: GameState;
  private devDeck: DevCardType[];
  private timer: TurnTimer;
  private io: IO;
  private settings: LobbySettings;
  private readyForNext = new Set<string>();
  private bots = new Map<string, BotController>();
  private hexSecrets = new Map<string, HexSecret>();
  private knightBeforeRoll = false;

  constructor(
    lobbyId: string,
    players: Array<{ id: string; name: string; color: string }>,
    settings: LobbySettings,
    io: IO
  ) {
    this.gameId = uuidv4();
    this.lobbyId = lobbyId;
    this.io = io;
    this.settings = settings;
    this.timer = new TurnTimer();
    this.devDeck = shuffleDeck(buildDeck(), Math.random);

    const mapTemplate = getMapById(settings.mapTemplateId);
    const { board, secrets } = buildBoard(mapTemplate, Math.random);
    this.hexSecrets = secrets;

    const useExtraPieces = settings.extraBuildings || settings.vpToWin >= 16;
    const pieces = useExtraPieces ? EXTRA_PIECES_PER_PLAYER : PIECES_PER_PLAYER;

    let orderedPlayers = [...players];
    if (settings.randomizeOrder) {
      for (let i = orderedPlayers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [orderedPlayers[i], orderedPlayers[j]] = [orderedPlayers[j]!, orderedPlayers[i]!];
      }
    }

    const gamePlayers: Player[] = orderedPlayers.map((p, i) => ({
      id: p.id,
      name: p.name,
      color: p.color as Player['color'],
      seatIndex: i,
      hand: { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 },
      devCards: [],
      knightsPlayed: 0,
      settlementsLeft: pieces.settlements,
      citiesLeft: pieces.cities,
      roadsLeft: pieces.roads,
      hasLongestRoad: false,
      hasLargestArmy: false,
      isConnected: true,
      isBot: false,
      victoryPoints: 0,
    }));

    this.state = {
      gameId: this.gameId,
      lobbyId,
      mapTemplateId: mapTemplate.id,
      board,
      players: gamePlayers,
      activePlayerIndex: 0,
      turnNumber: 0,
      phase: 'SETUP_PLACE_SETTLEMENT',
      diceRoll: null,
      devCardDeckSize: this.devDeck.length,
      longestRoadOwner: null,
      largestArmyOwner: null,
      longestRoadLength: 0,
      largestArmySize: 0,
      activeTradeOffer: null,
      setupDirection: 'clockwise',
      setupRound: 1,
      phaseDeadline: null,
      winner: null,
      devRoadsRemaining: 0,
      yearOfPlentyRemaining: 0,
      pendingDiscards: {},
      robberCandidates: [],
      lastPlacedSettlementKey: null,
      cloudOriginKeys: mapTemplate.cloudedCoords?.map((coord) => cubeKey(coord)) ?? [],
      bank: { wood: settings.bankResourceCount, brick: settings.bankResourceCount, wheat: settings.bankResourceCount, sheep: settings.bankResourceCount, ore: settings.bankResourceCount },
      winTarget: settings.vpToWin,
      pendingGoldChoices: {},
    };
  }

  getState(): GameState {
    return this.state;
  }

  /** Returns a sanitized view of game state for a specific player */
  sanitizeFor(playerId: string): GameState {
    const players = this.state.players.map((p) => {
      if (p.id === playerId) return p;
      return {
        ...p,
        devCards: [],
        devCardCount: p.devCards.length,
      };
    });
    return { ...this.state, players };
  }

  broadcastState(): void {
    for (const player of this.state.players) {
      this.io.to(player.id).emit('game:state', this.sanitizeFor(player.id));
    }
    for (const bot of this.bots.values()) {
      bot.onStateChange();
    }
  }

  setPlayerConnected(playerId: string, connected: boolean): void {
    const player = this.state.players.find((p) => p.id === playerId);
    if (player) player.isConnected = connected;
    this.broadcastState();
  }

  private rollBalancedDice(): [number, number] {
    // Flatter distribution: reduce 7 dominance, boost extreme numbers
    const weights = [0, 0, 2, 3, 4, 4, 5, 4, 5, 4, 4, 3, 2];
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let sum = 7;
    for (let i = 2; i <= 12; i++) {
      r -= weights[i]!;
      if (r <= 0) { sum = i; break; }
    }
    const d1min = Math.max(1, sum - 6);
    const d1max = Math.min(6, sum - 1);
    const d1 = d1min + Math.floor(Math.random() * (d1max - d1min + 1));
    return [d1, sum - d1];
  }

  private returnCostToBank(cost: Partial<Record<Resource, number>>): void {
    for (const [res, amt] of Object.entries(cost) as [Resource, number][]) {
      this.state.bank[res] = (this.state.bank[res] ?? 0) + amt;
    }
  }

  addBot(playerId: string): void {
    if (this.bots.has(playerId)) return;
    const player = this.state.players.find((p) => p.id === playerId);
    if (player) player.isBot = true;
    const bot = new BotController(this, playerId);
    this.bots.set(playerId, bot);
    bot.start();
    this.broadcastState();
  }

  removeBot(playerId: string): void {
    const bot = this.bots.get(playerId);
    if (bot) {
      bot.stop();
      this.bots.delete(playerId);
      const player = this.state.players.find((p) => p.id === playerId);
      if (player) player.isBot = false;
    }
  }

  hasBot(playerId: string): boolean {
    return this.bots.has(playerId);
  }

  private advancePhase(phase: TurnPhase): void {
    this.state.phase = phase;
    const activePlayer = this.state.players[this.state.activePlayerIndex];

    const phaseSeconds = this.settings.timerSeconds[phase] ?? 60;
    const deadline = this.settings.timerEnabled
      ? Date.now() + phaseSeconds * 1000
      : null;
    this.state.phaseDeadline = deadline;

    this.io.to(this.lobbyId).emit('game:phase_changed', {
      phase,
      deadline,
      activePlayerId: activePlayer?.id ?? '',
    });

    if (this.settings.timerEnabled) {
      this.timer.set(this.gameId, phaseSeconds, () => this.handleTimeout(phase));
    }

    this.broadcastState();
  }

  private handleTimeout(phase: TurnPhase): void {
    const activePlayer = this.state.players[this.state.activePlayerIndex];
    if (!activePlayer) return;

    switch (phase) {
      case 'PRE_ROLL':
      case 'ROLL':
        this.handleRoll(activePlayer.id);
        break;
      case 'DISCARD_PHASE':
        for (const [pid, count] of Object.entries(this.state.pendingDiscards)) {
          const p = this.state.players.find((pl) => pl.id === pid);
          if (p) {
            const toDiscard = autoDiscard(p, count);
            this.handleDiscard(pid, toDiscard);
          }
        }
        break;
      case 'ROBBER_PLACEMENT': {
        const desert = Object.values(this.state.board.hexes).find(
          (h) => h.terrain === 'desert' && !h.hasRobber
        ) ?? Object.values(this.state.board.hexes).find((h) => h.terrain !== 'sea');
        if (desert) this.handleMoveRobber(activePlayer.id, desert.coord);
        break;
      }
      case 'STEAL':
        if (this.state.robberCandidates.length > 0) {
          this.handleSteal(activePlayer.id, this.state.robberCandidates[0]!);
        } else {
          this.advancePhaseAfterRobber();
        }
        break;
      case 'TRADE_OFFER_PENDING':
        if (this.state.activeTradeOffer) {
          this.cancelTrade(activePlayer.id, this.state.activeTradeOffer.id);
        }
        break;
      case 'BUILD_PHASE':
      case 'DEV_ROAD_BUILDING':
        this.handleEndTurn(activePlayer.id);
        break;
      case 'YEAR_OF_PLENTY_SELECT':
      case 'MONOPOLY_SELECT':
        this.advancePhase('BUILD_PHASE');
        break;
      case 'GOLD_SELECT': {
        // Auto-pick ore and wheat for each pending player
        const autoResources: Resource[] = ['ore', 'wheat'];
        for (const [pid, count] of Object.entries(this.state.pendingGoldChoices)) {
          const picks: Resource[] = [];
          for (let i = 0; i < count; i++) picks.push(autoResources[i % 2]!);
          this.handleGoldSelect(pid, picks);
        }
        break;
      }
    }
  }

  // ── Setup ──────────────────────────────────────────────────────────────────

  handlePlaceSetupSettlement(playerId: string, vk: VertexKey): string | null {
    if (!canPlaceSettlementAt(this.state, playerId, vk)) return 'Invalid settlement placement';

    const player = this.state.players.find((p) => p.id === playerId)!;
    this.state.board.vertices[vk]!.building = { type: 'settlement', owner: playerId };
    player.settlementsLeft--;
    this.state.lastPlacedSettlementKey = vk;

    // Grant starting resources for second settlement
    if (this.state.setupRound === 2) {
      const vertex = this.state.board.vertices[vk]!;
      for (const hk of vertex.adjacentHexKeys) {
        const hex = this.state.board.hexes[hk];
        if (!hex || hex.terrain === 'sea' || hex.terrain === 'desert') continue;
        const resource = ({ forest: 'wood', hills: 'brick', fields: 'wheat', pasture: 'sheep', mountains: 'ore' } as Record<string, Resource>)[hex.terrain];
        if (resource) {
          player.hand[resource]++;
          this.state.bank[resource] = Math.max(0, (this.state.bank[resource] ?? 0) - 1);
        }
      }
    }

    this.io.to(this.lobbyId).emit('game:building_placed', {
      buildingType: 'settlement',
      key: vk,
      playerId,
    });

    this.updateLongestRoad();
    this.updateVP();
    this.advancePhase('SETUP_PLACE_ROAD');
    return null;
  }

  handlePlaceSetupRoad(playerId: string, ek: EdgeKey): string | null {
    if (!canPlaceRoadAt(this.state, playerId, ek)) return 'Invalid road placement';

    const player = this.state.players.find((p) => p.id === playerId)!;
    this.state.board.edges[ek]!.road = { owner: playerId };
    player.roadsLeft--;
    this.state.lastPlacedSettlementKey = null;

    this.io.to(this.lobbyId).emit('game:building_placed', {
      buildingType: 'road',
      key: ek,
      playerId,
    });

    this.revealCloudsAdjacentToRoad(ek);
    this.updateLongestRoad();

    const next = nextSetupPlayerIndex(this.state);
    if (next.done) {
      this.state.activePlayerIndex = 0;
      this.state.turnNumber = 1;
      this.advancePhase('PRE_ROLL');
    } else {
      this.state.activePlayerIndex = next.index;
      this.state.setupRound = next.round;
      this.state.setupDirection = next.direction;
      this.advancePhase('SETUP_PLACE_SETTLEMENT');
    }
    return null;
  }

  // ── Roll ───────────────────────────────────────────────────────────────────

  handleRoll(playerId: string): string | null {
    if (this.state.phase !== 'PRE_ROLL' && this.state.phase !== 'ROLL') return 'Cannot roll now';
    if (!isActivePlayer(this.state, playerId)) return 'Not your turn';

    const [d1, d2] = this.settings.balancedDice ? this.rollBalancedDice() : [Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)] as [number, number];
    const roll = d1 + d2;
    this.state.diceRoll = [d1, d2];

    this.timer.cancel(this.gameId);
    this.io.to(this.lobbyId).emit('game:dice_rolled', {
      roll: [d1, d2],
      activePlayerId: playerId,
    });

    if (roll === 7) {
      const pending = computePendingDiscards(this.state);
      this.state.pendingDiscards = pending;
      if (Object.keys(pending).length > 0) {
        this.advancePhase('DISCARD_PHASE');
      } else {
        this.advancePhase('ROBBER_PLACEMENT');
      }
    } else {
      const distributions = distributeResources(this.state.board, this.state.players, roll, this.state.bank);
      this.io.to(this.lobbyId).emit('game:resources_distributed', { distributions });

      const goldChoices = computeGoldChoices(this.state.board, this.state.players, roll);
      if (Object.keys(goldChoices).length > 0) {
        this.state.pendingGoldChoices = goldChoices;
        this.advancePhase('GOLD_SELECT');
      } else {
        this.advancePhase('BUILD_PHASE');
      }
    }
    return null;
  }

  // ── Discard ────────────────────────────────────────────────────────────────

  handleDiscard(playerId: string, resources: Partial<Record<Resource, number>>): string | null {
    const expected = this.state.pendingDiscards[playerId];
    if (expected === undefined) return 'Not expected to discard';

    const total = Object.values(resources).reduce((s, n) => s + (n ?? 0), 0);
    if (total !== expected) return `Must discard exactly ${expected} cards`;

    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return 'Player not found';

    for (const [res, amt] of Object.entries(resources) as [Resource, number][]) {
      if ((player.hand[res] ?? 0) < amt) return `Insufficient ${res}`;
    }

    for (const [res, amt] of Object.entries(resources) as [Resource, number][]) {
      player.hand[res] = (player.hand[res] ?? 0) - amt;
      this.state.bank[res] = (this.state.bank[res] ?? 0) + amt;
    }

    delete this.state.pendingDiscards[playerId];

    if (Object.keys(this.state.pendingDiscards).length === 0) {
      this.timer.cancel(this.gameId);
      this.advancePhase('ROBBER_PLACEMENT');
    } else {
      this.broadcastState();
    }
    return null;
  }

  // ── Gold Select ────────────────────────────────────────────────────────────

  handleGoldSelect(playerId: string, resources: Resource[]): string | null {
    const needed = this.state.pendingGoldChoices[playerId];
    if (needed === undefined) return 'Not expected to pick gold resources';
    if (resources.length !== needed) return `Must pick exactly ${needed} resource(s)`;

    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return 'Player not found';

    for (const res of resources) {
      player.hand[res] = (player.hand[res] ?? 0) + 1;
      this.state.bank[res] = Math.max(0, (this.state.bank[res] ?? 0) - 1);
    }

    delete this.state.pendingGoldChoices[playerId];

    if (Object.keys(this.state.pendingGoldChoices).length === 0) {
      this.timer.cancel(this.gameId);
      this.advancePhase('BUILD_PHASE');
    } else {
      this.broadcastState();
    }
    return null;
  }

  // ── Robber ─────────────────────────────────────────────────────────────────

  handleMoveRobber(playerId: string, hexCoord: CubeCoord): string | null {
    if (!canMoveRobberTo(this.state, playerId, hexCoord)) return 'Invalid robber placement';

    if (this.settings.friendlyRobber) {
      const hk = cubeKey(hexCoord);
      const buildingOwners = Object.values(this.state.board.vertices)
        .filter((v) => v.adjacentHexKeys.includes(hk) && v.building && v.building.owner !== playerId)
        .map((v) => v.building!.owner);
      if (buildingOwners.length > 0) {
        const allLowVP = buildingOwners.every((pid) => {
          const p = this.state.players.find((pl) => pl.id === pid);
          return p && p.victoryPoints <= 3;
        });
        if (allLowVP) return 'Friendly robber: cannot target only players with ≤ 3 VP';
      }
    }

    // Clear old robber
    for (const hex of Object.values(this.state.board.hexes)) {
      hex.hasRobber = false;
    }
    const hk = cubeKey(hexCoord);
    this.state.board.hexes[hk]!.hasRobber = true;

    this.io.to(this.lobbyId).emit('game:robber_moved', { hexCoord, byPlayerId: playerId });

    const candidates = computeRobberCandidates(this.state, hexCoord);
    this.state.robberCandidates = candidates;

    this.timer.cancel(this.gameId);
    if (candidates.length > 1) {
      this.advancePhase('STEAL');
    } else if (candidates.length === 1) {
      this.doSteal(playerId, candidates[0]!);
      this.advancePhaseAfterRobber();
    } else {
      this.advancePhaseAfterRobber();
    }
    return null;
  }

  handleSteal(playerId: string, targetPlayerId: string): string | null {
    if (this.state.phase !== 'STEAL') return 'Cannot steal now';
    if (!isActivePlayer(this.state, playerId)) return 'Not your turn';
    if (!this.state.robberCandidates.includes(targetPlayerId)) return 'Invalid steal target';

    this.doSteal(playerId, targetPlayerId);
    this.state.robberCandidates = [];
    this.timer.cancel(this.gameId);
    this.advancePhaseAfterRobber();
    return null;
  }

  private advancePhaseAfterRobber(): void {
    if (this.knightBeforeRoll) {
      this.knightBeforeRoll = false;
      this.advancePhase('ROLL');
    } else {
      this.advancePhase('BUILD_PHASE');
    }
  }

  private doSteal(byPlayerId: string, fromPlayerId: string): void {
    const thief = this.state.players.find((p) => p.id === byPlayerId)!;
    const victim = this.state.players.find((p) => p.id === fromPlayerId)!;

    const available = (Object.entries(victim.hand) as [Resource, number][]).filter(
      ([, n]) => n > 0
    );
    if (available.length === 0) return;

    const [resource] = available[Math.floor(Math.random() * available.length)]!;
    victim.hand[resource]--;
    thief.hand[resource]++;

    // Send targeted events: only the two parties see the resource type
    this.io.to(byPlayerId).emit('game:stolen', { fromPlayerId, byPlayerId, resource });
    this.io.to(fromPlayerId).emit('game:stolen', { fromPlayerId, byPlayerId, resource });
    // Others only see a steal happened
    this.io.to(this.lobbyId).except([byPlayerId, fromPlayerId]).emit('game:stolen', {
      fromPlayerId,
      byPlayerId,
    });
  }

  // ── Building ───────────────────────────────────────────────────────────────

  handleBuildRoad(playerId: string, ek: EdgeKey): string | null {
    if (!canPlaceRoadAt(this.state, playerId, ek)) return 'Invalid road placement';
    const player = this.state.players.find((p) => p.id === playerId)!;

    if (this.state.phase === 'BUILD_PHASE') {
      if (!canAfford(player, BUILDING_COSTS.road)) return 'Cannot afford road';
      deductCost(player, BUILDING_COSTS.road);
      this.returnCostToBank(BUILDING_COSTS.road);
    }
    // DEV_ROAD_BUILDING: free

    this.state.board.edges[ek]!.road = { owner: playerId };
    player.roadsLeft--;
    this.revealCloudsAdjacentToRoad(ek);

    this.io.to(this.lobbyId).emit('game:building_placed', {
      buildingType: 'road',
      key: ek,
      playerId,
    });

    this.updateLongestRoad();

    if (this.state.phase === 'DEV_ROAD_BUILDING') {
      this.state.devRoadsRemaining = (this.state.devRoadsRemaining - 1) as 0 | 1 | 2;
      if (this.state.devRoadsRemaining === 0) {
        this.advancePhase('BUILD_PHASE');
        return null;
      }
    }

    if (this.attemptWin()) return null;
    this.updateVP();
    this.broadcastState();
    return null;
  }

  handleBuildSettlement(playerId: string, vk: VertexKey): string | null {
    if (!canPlaceSettlementAt(this.state, playerId, vk)) return 'Invalid settlement placement';
    const player = this.state.players.find((p) => p.id === playerId)!;
    if (!canAfford(player, BUILDING_COSTS.settlement)) return 'Cannot afford settlement';

    deductCost(player, BUILDING_COSTS.settlement);
    this.returnCostToBank(BUILDING_COSTS.settlement);
    this.state.board.vertices[vk]!.building = { type: 'settlement', owner: playerId };
    player.settlementsLeft--;

    this.io.to(this.lobbyId).emit('game:building_placed', {
      buildingType: 'settlement',
      key: vk,
      playerId,
    });

    // Placing a settlement may break an opponent's longest road
    this.updateLongestRoad();
    if (this.attemptWin()) return null;
    this.updateVP();
    this.broadcastState();
    return null;
  }

  handleBuildCity(playerId: string, vk: VertexKey): string | null {
    if (!canPlaceCityAt(this.state, playerId, vk)) return 'Invalid city placement';
    const player = this.state.players.find((p) => p.id === playerId)!;
    if (!canAfford(player, BUILDING_COSTS.city)) return 'Cannot afford city';

    deductCost(player, BUILDING_COSTS.city);
    this.returnCostToBank(BUILDING_COSTS.city);
    this.state.board.vertices[vk]!.building = { type: 'city', owner: playerId };
    player.citiesLeft--;
    player.settlementsLeft++;

    this.io.to(this.lobbyId).emit('game:building_placed', {
      buildingType: 'city',
      key: vk,
      playerId,
    });

    if (this.attemptWin()) return null;
    this.updateVP();
    this.broadcastState();
    return null;
  }

  handleBuyDevCard(playerId: string): string | null {
    if (this.state.phase !== 'BUILD_PHASE') return 'Cannot buy dev card now';
    if (!isActivePlayer(this.state, playerId)) return 'Not your turn';
    if (this.devDeck.length === 0) return 'Dev card deck is empty';

    const player = this.state.players.find((p) => p.id === playerId)!;
    if (!canAfford(player, BUILDING_COSTS.dev_card)) return 'Cannot afford dev card';

    deductCost(player, BUILDING_COSTS.dev_card);
    this.returnCostToBank(BUILDING_COSTS.dev_card);
    const card = this.devDeck.pop()!;
    this.state.devCardDeckSize = this.devDeck.length;
    player.devCards.push({ type: card, turnDrawn: this.state.turnNumber });

    if (this.attemptWin()) return null;
    this.updateVP();
    this.broadcastState();
    return null;
  }

  // ── Dev Cards ──────────────────────────────────────────────────────────────

  handlePlayKnight(playerId: string): string | null {
    if (this.state.phase !== 'PRE_ROLL' && this.state.phase !== 'BUILD_PHASE') return 'Cannot play knight now';
    if (!isActivePlayer(this.state, playerId)) return 'Not your turn';

    const player = this.state.players.find((p) => p.id === playerId)!;
    const err = canPlayDevCard(player, 'knight', this.state.turnNumber);
    if (err) return err;

    this.knightBeforeRoll = this.state.phase === 'PRE_ROLL';

    removeDevCard(player, 'knight', this.state.turnNumber);
    player.knightsPlayed++;

    this.io.to(this.lobbyId).emit('game:dev_card_played', { cardType: 'knight', playerId });

    const armyChanged = updateLargestArmy(this.state);
    if (armyChanged) {
      this.io.to(this.lobbyId).emit('game:largest_army_changed', {
        playerId: this.state.largestArmyOwner,
        count: this.state.largestArmySize,
      });
    }

    if (this.attemptWin()) return null;
    this.advancePhase('ROBBER_PLACEMENT');
    return null;
  }

  handlePlayRoadBuilding(playerId: string): string | null {
    if (this.state.phase !== 'BUILD_PHASE') return 'Cannot play card now';
    if (!isActivePlayer(this.state, playerId)) return 'Not your turn';

    const player = this.state.players.find((p) => p.id === playerId)!;
    const err = canPlayDevCard(player, 'road_building', this.state.turnNumber);
    if (err) return err;

    removeDevCard(player, 'road_building', this.state.turnNumber);
    this.io.to(this.lobbyId).emit('game:dev_card_played', {
      cardType: 'road_building',
      playerId,
    });

    this.state.devRoadsRemaining = player.roadsLeft >= 2 ? 2 : player.roadsLeft > 0 ? 1 : 0;
    if (this.state.devRoadsRemaining === 0) return null;
    this.advancePhase('DEV_ROAD_BUILDING');
    return null;
  }

  handlePlayYearOfPlenty(playerId: string, r1: Resource, r2: Resource): string | null {
    if (this.state.phase !== 'BUILD_PHASE') return 'Cannot play card now';
    if (!isActivePlayer(this.state, playerId)) return 'Not your turn';

    const player = this.state.players.find((p) => p.id === playerId)!;
    const err = canPlayDevCard(player, 'year_of_plenty', this.state.turnNumber);
    if (err) return err;

    removeDevCard(player, 'year_of_plenty', this.state.turnNumber);
    player.hand[r1] = (player.hand[r1] ?? 0) + 1;
    player.hand[r2] = (player.hand[r2] ?? 0) + 1;
    this.state.bank[r1] = Math.max(0, (this.state.bank[r1] ?? 0) - 1);
    this.state.bank[r2] = Math.max(0, (this.state.bank[r2] ?? 0) - 1);

    this.io.to(this.lobbyId).emit('game:dev_card_played', {
      cardType: 'year_of_plenty',
      playerId,
    });

    this.updateVP();
    this.broadcastState();
    return null;
  }

  handlePlayMonopoly(playerId: string, resource: Resource): string | null {
    if (this.state.phase !== 'BUILD_PHASE') return 'Cannot play card now';
    if (!isActivePlayer(this.state, playerId)) return 'Not your turn';

    const player = this.state.players.find((p) => p.id === playerId)!;
    const err = canPlayDevCard(player, 'monopoly', this.state.turnNumber);
    if (err) return err;

    removeDevCard(player, 'monopoly', this.state.turnNumber);

    let stolen = 0;
    for (const other of this.state.players) {
      if (other.id === playerId) continue;
      stolen += other.hand[resource] ?? 0;
      other.hand[resource] = 0;
    }
    player.hand[resource] = (player.hand[resource] ?? 0) + stolen;

    this.io.to(this.lobbyId).emit('game:dev_card_played', {
      cardType: 'monopoly',
      playerId,
    });

    this.updateVP();
    this.broadcastState();
    return null;
  }

  // ── Trading ────────────────────────────────────────────────────────────────

  handleMaritimeTrade(
    playerId: string,
    giving: Partial<Record<Resource, number>>,
    receiving: Partial<Record<Resource, number>>
  ): string | null {
    if (this.state.phase !== 'BUILD_PHASE') return 'Cannot trade now';
    if (!isActivePlayer(this.state, playerId)) return 'Not your turn';

    const player = this.state.players.find((p) => p.id === playerId)!;
    const err = validateMaritimeTrade(player, this.state.board, giving, receiving);
    if (err) return err;

    for (const [res, amt] of Object.entries(giving) as [Resource, number][]) {
      player.hand[res] = (player.hand[res] ?? 0) - amt;
      this.state.bank[res] = (this.state.bank[res] ?? 0) + amt;
    }
    for (const [res, amt] of Object.entries(receiving) as [Resource, number][]) {
      player.hand[res] = (player.hand[res] ?? 0) + amt;
      this.state.bank[res] = Math.max(0, (this.state.bank[res] ?? 0) - amt);
    }

    this.io.to(this.lobbyId).emit('game:trade_executed', {
      fromPlayerId: playerId,
      toPlayerId: null,
      offered: giving,
      received: receiving,
    });

    this.updateVP();
    this.broadcastState();
    return null;
  }

  handleProposeTrade(
    playerId: string,
    offering: Partial<Record<Resource, number>>,
    requesting: Partial<Record<Resource, number>>
  ): string | null {
    if (this.state.phase !== 'BUILD_PHASE') return 'Cannot propose trade now';
    if (!isActivePlayer(this.state, playerId)) return 'Not your turn';

    const err = validatePlayerTrade(offering, requesting);
    if (err) return err;

    const player = this.state.players.find((p) => p.id === playerId)!;
    for (const [res, amt] of Object.entries(offering) as [Resource, number][]) {
      if ((player.hand[res] ?? 0) < amt) return `Insufficient ${res}`;
    }

    const offer = {
      id: uuidv4(),
      fromPlayerId: playerId,
      offering,
      requesting,
      acceptedBy: [],
      rejectedBy: [],
      expiresAt: Date.now() + (this.settings.timerSeconds.TRADE_OFFER_PENDING ?? 15) * 1000,
    };
    this.state.activeTradeOffer = offer;

    this.io.to(this.lobbyId).emit('game:trade_proposed', offer);
    this.advancePhase('TRADE_OFFER_PENDING');
    return null;
  }

  handleAcceptTrade(playerId: string, offerId: string): string | null {
    const offer = this.state.activeTradeOffer;
    if (!offer || offer.id !== offerId) return 'No such trade offer';
    if (offer.fromPlayerId === playerId) return 'Cannot accept your own offer';
    const acceptor = this.state.players.find((p) => p.id === playerId);
    if (!acceptor) return 'Player not found';
    for (const [res, amt] of Object.entries(offer.requesting) as [Resource, number][]) {
      if ((acceptor.hand[res] ?? 0) < amt) return 'Insufficient resources';
    }
    if (!offer.acceptedBy.includes(playerId)) offer.acceptedBy.push(playerId);
    this.broadcastState();
    return null;
  }

  handleRejectTrade(playerId: string, offerId: string): string | null {
    const offer = this.state.activeTradeOffer;
    if (!offer || offer.id !== offerId) return 'No such trade offer';
    if (!offer.rejectedBy.includes(playerId)) offer.rejectedBy.push(playerId);

    const totalOthers = this.state.players.length - 1;
    if (offer.rejectedBy.length >= totalOthers) {
      this.cancelTrade(offer.fromPlayerId, offerId);
    } else {
      this.broadcastState();
    }
    return null;
  }

  handleConfirmTrade(activePlayerId: string, offerId: string, targetPlayerId: string): string | null {
    const offer = this.state.activeTradeOffer;
    if (!offer || offer.id !== offerId) return 'No such trade offer';
    if (!isActivePlayer(this.state, activePlayerId)) return 'Not your turn';
    if (!offer.acceptedBy.includes(targetPlayerId)) return 'Target has not accepted';

    const active = this.state.players.find((p) => p.id === activePlayerId)!;
    const target = this.state.players.find((p) => p.id === targetPlayerId)!;

    // Validate active still has resources
    for (const [res, amt] of Object.entries(offer.offering) as [Resource, number][]) {
      if ((active.hand[res] ?? 0) < amt) return `Active player no longer has ${res}`;
    }
    for (const [res, amt] of Object.entries(offer.requesting) as [Resource, number][]) {
      if ((target.hand[res] ?? 0) < amt) return `Target no longer has ${res}`;
    }

    for (const [res, amt] of Object.entries(offer.offering) as [Resource, number][]) {
      active.hand[res] = (active.hand[res] ?? 0) - amt;
      target.hand[res] = (target.hand[res] ?? 0) + amt;
    }
    for (const [res, amt] of Object.entries(offer.requesting) as [Resource, number][]) {
      target.hand[res] = (target.hand[res] ?? 0) - amt;
      active.hand[res] = (active.hand[res] ?? 0) + amt;
    }

    this.state.activeTradeOffer = null;
    this.timer.cancel(this.gameId);
    this.io.to(this.lobbyId).emit('game:trade_executed', {
      fromPlayerId: activePlayerId,
      toPlayerId: targetPlayerId,
      offered: offer.offering,
      received: offer.requesting,
    });
    this.io.to(this.lobbyId).emit('game:trade_resolved', { offerId, outcome: 'accepted' });
    this.advancePhase('BUILD_PHASE');
    return null;
  }

  cancelTrade(playerId: string, offerId: string): string | null {
    const offer = this.state.activeTradeOffer;
    if (!offer || offer.id !== offerId) return 'No such trade offer';
    this.state.activeTradeOffer = null;
    this.timer.cancel(this.gameId);
    this.io.to(this.lobbyId).emit('game:trade_resolved', { offerId, outcome: 'cancelled' });
    this.advancePhase('BUILD_PHASE');
    return null;
  }

  // ── End Turn ───────────────────────────────────────────────────────────────

  handleEndTurn(playerId: string): string | null {
    if (!isActivePlayer(this.state, playerId)) return 'Not your turn';
    if (this.state.phase !== 'BUILD_PHASE' && this.state.phase !== 'DEV_ROAD_BUILDING') {
      return 'Cannot end turn now';
    }

    this.timer.cancel(this.gameId);

    if (this.attemptWin()) return null;

    this.state.activePlayerIndex =
      (this.state.activePlayerIndex + 1) % this.state.players.length;
    this.state.turnNumber++;
    this.advancePhase('PRE_ROLL');
    return null;
  }

  // ── Post-game ─────────────────────────────────────────────────────────────

  handleReadyForNext(playerId: string, onReturn: () => void): void {
    if (this.state.phase !== 'GAME_OVER') return;
    this.readyForNext.add(playerId);
    const total = this.state.players.length;
    const needed = Math.ceil(total / 2);
    const count = this.readyForNext.size;
    this.io.to(this.lobbyId).emit('game:ready_count', { count, needed });
    if (count >= needed) onReturn();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private updateLongestRoad(): void {
    const playerIds = this.state.players.map((p) => p.id);
    const result = computeLongestRoad(
      this.state.board,
      playerIds,
      this.state.longestRoadOwner,
      this.state.longestRoadLength
    );

    if (result.owner !== this.state.longestRoadOwner || result.length !== this.state.longestRoadLength) {
      // Update flags
      for (const p of this.state.players) p.hasLongestRoad = false;
      if (result.owner) {
        const owner = this.state.players.find((p) => p.id === result.owner);
        if (owner) owner.hasLongestRoad = true;
      }
      this.state.longestRoadOwner = result.owner;
      this.state.longestRoadLength = result.length;

      this.io.to(this.lobbyId).emit('game:longest_road_changed', {
        playerId: result.owner,
        length: result.length,
      });
    }
  }

  private updateVP(): void {
    for (const player of this.state.players) {
      player.victoryPoints = computeVP(this.state, player).total;
    }
  }

  // Reveals up to 4 cloud hexes adjacent to the placed road edge.
  // A road between V1-V2 spanning hexes A,B can also expose C (extra hex at V1) and D (extra hex at V2).
  private revealCloudsAdjacentToRoad(ek: EdgeKey): void {
    if (this.hexSecrets.size === 0) return;
    const edge = this.state.board.edges[ek];
    if (!edge) return;
    const [A, B] = edge.adjacentHexKeys;
    const [vk1, vk2] = edge.adjacentVertexKeys;
    const v1 = this.state.board.vertices[vk1 ?? ''];
    const v2 = this.state.board.vertices[vk2 ?? ''];
    const C = v1?.adjacentHexKeys.find((hk) => hk !== A && hk !== B);
    const D = v2?.adjacentHexKeys.find((hk) => hk !== A && hk !== B);
    for (const hk of [A, B, C, D]) {
      if (!hk) continue;
      const secret = this.hexSecrets.get(hk);
      const hex = this.state.board.hexes[hk];
      if (!secret || !hex || hex.terrain !== 'clouds') continue;
      hex.terrain = secret.terrain;
      hex.numberToken = secret.numberToken;
      this.hexSecrets.delete(hk);
    }
  }

  // Returns true and triggers GAME_OVER if the current state satisfies win condition.
  private attemptWin(): boolean {
    const winner = checkWin(this.state);
    if (!winner) return false;
    this.timer.cancel(this.gameId);
    this.state.winner = winner;
    this.state.phase = 'GAME_OVER';
    const breakdown: Record<string, ReturnType<typeof computeVP>> = {};
    for (const p of this.state.players) breakdown[p.id] = computeVP(this.state, p);
    this.io.to(this.lobbyId).emit('game:over', { winnerId: winner, breakdown });
    this.broadcastState();
    return true;
  }

  destroy(): void {
    this.timer.cancelAll();
  }
}
