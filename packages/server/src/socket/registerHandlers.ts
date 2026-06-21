import type { Server as IOServer, Socket, DefaultEventsMap } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@opensettlers/shared';
import { LobbyManager } from '../lobby/LobbyManager.js';
import { registerLobbyHandlers } from './lobbyHandlers.js';
import { registerGameHandlers } from './gameHandlers.js';

/** Authoritative identity carried on the socket itself, set on join/rejoin. */
export interface SocketData {
  playerId?: string | undefined;
  lobbyId?: string | undefined;
}

type IO = IOServer<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>;
type S = Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>;

export function registerHandlers(socket: S, io: IO, manager: LobbyManager): void {
  registerLobbyHandlers(socket, io, manager);
  registerGameHandlers(socket, io, manager);

  socket.on('disconnect', () => {
    manager.handleDisconnect(socket.id, io);
  });
}
