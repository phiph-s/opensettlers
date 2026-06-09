import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { Server as IOServer } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@opensettlers/shared';
import { PORT, CORS_ORIGIN } from './config.js';
import { LobbyManager } from './lobby/LobbyManager.js';
import { registerHandlers } from './socket/registerHandlers.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env['NODE_ENV'] === 'production';

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

if (isProd) {
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.use((_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const httpServer = createServer(app);
const io = new IOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: CORS_ORIGIN },
});

const manager = new LobbyManager();

io.on('connection', (socket) => {
  // Each player joins a personal room matching their playerId (set after rejoin/join)
  socket.on('game:rejoin', (payload) => {
    void socket.join(payload.playerId);
  });
  registerHandlers(socket, io, manager);
});

httpServer.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} in use — kill the old process or set PORT env var`);
    process.exit(1);
  }
  throw err;
});

httpServer.listen(PORT, () => {
  console.log(`OpenSettlers server listening on port ${PORT}`);
});
