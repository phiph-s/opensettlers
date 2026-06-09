import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@opensettlers/shared';

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  import.meta.env['VITE_SERVER_URL'] as string | undefined ?? 'http://localhost:4000',
  { autoConnect: false }
);
