import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@opensettlers/shared';

// In production the client is served from the same origin as the server,
// so passing undefined makes socket.io connect to window.location.origin.
const serverUrl: string | undefined =
  (import.meta.env['VITE_SERVER_URL'] as string | undefined) ??
  (import.meta.env.PROD ? undefined : 'http://localhost:4000');

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  serverUrl,
  { autoConnect: false }
);
