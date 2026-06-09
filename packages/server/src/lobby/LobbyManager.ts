import { v4 as uuidv4 } from 'uuid';
import type { LobbySettings } from '@opensettlers/shared';
import { Lobby } from './Lobby.js';
import { GameEngine } from '../game/GameEngine.js';
import type { Server as IOServer } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@opensettlers/shared';

type IO = IOServer<ClientToServerEvents, ServerToClientEvents>;

export class LobbyManager {
  private lobbies = new Map<string, Lobby>();
  private games = new Map<string, GameEngine>();

  createLobby(socketId: string, playerId: string, playerName: string, settings?: Partial<LobbySettings>): Lobby {
    const id = uuidv4().slice(0, 8).toUpperCase();
    const lobby = new Lobby(id, settings ?? {});
    lobby.addPlayer(playerId, playerName, socketId);
    this.lobbies.set(id, lobby);
    return lobby;
  }

  getLobby(id: string): Lobby | undefined {
    return this.lobbies.get(id);
  }

  getAllLobbies(): Lobby[] {
    return Array.from(this.lobbies.values()).filter((l) => !l.settings.private);
  }

  getLobbyByCode(code: string): Lobby | undefined {
    return Array.from(this.lobbies.values()).find(
      (l) => l.settings.private && l.settings.privateCode === code
    );
  }

  getLobbiesForSocket(socketId: string): Lobby[] {
    return Array.from(this.lobbies.values()).filter((l) => l.socketToPlayer.has(socketId));
  }

  getLobbyForPlayer(playerId: string): Lobby | undefined {
    return Array.from(this.lobbies.values()).find((l) =>
      l.slots.some((s) => s.playerId === playerId)
    );
  }

  getGame(lobbyId: string): GameEngine | undefined {
    return this.games.get(lobbyId);
  }

  joinLobby(
    socketId: string,
    playerId: string,
    playerName: string,
    lobbyId: string
  ): { lobby: Lobby; seatIndex: number } | string {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return 'Lobby not found';
    if (lobby.status !== 'waiting') return 'Game already started';
    if (lobby.isFull()) return 'Lobby is full';

    const seat = lobby.addPlayer(playerId, playerName, socketId);
    if (seat === null) return 'Could not join lobby';
    return { lobby, seatIndex: seat };
  }

  leaveLobby(socketId: string, lobbyId: string): Lobby | null {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return null;
    const playerId = lobby.socketToPlayer.get(socketId);
    if (!playerId) return null;
    lobby.removePlayer(playerId);
    if (lobby.isEmpty()) {
      lobby.destroy();
      this.lobbies.delete(lobbyId);
      return null;
    }
    return lobby;
  }

  startGame(lobbyId: string, requestingPlayerId: string, io: IO): GameEngine | string {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return 'Lobby not found';
    if (lobby.hostPlayerId !== requestingPlayerId) return 'Only the host can start';
    if (!lobby.allReady()) return 'Not all players are ready';
    if (lobby.status !== 'waiting') return 'Game already started';

    const players = lobby.getFilledSlots().map((s) => ({
      id: s.playerId,
      name: s.name,
      color: s.color as string,
    }));

    const engine = new GameEngine(lobbyId, players, lobby.settings, io);
    lobby.status = 'in_game';
    lobby.gameId = engine.gameId;
    this.games.set(lobbyId, engine);
    return engine;
  }

  returnToLobby(lobbyId: string, io: IO): void {
    this.games.delete(lobbyId);
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return;
    lobby.status = 'waiting';
    lobby.gameId = null;
    io.to(lobbyId).emit('lobby:updated', lobby.toState());
  }

  handleDisconnect(socketId: string, io: IO): void {
    const lobbies = this.getLobbiesForSocket(socketId);
    for (const lobby of lobbies) {
      const playerId = lobby.socketToPlayer.get(socketId);
      if (!playerId) continue;

      lobby.socketToPlayer.delete(socketId);
      // Don't remove the slot — start a rejoin timer

      const game = this.games.get(lobby.id);
      if (game) {
        game.setPlayerConnected(playerId, false);
        lobby.startRejoinTimer(playerId, () => {
          // Rejoin window expired — remove from lobby
          lobby.removePlayer(playerId);
          io.to(lobby.id).emit('lobby:updated', lobby.toState());
        });
      } else {
        // In waiting lobby — remove immediately
        lobby.removePlayer(playerId);
        if (lobby.isEmpty()) {
          lobby.destroy();
          this.lobbies.delete(lobby.id);
        } else {
          io.to(lobby.id).emit('lobby:updated', lobby.toState());
        }
      }
    }
  }

  handleRejoin(
    socketId: string,
    playerId: string,
    lobbyId: string,
    io: IO
  ): GameEngine | string {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return 'Lobby not found';

    const reconnected = lobby.reconnectPlayer(playerId, socketId);
    if (!reconnected) return 'Player not found in lobby';

    const game = this.games.get(lobbyId);
    if (!game) return 'No active game';

    game.setPlayerConnected(playerId, true);
    return game;
  }
}
