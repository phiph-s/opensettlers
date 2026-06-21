import type { Server as IOServer, Socket, DefaultEventsMap } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@opensettlers/shared';
import { LobbyManager } from '../lobby/LobbyManager.js';
import { GameEngine } from '../game/GameEngine.js';
import type { SocketData } from './registerHandlers.js';

type IO = IOServer<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>;
type S = Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>;

/**
 * Resolve (lobbyId, playerId) for this socket. Prefers the authoritative identity
 * stamped on socket.data at join/rejoin; falls back to deriving it from joined rooms
 * for resilience. Returns null only when this socket genuinely has no session.
 */
function resolveIdentity(socket: S, manager: LobbyManager): { lobbyId: string; playerId: string } | null {
  let lobbyId = socket.data.lobbyId;
  let playerId = socket.data.playerId;
  if (!lobbyId || !playerId) {
    for (const room of socket.rooms) {
      const lobby = manager.getLobby(room);
      if (lobby) {
        lobbyId = lobby.id;
        playerId = lobby.socketToPlayer.get(socket.id) ?? playerId;
        break;
      }
    }
  }
  if (!lobbyId || !playerId) return null;
  return { lobbyId, playerId };
}

function getContext(socket: S, manager: LobbyManager): { engine: GameEngine; playerId: string } | null {
  const id = resolveIdentity(socket, manager);
  if (!id) return null;
  const engine = manager.getGame(id.lobbyId);
  if (!engine) return null;
  // Confirm this player actually belongs to the game before acting on their behalf.
  if (!engine.getState().players.some((p) => p.id === id.playerId)) return null;
  return { engine, playerId: id.playerId };
}

function handle(
  socket: S,
  manager: LobbyManager,
  fn: (engine: GameEngine, playerId: string) => string | null
): void {
  const ctx = getContext(socket, manager);
  if (!ctx) {
    // Don't fail silently — tell the client its session is gone so it can re-rejoin
    // instead of presenting dead, unresponsive buttons.
    socket.emit('game:error', { code: 'NO_SESSION', message: 'Lost your game session — reconnecting…' });
    return;
  }
  const err = fn(ctx.engine, ctx.playerId);
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

  socket.on('game:select_gold', ({ resources }) => {
    handle(socket, manager, (e, pid) => e.handleGoldSelect(pid, resources));
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

  socket.on('game:build_ship', ({ edgeKey }) => {
    handle(socket, manager, (e, pid) => e.handleBuildShip(pid, edgeKey));
  });

  socket.on('game:move_ship', ({ fromEdgeKey, toEdgeKey }) => {
    handle(socket, manager, (e, pid) => e.handleMoveShip(pid, fromEdgeKey, toEdgeKey));
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

  socket.on('game:leave', ({ lobbyId }, ack) => {
    // Resolve the player from authoritative socket.data, falling back to the live mapping.
    const playerId = socket.data.playerId ?? manager.getLobby(lobbyId)?.socketToPlayer.get(socket.id);
    if (!playerId) { ack({ ok: false, code: 'LEAVE_FAILED', message: 'Not in this game' }); return; }
    const err = manager.handleLeaveGame(playerId, lobbyId, io);
    if (err) { ack({ ok: false, code: 'LEAVE_FAILED', message: err }); return; }
    // Remove from all rooms first so no further game:state events reach this socket
    void socket.leave(lobbyId);
    void socket.leave(playerId);
    socket.data.playerId = undefined;
    socket.data.lobbyId = undefined;
    ack({ ok: true, data: undefined });
  });

  socket.on('game:ready_for_next', () => {
    const ctx = getContext(socket, manager);
    if (!ctx) return;
    const lobbyId = resolveIdentity(socket, manager)?.lobbyId;
    ctx.engine.handleReadyForNext(ctx.playerId, () => {
      if (lobbyId) manager.returnToLobby(lobbyId, io);
    });
  });
}
