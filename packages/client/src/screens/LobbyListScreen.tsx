import React, { useEffect, useState } from 'react';
import { socket } from '../socket.js';
import { useLobbyStore } from '../store/useLobbyStore.js';
import { usePlayerStore } from '../store/usePlayerStore.js';
import { useThemeStore } from '../store/useThemeStore.js';
import { useIsMobile } from '../hooks/useIsMobile.js';
import type { LobbyState } from '@opensettlers/shared';

function makeTheme(dark: boolean) {
  if (dark) return {
    bg: 'linear-gradient(150deg, #080f1e 0%, #0c1a36 45%, #080d1a 100%)',
    text: '#c0d0e8',
    textMuted: '#5a7a9a',
    textDim: '#3a6080',
    title: '#ddc98a',
    subtitle: '#4a7a9a',
    accent: '#c9a84c',
    accentTitle: '#e8c870',
    dividerRight: '1px solid rgba(201,168,76,0.12)',
    divider: '1px solid rgba(201,168,76,0.1)',
    panelBg: 'rgba(255,255,255,0.025)',
    panelBorder: '1px solid rgba(201,168,76,0.18)',
    inputBg: 'rgba(255,255,255,0.04)',
    inputText: '#c0d4ec',
    inputBorder: '1px solid rgba(42,63,106,0.8)',
    cardBg: 'rgba(255,255,255,0.02)',
    cardBorder: 'rgba(42,63,106,0.7)',
    cardHoverBg: 'rgba(255,255,255,0.04)',
    cardHoverBorder: 'rgba(201,168,76,0.3)',
    btnBlueBg: 'rgba(69,123,157,0.12)',
    btnBlueBorder: 'rgba(69,123,157,0.4)',
    btnBlueText: '#6a9ab8',
    btnBlueHoverBg: 'rgba(69,123,157,0.22)',
    emptyColor: '#2a4060',
    lobbyNameColor: '#8ab4d0',
    lobbySubColor: '#3a6080',
    privateCodeBg: 'rgba(201,168,76,0.07)',
    privateCodeBorder: '1px solid rgba(201,168,76,0.25)',
    privateToggleOn: 'rgba(201,168,76,0.12)',
    privateToggleBorderOn: 'rgba(201,168,76,0.5)',
    privateToggleTextOn: '#c9a84c',
    privateToggleOff: 'rgba(255,255,255,0.04)',
    privateToggleBorderOff: 'rgba(42,63,106,0.8)',
    privateToggleTextOff: '#3a5a7a',
    glow: `radial-gradient(ellipse 60% 50% at 15% 60%, rgba(69,123,157,0.07) 0%, transparent 70%),
           radial-gradient(ellipse 40% 60% at 85% 30%, rgba(201,168,76,0.05) 0%, transparent 60%)`,
    hexDecoColor: '#c9a84c',
    codeText: '#e8c870',
    codeFont: '#c9a84c',
    selectBg: 'rgba(10,18,36,0.95)',
    liveBg: 'rgba(39,174,96,0.12)',
    liveBorder: 'rgba(39,174,96,0.3)',
    liveText: '#27ae60',
  };
  return {
    bg: 'linear-gradient(150deg, #f5ede0 0%, #ecdbc0 45%, #f0e4cc 100%)',
    text: '#2a1808',
    textMuted: '#7a5830',
    textDim: '#5a4020',
    title: '#5a3008',
    subtitle: '#7a5830',
    accent: '#8a6010',
    accentTitle: '#6a4808',
    dividerRight: '1px solid rgba(139,100,40,0.18)',
    divider: '1px solid rgba(139,100,40,0.15)',
    panelBg: 'rgba(255,255,255,0.45)',
    panelBorder: '1px solid rgba(139,100,40,0.22)',
    inputBg: 'rgba(255,255,255,0.7)',
    inputText: '#2a1808',
    inputBorder: '1px solid rgba(139,100,40,0.35)',
    cardBg: 'rgba(255,255,255,0.35)',
    cardBorder: 'rgba(139,100,40,0.25)',
    cardHoverBg: 'rgba(255,255,255,0.55)',
    cardHoverBorder: 'rgba(139,100,40,0.5)',
    btnBlueBg: 'rgba(100,60,20,0.08)',
    btnBlueBorder: 'rgba(100,60,20,0.3)',
    btnBlueText: '#6a4020',
    btnBlueHoverBg: 'rgba(100,60,20,0.15)',
    emptyColor: '#8a7050',
    lobbyNameColor: '#4a2a08',
    lobbySubColor: '#7a5030',
    privateCodeBg: 'rgba(139,100,40,0.08)',
    privateCodeBorder: '1px solid rgba(139,100,40,0.28)',
    privateToggleOn: 'rgba(139,100,40,0.1)',
    privateToggleBorderOn: 'rgba(139,100,40,0.5)',
    privateToggleTextOn: '#8a6010',
    privateToggleOff: 'rgba(0,0,0,0.04)',
    privateToggleBorderOff: 'rgba(139,100,40,0.25)',
    privateToggleTextOff: '#6a4820',
    glow: `radial-gradient(ellipse 60% 50% at 15% 60%, rgba(200,150,80,0.08) 0%, transparent 70%),
           radial-gradient(ellipse 40% 60% at 85% 30%, rgba(139,100,40,0.05) 0%, transparent 60%)`,
    hexDecoColor: '#8a6010',
    codeText: '#6a4808',
    codeFont: '#8a6010',
    selectBg: 'rgba(240,228,210,0.98)',
    liveBg: 'rgba(39,130,70,0.1)',
    liveBorder: 'rgba(39,130,70,0.3)',
    liveText: '#2e7d40',
  };
}

function HexDeco({ color }: { color: string }) {
  const hexPts = (cx: number, cy: number, r: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(' ');

  const grid = [
    [140, 56], [105, 90], [175, 90],
    [70, 124], [140, 124], [210, 124],
    [105, 158], [175, 158], [140, 192],
  ] as [number, number][];

  return (
    <svg width="280" height="240" viewBox="0 0 280 240"
      style={{ position: 'absolute', top: 32, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none', opacity: 0.08 }}>
      {grid.map(([x, y], i) => (
        <polygon key={i} points={hexPts(x, y, 30)} fill="none" stroke={color} strokeWidth="1.5" />
      ))}
    </svg>
  );
}

export function LobbyListScreen() {
  const [name, setName] = useState(() => localStorage.getItem('opensettlers_username') ?? '');
  const [error, setError] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPrivate, setIsPrivate] = useState(false);
  const [privateCode, setPrivateCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const { lobbies, setLobbies, setCurrentLobby } = useLobbyStore();
  const { setPlayer, setLobbyId } = usePlayerStore();
  const { dark, toggle } = useThemeStore();
  const th = makeTheme(dark);

  useEffect(() => {
    socket.emit('lobby:list', (res) => {
      if (res.ok) setLobbies(res.data);
    });
  }, [setLobbies]);

  const createLobby = () => {
    if (!name.trim()) { setError('Enter your name'); return; }
    socket.emit('lobby:create', { playerName: name.trim(), settings: { maxPlayers, private: isPrivate } }, (res) => {
      if (res.ok) {
        localStorage.setItem('opensettlers_username', name.trim());
        setPlayer(res.data.playerId, name.trim());
        setCurrentLobby(res.data.lobby);
        setLobbyId(res.data.lobby.id);
        if (isPrivate && res.data.lobby.settings.privateCode) {
          setPrivateCode(res.data.lobby.settings.privateCode);
        }
      } else {
        setError(res.message);
      }
    });
  };

  const joinLobby = (lobbyId: string) => {
    if (!name.trim()) { setError('Enter your name first'); return; }
    socket.emit('lobby:join', { lobbyId, playerName: name.trim() }, (res) => {
      if (res.ok) {
        localStorage.setItem('opensettlers_username', name.trim());
        setPlayer(res.data.playerId, name.trim());
        setCurrentLobby(res.data.lobby);
        setLobbyId(res.data.lobby.id);
      } else {
        setError(res.message);
      }
    });
  };

  const joinByCode = () => {
    if (!name.trim()) { setError('Enter your name first'); return; }
    socket.emit('lobby:join_by_code', { code: joinCode.trim(), playerName: name.trim() }, (res) => {
      if (res.ok) {
        localStorage.setItem('opensettlers_username', name.trim());
        setPlayer(res.data.playerId, name.trim());
        setCurrentLobby(res.data.lobby);
        setLobbyId(res.data.lobby.id);
      } else {
        setError(res.message);
      }
    });
  };

  const isMobile = useIsMobile();
  const waitingLobbies = lobbies.filter((l) => l.status === 'waiting' && !l.settings.private);

  const inputSt: React.CSSProperties = {
    width: '100%',
    background: th.inputBg,
    color: th.inputText,
    border: th.inputBorder,
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 14,
    outline: 'none',
    fontFamily: "'Crimson Pro', Georgia, serif",
    marginTop: 0,
    boxSizing: 'border-box',
  };

  const labelSt: React.CSSProperties = {
    fontSize: 10,
    color: th.textDim,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 5,
    fontFamily: "'Cinzel', Georgia, serif",
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: th.bg,
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      overflow: isMobile ? 'auto' : 'hidden',
      fontFamily: "'Crimson Pro', Georgia, serif",
      color: th.text,
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: th.glow,
      }} />

      {/* ── LEFT PANEL ── */}
      <div style={{
        width: isMobile ? '100%' : 400,
        minHeight: isMobile ? 'unset' : '100vh',
        borderRight: isMobile ? 'none' : th.dividerRight,
        borderBottom: isMobile ? th.divider : 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: isMobile ? 'flex-start' : 'center',
        padding: isMobile ? '32px 24px' : '52px 44px',
        position: 'relative',
        zIndex: 1,
        flexShrink: 0,
      }}>
        <HexDeco color={th.hexDecoColor} />

        {/* Wordmark */}
        <div style={{ marginBottom: 44, position: 'relative' }}>
          <div style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: 42,
            fontWeight: 900,
            lineHeight: 1.05,
            color: th.title,
            letterSpacing: 1,
            textShadow: dark ? '0 2px 24px rgba(201,168,76,0.25)' : '0 1px 4px rgba(90,48,8,0.1)',
          }}>
            Open<br />Settlers
          </div>
          <div style={{
            width: 40, height: 2,
            background: `linear-gradient(90deg, ${th.accent} 0%, transparent 100%)`,
            margin: '14px 0 10px',
          }} />
          <div style={{
            fontStyle: 'italic',
            fontSize: 15,
            color: th.subtitle,
            letterSpacing: 0.3,
          }}>
            Claim hexes. Build roads. Rule the island.
          </div>
        </div>

        {/* Create game card */}
        <div style={{
          background: th.panelBg,
          border: th.panelBorder,
          borderRadius: 16,
          padding: '26px 26px 24px',
        }}>
          <div style={{
            fontSize: 10,
            letterSpacing: 4,
            color: th.accent,
            textTransform: 'uppercase',
            fontFamily: "'Cinzel', Georgia, serif",
            marginBottom: 18,
          }}>
            Create Game
          </div>

          <input
            placeholder="Your name"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && createLobby()}
            style={inputSt}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={labelSt}>Players</div>
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                style={{ ...inputSt, cursor: 'pointer', marginTop: 0, padding: '9px 12px', background: th.selectBg }}
              >
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>{n} players</option>
                ))}
              </select>
            </div>
            <div>
              <div style={labelSt}>Room</div>
              <button
                onClick={() => setIsPrivate(!isPrivate)}
                style={{
                  height: 38, paddingInline: 14,
                  background: isPrivate ? th.privateToggleOn : th.privateToggleOff,
                  border: `1px solid ${isPrivate ? th.privateToggleBorderOn : th.privateToggleBorderOff}`,
                  borderRadius: 8,
                  color: isPrivate ? th.privateToggleTextOn : th.privateToggleTextOff,
                  cursor: 'pointer',
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                {isPrivate ? '🔒 Private' : '🌐 Public'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ color: '#e05555', fontSize: 13, marginTop: 10, fontStyle: 'italic' }}>{error}</div>
          )}

          <button
            onClick={createLobby}
            style={{
              width: '100%',
              marginTop: 14,
              background: 'linear-gradient(135deg, #b8942a 0%, #8a6a18 100%)',
              color: '#f5e8c0',
              border: '1px solid rgba(201,168,76,0.4)',
              borderRadius: 10,
              padding: '12px 0',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "'Cinzel', Georgia, serif",
              cursor: 'pointer',
              letterSpacing: 1,
              boxShadow: '0 4px 20px rgba(184,148,42,0.25)',
              transition: 'transform 0.1s, box-shadow 0.1s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; }}
          >
            ⚓ Set Sail
          </button>

          {privateCode && (
            <div style={{
              marginTop: 14,
              padding: '12px 14px',
              background: th.privateCodeBg,
              border: th.privateCodeBorder,
              borderRadius: 10,
            }}>
              <div style={{ fontSize: 10, color: th.codeFont, letterSpacing: 3, textTransform: 'uppercase', fontFamily: "'Cinzel', serif", marginBottom: 6 }}>Room Code</div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 8, color: th.codeText, fontFamily: 'monospace' }}>
                {privateCode}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(privateCode)}
                style={{ marginTop: 8, background: 'transparent', border: `1px solid ${th.btnBlueBorder}`, color: th.accent, borderRadius: 4, padding: '3px 12px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}
              >
                Copy
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{
        flex: 1,
        minHeight: isMobile ? 'unset' : '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: isMobile ? '24px 24px' : '52px 52px',
        overflowY: 'auto',
        zIndex: 1,
        position: 'relative',
      }}>
        {/* Theme toggle */}
        <div style={{ position: isMobile ? 'static' : 'absolute', top: 24, right: 36, zIndex: 2, marginBottom: isMobile ? 16 : 0, display: 'flex', justifyContent: isMobile ? 'flex-end' : undefined }}>
          <button
            onClick={toggle}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
              border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(139,100,40,0.2)'}`,
              borderRadius: 8,
              padding: '5px 10px',
              cursor: 'pointer',
              fontSize: 15,
              lineHeight: 1,
              color: th.accent,
            }}
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Open lobbies */}
        <div style={{ marginBottom: 40, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
            <div style={{
              fontSize: 10, letterSpacing: 4, color: th.accent,
              textTransform: 'uppercase',
              fontFamily: "'Cinzel', Georgia, serif",
            }}>
              Open Lobbies
            </div>
            {waitingLobbies.length > 0 && (
              <div style={{
                fontSize: 11,
                color: th.liveText,
                background: th.liveBg,
                border: `1px solid ${th.liveBorder}`,
                borderRadius: 10,
                padding: '1px 8px',
              }}>
                {waitingLobbies.length} live
              </div>
            )}
          </div>
          <div style={{ color: th.textDim, fontSize: 13, fontStyle: 'italic', marginBottom: 24 }}>
            {waitingLobbies.length > 0 ? 'Choose a game to join' : 'The seas are quiet — start a new game'}
          </div>

          {waitingLobbies.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '60px 0',
              color: th.emptyColor,
            }}>
              <svg width="80" height="70" viewBox="0 0 80 70" style={{ opacity: 0.18, marginBottom: 16 }}>
                {([[40,12],[16,32],[64,32],[28,52],[52,52]] as [number,number][]).map(([x, y], i) => (
                  <polygon key={i} points={`${x},${y-10} ${x+11},${y-4} ${x+11},${y+4} ${x},${y+10} ${x-11},${y+4} ${x-11},${y-4}`}
                    fill="none" stroke={th.accent} strokeWidth="1.5" />
                ))}
              </svg>
              <div style={{ fontStyle: 'italic', fontSize: 16 }}>No games found</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {waitingLobbies.map((lobby) => (
                <LobbyCard key={lobby.id} lobby={lobby} onJoin={() => joinLobby(lobby.id)} />
              ))}
            </div>
          )}
        </div>

        {/* Join by code */}
        <div style={{ borderTop: th.divider, paddingTop: 32 }}>
          <div style={{
            fontSize: 10, letterSpacing: 4, color: th.accent,
            textTransform: 'uppercase',
            fontFamily: "'Cinzel', Georgia, serif",
            marginBottom: 14,
          }}>
            Join Private Room
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              placeholder="XXXXXX"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && joinByCode()}
              maxLength={6}
              style={{
                ...inputSt,
                flex: 1,
                letterSpacing: 10,
                textTransform: 'uppercase',
                fontSize: 20,
                fontWeight: 700,
                textAlign: 'center',
                fontFamily: 'monospace',
              }}
            />
            <button
              onClick={joinByCode}
              style={{
                background: th.btnBlueBg,
                border: `1px solid ${th.btnBlueBorder}`,
                color: th.btnBlueText,
                borderRadius: 10,
                padding: '0 28px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'Cinzel', Georgia, serif",
                letterSpacing: 1,
                whiteSpace: 'nowrap',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = th.btnBlueHoverBg; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = th.btnBlueBg; }}
            >
              Join →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LobbyCard({ lobby, onJoin }: { lobby: LobbyState; onJoin: () => void }) {
  const { dark } = useThemeStore();
  const th = makeTheme(dark);
  const occupied = lobby.slots.filter((s) => s.playerId).length;
  const total = lobby.settings.maxPlayers;
  const mapLabel: Record<string, string> = { standard: 'Standard', large: 'Large', huge: 'Huge' };

  return (
    <div
      style={{
        background: th.cardBg,
        border: `1px solid ${th.cardBorder}`,
        borderRadius: 12,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        transition: 'border-color 0.15s, background 0.15s',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = th.cardHoverBorder;
        (e.currentTarget as HTMLElement).style.background = th.cardHoverBg;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = th.cardBorder;
        (e.currentTarget as HTMLElement).style.background = th.cardBg;
      }}
    >
      {/* Player count ring */}
      <div style={{ width: 44, height: 44, flexShrink: 0 }}>
        <svg width="44" height="44" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="18" fill="none" stroke={dark ? 'rgba(42,63,106,0.8)' : 'rgba(139,100,40,0.2)'} strokeWidth="2.5" />
          <circle cx="22" cy="22" r="18" fill="none"
            stroke={occupied >= total - 1 ? th.accent : (dark ? '#457b9d' : '#8a6010')}
            strokeWidth="2.5"
            strokeDasharray={`${2 * Math.PI * 18 * occupied / total} ${2 * Math.PI * 18}`}
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '22px 22px', transition: 'stroke-dasharray 0.4s' }}
          />
          <text x="22" y="26" textAnchor="middle"
            fill={occupied >= total - 1 ? th.accent : (dark ? '#7aaccc' : '#7a5030')}
            fontSize="12" fontWeight="700" fontFamily="monospace">
            {occupied}/{total}
          </text>
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: th.lobbyNameColor, fontWeight: 600, fontSize: 14, fontFamily: "'Crimson Pro', Georgia, serif" }}>
          Lobby <span style={{ opacity: 0.5, fontFamily: 'monospace', fontSize: 12 }}>#{lobby.id.slice(-6)}</span>
        </div>
        <div style={{ color: th.lobbySubColor, fontSize: 12, marginTop: 2, fontStyle: 'italic' }}>
          {mapLabel[lobby.settings.mapTemplateId ?? 'standard'] ?? 'Custom'} map
          {lobby.settings.balancedDice ? ' · balanced dice' : ''}
          {lobby.settings.friendlyRobber ? ' · friendly robber' : ''}
        </div>
      </div>

      <button
        onClick={onJoin}
        style={{
          background: th.btnBlueBg,
          border: `1px solid ${th.btnBlueBorder}`,
          color: th.btnBlueText,
          borderRadius: 8,
          padding: '7px 18px',
          cursor: 'pointer',
          fontSize: 13,
          fontFamily: "'Cinzel', Georgia, serif",
          letterSpacing: 0.5,
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = th.btnBlueHoverBg; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = th.btnBlueBg; }}
      >
        Join
      </button>
    </div>
  );
}
