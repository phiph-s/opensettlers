import type { DevCardType, PlayerColor, Resource } from './primitives.js';

export interface DevCardInHand {
  type: DevCardType;
  turnDrawn: number;
}

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  seatIndex: number;
  hand: Record<Resource, number>;
  devCards: DevCardInHand[];
  /** Populated for opponents in sanitized views (devCards hidden) */
  devCardCount?: number;
  knightsPlayed: number;
  settlementsLeft: number;
  citiesLeft: number;
  roadsLeft: number;
  hasLongestRoad: boolean;
  hasLargestArmy: boolean;
  isConnected: boolean;
  victoryPoints: number;
}
