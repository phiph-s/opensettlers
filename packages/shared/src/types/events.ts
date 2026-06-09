import type { Resource, BuildingType, DevCardType } from './primitives.js';
import type { CubeCoord, EdgeKey, VertexKey } from './board.js';
import type {
  Ack,
  GameOverSummary,
  GameState,
  LobbySettings,
  LobbyState,
  TradeOffer,
  TurnPhase,
} from './game.js';

export interface ClientToServerEvents {
  // Lobby
  'lobby:create': (
    payload: { playerName: string; settings?: Partial<LobbySettings> },
    ack: (res: Ack<{ lobby: LobbyState; playerId: string }>) => void
  ) => void;
  'lobby:list': (ack: (res: Ack<LobbyState[]>) => void) => void;
  'lobby:join': (
    payload: { lobbyId: string; playerName: string; playerId?: string },
    ack: (res: Ack<{ lobby: LobbyState; playerId: string }>) => void
  ) => void;
  'lobby:leave': (payload: { lobbyId: string }, ack: (res: Ack<void>) => void) => void;
  'lobby:ready': (payload: { lobbyId: string; ready: boolean }) => void;
  'lobby:settings': (payload: { lobbyId: string; settings: Partial<LobbySettings> }) => void;
  'lobby:start': (payload: { lobbyId: string }, ack: (res: Ack<void>) => void) => void;
  'lobby:join_by_code': (
    payload: { code: string; playerName: string },
    ack: (res: Ack<{ lobby: LobbyState; playerId: string }>) => void
  ) => void;

  // Reconnect
  'game:rejoin': (
    payload: { lobbyId: string; playerId: string },
    ack: (res: Ack<GameState>) => void
  ) => void;

  // Setup
  'game:place_settlement': (payload: { vertexKey: VertexKey }) => void;
  'game:place_road': (payload: { edgeKey: EdgeKey }) => void;

  // Turn
  'game:roll': () => void;
  'game:end_turn': () => void;

  // Robber
  'game:discard': (payload: { resources: Partial<Record<Resource, number>> }) => void;
  'game:move_robber': (payload: { hexCoord: CubeCoord }) => void;
  'game:steal': (payload: { targetPlayerId: string }) => void;

  // Building
  'game:build_road': (payload: { edgeKey: EdgeKey }) => void;
  'game:build_settlement': (payload: { vertexKey: VertexKey }) => void;
  'game:build_city': (payload: { vertexKey: VertexKey }) => void;
  'game:buy_dev_card': () => void;

  // Dev cards
  'game:play_knight': () => void;
  'game:play_road_building': () => void;
  'game:play_year_of_plenty': (payload: { resource1: Resource; resource2: Resource }) => void;
  'game:play_monopoly': (payload: { resource: Resource }) => void;
  'game:play_vp': () => void;

  // Trade — maritime
  'game:maritime_trade': (payload: {
    giving: Partial<Record<Resource, number>>;
    receiving: Partial<Record<Resource, number>>;
  }) => void;

  // Trade — player-to-player
  'game:propose_trade': (payload: {
    offering: Partial<Record<Resource, number>>;
    requesting: Partial<Record<Resource, number>>;
  }) => void;
  'game:accept_trade': (payload: { offerId: string }) => void;
  'game:reject_trade': (payload: { offerId: string }) => void;
  'game:confirm_trade': (payload: { offerId: string; targetPlayerId: string }) => void;
  'game:cancel_trade': (payload: { offerId: string }) => void;
  'game:ready_for_next': () => void;
}

export interface ServerToClientEvents {
  // Lobby
  'lobby:updated': (lobby: LobbyState) => void;
  'lobby:started': (payload: { gameId: string; initialState: GameState }) => void;
  'lobby:error': (payload: { code: string; message: string }) => void;

  // Game state
  'game:state': (state: GameState) => void;

  // Granular notifications (for sound/animation triggers)
  'game:dice_rolled': (payload: {
    roll: [number, number];
    activePlayerId: string;
  }) => void;
  'game:resources_distributed': (payload: {
    distributions: Record<string, Partial<Record<Resource, number>>>;
  }) => void;
  'game:robber_moved': (payload: {
    hexCoord: CubeCoord;
    byPlayerId: string;
  }) => void;
  'game:stolen': (payload: {
    fromPlayerId: string;
    byPlayerId: string;
    resource?: Resource;
  }) => void;
  'game:building_placed': (payload: {
    buildingType: BuildingType | 'road';
    key: string;
    playerId: string;
  }) => void;
  'game:dev_card_played': (payload: {
    cardType: DevCardType;
    playerId: string;
  }) => void;
  'game:trade_proposed': (offer: TradeOffer) => void;
  'game:trade_resolved': (payload: {
    offerId: string;
    outcome: 'accepted' | 'rejected' | 'cancelled' | 'expired';
  }) => void;
  'game:trade_executed': (payload: {
    fromPlayerId: string;
    toPlayerId: string;
    offered: Partial<Record<Resource, number>>;
    received: Partial<Record<Resource, number>>;
  }) => void;
  'game:longest_road_changed': (payload: {
    playerId: string | null;
    length: number;
  }) => void;
  'game:largest_army_changed': (payload: {
    playerId: string | null;
    count: number;
  }) => void;
  'game:phase_changed': (payload: {
    phase: TurnPhase;
    deadline: number | null;
    activePlayerId: string;
  }) => void;
  'game:timer_warning': (payload: { secondsRemaining: number }) => void;
  'game:over': (summary: GameOverSummary) => void;
  'game:ready_count': (payload: { count: number; needed: number }) => void;
  'game:error': (payload: { code: string; message: string }) => void;
}
