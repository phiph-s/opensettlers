import type { Server as IOServer, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@opensettlers/shared';
import { LobbyManager } from '../lobby/LobbyManager.js';
import { GameEngine } from '../game/GameEngine.js';

type IO = IOServer<ClientToServerEvents, ServerToClientEvents>;
type S = Socket<ClientToServerEvents, ServerToClientEvents>;

function getGame(socket: S, manager: LobbyManager): GameEngine | null {
  const lobby = Array.from(socket.rooms).find((r) => manager.getLobby(r));
  if (!lobby) return null;
  return manager.getGame(lobby) ?? null;
}

function getPlayerId(socket: S, manager: LobbyManager): string | null {
  for (const room of socket.rooms) {
    const lobby = manager.getLobby(room);
    if (lobby) return lobby.socketToPlayer.get(socket.id) ?? null;
  }
  return null;
}

function handle(
  socket: S,
  manager: LobbyManager,
  fn: (engine: GameEngine, playerId: string) => string | null
): void {
  const engine = getGame(socket, manager);
  const playerId = getPlayerId(socket, manager);
  if (!engine || !playerId) return;
  const err = fn(engine, playerId);
  if (err) socket.emit('game:error', { code: 'ACTION_FAILED', message: err });
}

export function registerGameHandlers(socket: S, io: IO, manager: LobbyManager): void {
  socket.on('game:place_settlement', ({ vertexKey }) => {
    handle(socket, manager, (e, pid) => {
      const state = e.getState();
      if (state.phase === 'SETUP_PLACE_SETTLEMENT') {
        return e.handlePlaceSetupSettlement(pid, vertexKey);
      }
      return e.handleBuildSettlement(pid, vertexKey);
    });
  });

  socket.on('game:place_road', ({ edgeKey }) => {
    handle(socket, manager, (e, pid) => {
      const state = e.getState();
      if (state.phase === 'SETUP_PLACE_ROAD') {
        return e.handlePlaceSetupRoad(pid, edgeKey);
      }
      return e.handleBuildRoad(pid, edgeKey);
    });
  });

  socket.on('game:roll', () => {
    handle(socket, manager, (e, pid) => e.handleRoll(pid));
  });

  socket.on('game:end_turn', () => {
    handle(socket, manager, (e, pid) => e.handleEndTurn(pid));
  });

  socket.on('game:discard', ({ resources }) => {
    handle(socket, manager, (e, pid) => e.handleDiscard(pid, resources));
  });

  socket.on('game:move_robber', ({ hexCoord }) => {
    handle(socket, manager, (e, pid) => e.handleMoveRobber(pid, hexCoord));
  });

  socket.on('game:steal', ({ targetPlayerId }) => {
    handle(socket, manager, (e, pid) => e.handleSteal(pid, targetPlayerId));
  });

  socket.on('game:build_road', ({ edgeKey }) => {
    handle(socket, manager, (e, pid) => e.handleBuildRoad(pid, edgeKey));
  });

  socket.on('game:build_settlement', ({ vertexKey }) => {
    handle(socket, manager, (e, pid) => e.handleBuildSettlement(pid, vertexKey));
  });

  socket.on('game:build_city', ({ vertexKey }) => {
    handle(socket, manager, (e, pid) => e.handleBuildCity(pid, vertexKey));
  });

  socket.on('game:buy_dev_card', () => {
    handle(socket, manager, (e, pid) => e.handleBuyDevCard(pid));
  });

  socket.on('game:play_knight', () => {
    handle(socket, manager, (e, pid) => e.handlePlayKnight(pid));
  });

  socket.on('game:play_road_building', () => {
    handle(socket, manager, (e, pid) => e.handlePlayRoadBuilding(pid));
  });

  socket.on('game:play_year_of_plenty', ({ resource1, resource2 }) => {
    handle(socket, manager, (e, pid) => e.handlePlayYearOfPlenty(pid, resource1, resource2));
  });

  socket.on('game:play_monopoly', ({ resource }) => {
    handle(socket, manager, (e, pid) => e.handlePlayMonopoly(pid, resource));
  });

  socket.on('game:maritime_trade', ({ giving, receiving }) => {
    handle(socket, manager, (e, pid) => e.handleMaritimeTrade(pid, giving, receiving));
  });

  socket.on('game:propose_trade', ({ offering, requesting }) => {
    handle(socket, manager, (e, pid) => e.handleProposeTrade(pid, offering, requesting));
  });

  socket.on('game:accept_trade', ({ offerId }) => {
    handle(socket, manager, (e, pid) => e.handleAcceptTrade(pid, offerId));
  });

  socket.on('game:reject_trade', ({ offerId }) => {
    handle(socket, manager, (e, pid) => e.handleRejectTrade(pid, offerId));
  });

  socket.on('game:confirm_trade', ({ offerId, targetPlayerId }) => {
    handle(socket, manager, (e, pid) => e.handleConfirmTrade(pid, offerId, targetPlayerId));
  });

  socket.on('game:cancel_trade', ({ offerId }) => {
    handle(socket, manager, (e, pid) => e.cancelTrade(pid, offerId));
  });

  socket.on('game:ready_for_next', () => {
    const engine = getGame(socket, manager);
    const playerId = getPlayerId(socket, manager);
    if (!engine || !playerId) return;
    engine.handleReadyForNext(playerId, () => {
      const lobbyId = Array.from(socket.rooms).find((r) => manager.getLobby(r));
      if (lobbyId) manager.returnToLobby(lobbyId, io);
    });
  });
}
