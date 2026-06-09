import { v4 as uuidv4 } from 'uuid';
import type { Server as IOServer, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@opensettlers/shared';
import { LobbyManager } from '../lobby/LobbyManager.js';
import { getAvailableMaps } from '../maps/MapGenerator.js';

type IO = IOServer<ClientToServerEvents, ServerToClientEvents>;
type S = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerLobbyHandlers(socket: S, io: IO, manager: LobbyManager): void {
  socket.on('lobby:list', (ack) => {
    const lobbies = manager.getAllLobbies().map((l) => l.toState());
    ack({ ok: true, data: lobbies });
  });

  socket.on('lobby:maps', (ack) => {
    const maps = getAvailableMaps().map((m) => ({
      id: m.id,
      name: m.name,
      playerCounts: m.playerCounts,
    }));
    ack({ ok: true, data: maps });
  });

  socket.on('lobby:create', (payload, ack) => {
    const playerId = uuidv4();
    const lobby = manager.createLobby(socket.id, playerId, payload.playerName, payload.settings);
    void socket.join(lobby.id);
    void socket.join(playerId); // personal room for targeted events
    ack({ ok: true, data: { lobby: lobby.toState(), playerId } });
    // Broadcast only to others so they see it in the lobby list
    socket.broadcast.emit('lobby:updated', lobby.toState());
  });

  socket.on('lobby:join', (payload, ack) => {
    const playerId = payload.playerId ?? uuidv4();
    const result = manager.joinLobby(socket.id, playerId, payload.playerName, payload.lobbyId);
    if (typeof result === 'string') {
      ack({ ok: false, code: 'JOIN_FAILED', message: result });
      return;
    }
    void socket.join(payload.lobbyId);
    void socket.join(playerId); // personal room for targeted events
    ack({ ok: true, data: { lobby: result.lobby.toState(), playerId } });
    io.to(payload.lobbyId).emit('lobby:updated', result.lobby.toState());
  });

  socket.on('lobby:join_by_code', (payload, ack) => {
    const lobby = manager.getLobbyByCode(payload.code.toUpperCase());
    if (!lobby) {
      ack({ ok: false, code: 'NOT_FOUND', message: 'Invalid room code' });
      return;
    }
    if (lobby.status !== 'waiting') {
      ack({ ok: false, code: 'GAME_STARTED', message: 'Game already started' });
      return;
    }
    if (lobby.isFull()) {
      ack({ ok: false, code: 'FULL', message: 'Lobby is full' });
      return;
    }
    const playerId = uuidv4();
    const result = manager.joinLobby(socket.id, playerId, payload.playerName, lobby.id);
    if (typeof result === 'string') {
      ack({ ok: false, code: 'JOIN_FAILED', message: result });
      return;
    }
    void socket.join(lobby.id);
    void socket.join(playerId);
    ack({ ok: true, data: { lobby: result.lobby.toState(), playerId } });
    io.to(lobby.id).emit('lobby:updated', result.lobby.toState());
  });

  socket.on('lobby:leave', (payload, ack) => {
    const updated = manager.leaveLobby(socket.id, payload.lobbyId);
    void socket.leave(payload.lobbyId);
    ack({ ok: true, data: undefined });
    if (updated) io.to(payload.lobbyId).emit('lobby:updated', updated.toState());
  });

  socket.on('lobby:ready', (payload) => {
    const lobby = manager.getLobby(payload.lobbyId);
    if (!lobby) return;
    const playerId = lobby.socketToPlayer.get(socket.id);
    if (!playerId) return;
    const slot = lobby.slots.find((s) => s.playerId === playerId);
    if (!slot) return;
    slot.ready = payload.ready;
    io.to(payload.lobbyId).emit('lobby:updated', lobby.toState());
  });

  socket.on('lobby:settings', (payload) => {
    const lobby = manager.getLobby(payload.lobbyId);
    if (!lobby) return;
    const playerId = lobby.socketToPlayer.get(socket.id);
    if (lobby.hostPlayerId !== playerId) return;
    Object.assign(lobby.settings, payload.settings);
    io.to(payload.lobbyId).emit('lobby:updated', lobby.toState());
  });

  socket.on('lobby:start', (payload, ack) => {
    const lobby = manager.getLobby(payload.lobbyId);
    if (!lobby) {
      ack({ ok: false, code: 'NOT_FOUND', message: 'Lobby not found' });
      return;
    }
    const playerId = lobby.socketToPlayer.get(socket.id);
    if (!playerId) {
      ack({ ok: false, code: 'NOT_IN_LOBBY', message: 'Not in lobby' });
      return;
    }
    const engine = manager.startGame(payload.lobbyId, playerId, io);
    if (typeof engine === 'string') {
      ack({ ok: false, code: 'START_FAILED', message: engine });
      return;
    }
    ack({ ok: true, data: undefined });
    io.to(payload.lobbyId).emit('lobby:started', {
      gameId: engine.gameId,
      initialState: engine.sanitizeFor(playerId),
    });
    // Send each player their personalized initial state
    for (const player of engine.getState().players) {
      io.to(player.id).emit('game:state', engine.sanitizeFor(player.id));
    }
  });

  socket.on('game:rejoin', (payload, ack) => {
    const result = manager.handleRejoin(socket.id, payload.playerId, payload.lobbyId, io);
    if (typeof result === 'string') {
      ack({ ok: false, code: 'REJOIN_FAILED', message: result });
      return;
    }
    void socket.join(payload.playerId);
    void socket.join(payload.lobbyId);
    ack({ ok: true, data: result.sanitizeFor(payload.playerId) });
  });
}
