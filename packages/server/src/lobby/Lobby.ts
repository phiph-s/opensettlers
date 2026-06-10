import { DEFAULT_TIMER_SECONDS, PLAYER_COLORS, REJOIN_WINDOW_MS } from '@opensettlers/shared';
import type { LobbySettings, LobbySlot, LobbyState, LobbyStatus, PlayerColor } from '@opensettlers/shared';

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export class Lobby {
  readonly id: string;
  settings: LobbySettings;
  slots: LobbySlot[];
  status: LobbyStatus = 'waiting';
  gameId: string | null = null;
  hostPlayerId: string | null = null;
  readonly createdAt: number;

  /** socketId -> playerId */
  socketToPlayer = new Map<string, string>();
  /** playerId -> socketId (current, may be stale on disconnect) */
  playerToSocket = new Map<string, string>();
  /** Players who voluntarily left — cannot rejoin */
  permanentlyLeft = new Set<string>();
  /** playerId -> rejoin timeout handle (kept for waiting-lobby cleanup only) */
  private rejoinTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(id: string, settings: Partial<LobbySettings>) {
    this.id = id;
    this.createdAt = Date.now();
    this.settings = {
      mapTemplateId: settings.mapTemplateId ?? 'standard',
      maxPlayers: settings.maxPlayers ?? 4,
      timerEnabled: settings.timerEnabled ?? true,
      timerSeconds: { ...DEFAULT_TIMER_SECONDS, ...settings.timerSeconds },
      private: settings.private ?? false,
      privateCode: settings.private ? generateCode() : null,
      bankResourceCount: settings.bankResourceCount ?? 19,
      balancedDice: settings.balancedDice ?? false,
      friendlyRobber: settings.friendlyRobber ?? false,
      vpToWin: settings.vpToWin ?? 10,
    };
    this.slots = Array.from({ length: this.settings.maxPlayers }, (_, i) => ({
      playerId: null,
      name: null,
      ready: false,
      color: PLAYER_COLORS[i] as PlayerColor,
    }));
  }

  addPlayer(playerId: string, name: string, socketId: string): number | null {
    const emptySlot = this.slots.findIndex((s) => s.playerId === null);
    if (emptySlot === -1) return null;

    this.slots[emptySlot]!.playerId = playerId;
    this.slots[emptySlot]!.name = name;
    this.slots[emptySlot]!.ready = false;
    this.slots[emptySlot]!.isBot = false;
    this.socketToPlayer.set(socketId, playerId);
    this.playerToSocket.set(playerId, socketId);
    if (!this.hostPlayerId) this.hostPlayerId = playerId;
    return emptySlot;
  }

  addBot(botId: string, botName: string): number | null {
    const emptySlot = this.slots.findIndex((s) => s.playerId === null);
    if (emptySlot === -1) return null;

    this.slots[emptySlot]!.playerId = botId;
    this.slots[emptySlot]!.name = botName;
    this.slots[emptySlot]!.ready = true;
    this.slots[emptySlot]!.isBot = true;
    return emptySlot;
  }

  removeBot(playerId: string): boolean {
    const slot = this.slots.find((s) => s.playerId === playerId && s.isBot);
    if (!slot) return false;
    slot.playerId = null;
    slot.name = null;
    slot.ready = false;
    slot.isBot = false;
    return true;
  }

  getBotIds(): string[] {
    return this.slots.filter((s) => s.isBot && s.playerId).map((s) => s.playerId!);
  }

  removePlayer(playerId: string): void {
    const slot = this.slots.find((s) => s.playerId === playerId);
    if (!slot) return;
    slot.playerId = null;
    slot.name = null;
    slot.ready = false;

    const socketId = this.playerToSocket.get(playerId);
    if (socketId) this.socketToPlayer.delete(socketId);
    this.playerToSocket.delete(playerId);

    if (this.hostPlayerId === playerId) {
      this.hostPlayerId = this.slots.find((s) => s.playerId !== null)?.playerId ?? null;
    }
  }

  reconnectPlayer(playerId: string, socketId: string): boolean {
    const slot = this.slots.find((s) => s.playerId === playerId);
    if (!slot) return false;

    const oldTimer = this.rejoinTimers.get(playerId);
    if (oldTimer) {
      clearTimeout(oldTimer);
      this.rejoinTimers.delete(playerId);
    }

    const oldSocket = this.playerToSocket.get(playerId);
    if (oldSocket) this.socketToPlayer.delete(oldSocket);
    this.socketToPlayer.set(socketId, playerId);
    this.playerToSocket.set(playerId, socketId);
    return true;
  }

  startRejoinTimer(playerId: string, onExpire: () => void): void {
    const existing = this.rejoinTimers.get(playerId);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      this.rejoinTimers.delete(playerId);
      onExpire();
    }, REJOIN_WINDOW_MS);
    this.rejoinTimers.set(playerId, t);
  }

  isFull(): boolean {
    return this.slots.every((s) => s.playerId !== null);
  }

  isEmpty(): boolean {
    return this.slots.every((s) => s.playerId === null);
  }

  allReady(): boolean {
    const occupied = this.slots.filter((s) => s.playerId !== null);
    return occupied.length >= 2 && occupied.every((s) => s.ready);
  }

  getFilledSlots(): Array<{ playerId: string; name: string; color: PlayerColor; seatIndex: number }> {
    return this.slots
      .map((s, i) => ({ ...s, seatIndex: i }))
      .filter((s): s is typeof s & { playerId: string; name: string; color: PlayerColor } => s.playerId !== null);
  }

  toState(): LobbyState {
    return {
      id: this.id,
      settings: this.settings,
      slots: this.slots,
      status: this.status,
      gameId: this.gameId,
      hostPlayerId: this.hostPlayerId,
      createdAt: this.createdAt,
    };
  }

  destroy(): void {
    for (const t of this.rejoinTimers.values()) clearTimeout(t);
    this.rejoinTimers.clear();
  }
}
