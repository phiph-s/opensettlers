import type { Server as IOServer, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@opensettlers/shared';
import { LobbyManager } from '../lobby/LobbyManager.js';
import { registerLobbyHandlers } from './lobbyHandlers.js';
import { registerGameHandlers } from './gameHandlers.js';

type IO = IOServer<ClientToServerEvents, ServerToClientEvents>;
type S = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerHandlers(socket: S, io: IO, manager: LobbyManager): void {
  registerLobbyHandlers(socket, io, manager);
  registerGameHandlers(socket, io, manager);

  socket.on('disconnect', () => {
    manager.handleDisconnect(socket.id, io);
  });
}
