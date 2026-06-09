export class TurnTimer {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  set(gameId: string, seconds: number, onExpiry: () => void): void {
    this.cancel(gameId);
    if (seconds <= 0) return;
    this.timers.set(gameId, setTimeout(onExpiry, seconds * 1000));
  }

  cancel(gameId: string): void {
    const t = this.timers.get(gameId);
    if (t !== undefined) {
      clearTimeout(t);
      this.timers.delete(gameId);
    }
  }

  cancelAll(): void {
    for (const [id] of this.timers) this.cancel(id);
  }
}
