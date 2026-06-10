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
  | 'GAME_OVER';

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
  bank: Record<import('./primitives.js').Resource, number>;
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
