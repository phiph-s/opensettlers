import type { Resource } from './primitives.js';
import type { CubeCoord, GameBoard } from './board.js';
import type { Player } from './player.js';

export type TurnPhase =
  | 'SETUP_PLACE_SETTLEMENT'
  | 'SETUP_PLACE_ROAD'
  | 'PRE_ROLL'
  | 'ROLL'
  | 'DISCARD_PHASE'
  | 'ROBBER_PLACEMENT'
  | 'STEAL'
  | 'TRADE_OFFER_PENDING'
  | 'BUILD_PHASE'
  | 'DEV_ROAD_BUILDING'
  | 'YEAR_OF_PLENTY_SELECT'
  | 'MONOPOLY_SELECT'
  | 'GOLD_SELECT'
  | 'GAME_OVER';

/** Seafarers: pirate placement is handled within ROBBER_PLACEMENT via pirateMode flag */

export interface TradeOffer {
  id: string;
  fromPlayerId: string;
  offering: Partial<Record<Resource, number>>;
  requesting: Partial<Record<Resource, number>>;
  acceptedBy: string[];
  rejectedBy: string[];
  expiresAt: number;
}

export interface GameState {
  gameId: string;
  lobbyId: string;
  mapTemplateId: string;
  board: GameBoard;
  players: Player[];
  activePlayerIndex: number;
  turnNumber: number;
  phase: TurnPhase;
  diceRoll: [number, number] | null;
  devCardDeckSize: number;
  longestRoadOwner: string | null;
  largestArmyOwner: string | null;
  longestRoadLength: number;
  largestArmySize: number;
  activeTradeOffer: TradeOffer | null;
  setupDirection: 'clockwise' | 'counter_clockwise';
  setupRound: 1 | 2;
  phaseDeadline: number | null;
  winner: string | null;
  devRoadsRemaining: 0 | 1 | 2;
  yearOfPlentyRemaining: 0 | 1 | 2;
  pendingDiscards: Record<string, number>;
  robberCandidates: string[];
  lastPlacedSettlementKey: string | null;
  cloudOriginKeys: string[];
  bank: Record<import('./primitives.js').Resource, number>;
  winTarget: number;
  pendingGoldChoices: Record<string, number>;
  devCardPlayedThisTurn: boolean;
  friendlyRobber: boolean;
  /** Seafarers expansion is active for this game */
  seafarers: boolean;
  /** Seafarers: hex key where the pirate is currently placed (null = not yet placed) */
  pirateHexKey: string | null;
  /** Seafarers: true → pirate is being moved (robber mode = sea hexes), false → robber */
  pirateMode: boolean;
  /** Seafarers: discovery bonus (2 VP for first settlement on an island ≤ 7 tiles) */
  discoveryBonus: boolean;
  /** Seafarers: maps island-id → first player id who settled there */
  claimedIslands: Record<string, string>;
  /** Seafarers: maps island-id → vertex key of the first settlement that claimed it */
  discoverySettlements: Record<string, string>;
  /** Seafarers: edge key of the ship moved this turn (only one ship can move per turn) */
  shipMovedThisTurn: string | null;
}

export type LobbyStatus = 'waiting' | 'in_game' | 'finished';

export type TimerSettings = Partial<Record<TurnPhase, number>>;

export interface LobbySettings {
  mapTemplateId: string;
  maxPlayers: number;
  timerEnabled: boolean;
  timerSeconds: TimerSettings;
  private: boolean;
  privateCode: string | null;
  bankResourceCount: number;
  balancedDice: boolean;
  friendlyRobber: boolean;
  vpToWin: number;
  extraBuildings: boolean;
  randomizeOrder: boolean;
  /** Seafarers expansion enabled */
  seafarers: boolean;
  /** Seafarers: grant 2 VP for first settlement on an island ≤ 7 tiles */
  discoveryBonus: boolean;
}

export interface LobbySlot {
  playerId: string | null;
  name: string | null;
  ready: boolean;
  color: import('./primitives.js').PlayerColor;
  isBot?: boolean;
}

export interface LobbyState {
  id: string;
  settings: LobbySettings;
  slots: LobbySlot[];
  status: LobbyStatus;
  gameId: string | null;
  hostPlayerId: string | null;
  createdAt: number;
}

export type ResourceCounts = Partial<Record<Resource, number>>;

export interface VictoryBreakdown {
  settlements: number;
  cities: number;
  longestRoad: number;
  largestArmy: number;
  vpCards: number;
  total: number;
}

export interface GameOverSummary {
  winnerId: string;
  breakdown: Record<string, VictoryBreakdown>;
}

export type AckError = { ok: false; code: string; message: string };
export type AckOk<T> = { ok: true; data: T };
export type Ack<T> = AckOk<T> | AckError;

export interface RobberMovedPayload {
  hexCoord: CubeCoord;
  byPlayerId: string;
}
