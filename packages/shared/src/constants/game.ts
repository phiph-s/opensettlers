import type { DevCardType, PlayerColor, TerrainType } from '../types/primitives.js';
import type { TimerSettings } from '../types/game.js';

export const WIN_VP = 10;
export const MAX_HAND_SIZE_BEFORE_DISCARD = 7;
export const PIECES_PER_PLAYER = { settlements: 5, cities: 4, roads: 15 } as const;
export const EXTRA_PIECES_PER_PLAYER = { settlements: 7, cities: 6, roads: 20 } as const;
export const LARGEST_ARMY_MINIMUM = 3;
export const LONGEST_ROAD_MINIMUM = 5;
export const REJOIN_WINDOW_MS = 60_000;

export const PLAYER_COLORS: PlayerColor[] = ['red', 'blue', 'orange', 'black', 'green', 'purple', 'yellow', 'pink'];

export const DEV_CARD_COUNTS: Record<DevCardType, number> = {
  knight: 14,
  road_building: 2,
  year_of_plenty: 2,
  monopoly: 2,
  victory_point: 5,
};

export const STANDARD_TERRAIN_POOL: TerrainType[] = [
  'forest', 'forest', 'forest', 'forest',
  'fields', 'fields', 'fields', 'fields',
  'pasture', 'pasture', 'pasture', 'pasture',
  'hills', 'hills', 'hills',
  'mountains', 'mountains', 'mountains',
  'desert',
];

export const STANDARD_NUMBER_TOKENS = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];

export const DEFAULT_TIMER_SECONDS: TimerSettings = {
  SETUP_PLACE_SETTLEMENT: 60,
  SETUP_PLACE_ROAD: 30,
  PRE_ROLL: 60,
  ROLL: 60,
  DISCARD_PHASE: 30,
  ROBBER_PLACEMENT: 40,
  STEAL: 20,
  TRADE_OFFER_PENDING: 15,
  BUILD_PHASE: 90,
  DEV_ROAD_BUILDING: 30,
  YEAR_OF_PLENTY_SELECT: 20,
  MONOPOLY_SELECT: 20,
  GOLD_SELECT: 25,
};
