export const PORT = Number(process.env['PORT'] ?? 4000);
export const CORS_ORIGIN = process.env['CORS_ORIGIN'] ?? 'http://localhost:5173';

/** How often the idle reaper sweeps for abandoned lobbies/games. */
export const REAP_INTERVAL_MS = 60_000;
/** A lobby with zero connected humans for this long is destroyed (frees the game, board, bots). */
export const ABANDONED_LOBBY_TTL_MS = 5 * 60_000;

