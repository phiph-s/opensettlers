import React, { useEffect, useState } from 'react';
import { socket } from '../socket.js';
import { useLobbyStore } from '../store/useLobbyStore.js';
import { usePlayerStore } from '../store/usePlayerStore.js';
import { useThemeStore } from '../store/useThemeStore.js';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { MapPreview } from '../components/lobby/MapPreview.js';

const COLOR_CSS: Record<string, string> = {
  red: '#e63946', blue: '#457b9d', orange: '#f4a261', black: '#8a8a9a',
  green: '#2ecc71', purple: '#9b59b6', yellow: '#e8c730', pink: '#e91e8c',
};

interface PreviewHex { q: number; r: number; terrain?: string }
interface MapMeta { id: string; name: string; playerCounts: number[]; hexCount?: number; previewHexes?: PreviewHex[] }

function makeTheme(dark: boolean) {
  if (dark) return {
    bg: 'linear-gradient(150deg, #080f1e 0%, #0c1a36 45%, #080d1a 100%)',
    text: '#c0d0e8',
    textMuted: '#5a7a9a',
    textDim: '#3a6080',
    title: '#ddc98a',
    accent: '#c9a84c',
    headerBorder: '1px solid rgba(201,168,76,0.12)',
    divider: '1px solid rgba(201,168,76,0.08)',
    leftBorder: '1px solid rgba(201,168,76,0.08)',
    panelBg: 'rgba(255,255,255,0.025)',
    settingsBorder: '1px solid rgba(42,63,106,0.5)',
    settingsBg: 'rgba(255,255,255,0.02)',
    cardSelBg: 'rgba(201,168,76,0.1)',
    cardSelBorder: 'rgba(201,168,76,0.5)',
    cardUnselBg: 'rgba(255,255,255,0.025)',
    cardUnselBorder: 'rgba(42,63,106,0.6)',
    cardSelTitleColor: '#ddc98a',
    cardUnselTitleColor: '#5a7a9a',
    cardSubColor: '#3a6080',
    cardSubSelColor: '#8a7a5a',
    slotMe: 'rgba(201,168,76,0.06)',
    slotMeBorder: 'rgba(201,168,76,0.3)',
    slotBot: 'rgba(255,255,255,0.025)',
    slotBotBorder: 'rgba(90,60,140,0.4)',
    slotFilled: 'rgba(255,255,255,0.025)',
    slotFilledBorder: 'rgba(42,63,106,0.7)',
    slotEmpty: 'rgba(255,255,255,0.01)',
    slotEmptyBorder: 'rgba(20,35,60,0.8)',
    slotEmptyText: '#1a2e48',
    nameMe: '#ddc98a',
    nameBot: '#9a80c0',
    nameFilled: '#b0c8e0',
    nameEmpty: '#1a2e48',
    tagMe: '#c9a84c',
    tagHost: '#4a6a8a',
    settingLabel: '#8ab4d0',
    settingNote: '#3a6080',
    addBotBg: 'rgba(90,60,140,0.08)',
    addBotBorder: 'rgba(90,60,140,0.3)',
    addBotText: '#6a4a9a',
    addBotHoverBg: 'rgba(90,60,140,0.15)',
    removeBotText: '#4a3a6a',
    removeBotBorder: 'rgba(90,60,140,0.3)',
    advBtnColor: (on: boolean) => on ? '#c9a84c' : '#3a6080',
    footerBorder: '1px solid rgba(201,168,76,0.1)',
    footerStatus: '#3a6080',
    readyOnBg: 'rgba(231,76,60,0.12)',
    readyOnBorder: 'rgba(231,76,60,0.4)',
    readyOnText: '#e05555',
    readyOffBg: 'rgba(39,174,96,0.12)',
    readyOffBorder: 'rgba(39,174,96,0.4)',
    readyOffText: '#2ecc71',
    launchReadyBg: 'linear-gradient(135deg, #b8942a 0%, #8a6a18 100%)',
    launchReadyBorder: 'rgba(201,168,76,0.4)',
    launchReadyText: '#f5e8c0',
    launchNotReadyBg: 'rgba(42,63,106,0.3)',
    launchNotReadyBorder: 'rgba(42,63,106,0.4)',
    launchNotReadyText: '#3a6080',
    codeBoxBg: 'rgba(201,168,76,0.07)',
    codeBoxBorder: '1px solid rgba(201,168,76,0.25)',
    codeLabel: '#c9a84c',
    codeValue: '#e8c870',
    codeCopyBorder: 'rgba(201,168,76,0.35)',
    codeCopyText: '#c9a84c',
    privateLabel: '#2a4a6a',
    glow: `radial-gradient(ellipse 50% 60% at 10% 80%, rgba(69,123,157,0.07) 0%, transparent 70%),
           radial-gradient(ellipse 40% 40% at 90% 20%, rgba(201,168,76,0.05) 0%, transparent 60%)`,
    sliderAccent: '#c9a84c',
    sliderRange: '#1a2e48',
    rangeLabelColor: '#2a4a6a',
  };
  return {
    bg: 'linear-gradient(150deg, #f5ede0 0%, #ecdbc0 45%, #f0e4cc 100%)',
    text: '#2a1808',
    textMuted: '#7a5830',
    textDim: '#5a4020',
    title: '#5a3008',
    accent: '#8a6010',
    headerBorder: '1px solid rgba(139,100,40,0.18)',
    divider: '1px solid rgba(139,100,40,0.12)',
    leftBorder: '1px solid rgba(139,100,40,0.12)',
    panelBg: 'rgba(255,255,255,0.4)',
    settingsBorder: '1px solid rgba(139,100,40,0.3)',
    settingsBg: 'rgba(255,255,255,0.3)',
    cardSelBg: 'rgba(139,100,40,0.1)',
    cardSelBorder: 'rgba(139,100,40,0.5)',
    cardUnselBg: 'rgba(255,255,255,0.4)',
    cardUnselBorder: 'rgba(139,100,40,0.22)',
    cardSelTitleColor: '#5a3008',
    cardUnselTitleColor: '#7a5030',
    cardSubColor: '#7a5030',
    cardSubSelColor: '#6a4820',
    slotMe: 'rgba(139,100,40,0.06)',
    slotMeBorder: 'rgba(139,100,40,0.3)',
    slotBot: 'rgba(255,255,255,0.35)',
    slotBotBorder: 'rgba(90,60,140,0.35)',
    slotFilled: 'rgba(255,255,255,0.35)',
    slotFilledBorder: 'rgba(139,100,40,0.25)',
    slotEmpty: 'rgba(255,255,255,0.2)',
    slotEmptyBorder: 'rgba(139,100,40,0.15)',
    slotEmptyText: '#7a6040',
    nameMe: '#5a3008',
    nameBot: '#7a5090',
    nameFilled: '#3a2010',
    nameEmpty: '#7a6040',
    tagMe: '#8a6010',
    tagHost: '#6a4820',
    settingLabel: '#3a2010',
    settingNote: '#6a5030',
    addBotBg: 'rgba(90,60,140,0.06)',
    addBotBorder: 'rgba(90,60,140,0.25)',
    addBotText: '#7a50a0',
    addBotHoverBg: 'rgba(90,60,140,0.12)',
    removeBotText: '#6a50a0',
    removeBotBorder: 'rgba(90,60,140,0.3)',
    advBtnColor: (on: boolean) => on ? '#8a6010' : '#6a5030',
    footerBorder: '1px solid rgba(139,100,40,0.15)',
    footerStatus: '#6a5030',
    readyOnBg: 'rgba(180,40,40,0.1)',
    readyOnBorder: 'rgba(180,40,40,0.35)',
    readyOnText: '#b83030',
    readyOffBg: 'rgba(39,130,70,0.1)',
    readyOffBorder: 'rgba(39,130,70,0.35)',
    readyOffText: '#2a8040',
    launchReadyBg: 'linear-gradient(135deg, #b8942a 0%, #8a6a18 100%)',
    launchReadyBorder: 'rgba(139,100,40,0.4)',
    launchReadyText: '#f5e8c0',
    launchNotReadyBg: 'rgba(139,100,40,0.1)',
    launchNotReadyBorder: 'rgba(139,100,40,0.2)',
    launchNotReadyText: '#8a7050',
    codeBoxBg: 'rgba(139,100,40,0.07)',
    codeBoxBorder: '1px solid rgba(139,100,40,0.25)',
    codeLabel: '#8a6010',
    codeValue: '#6a4808',
    codeCopyBorder: 'rgba(139,100,40,0.35)',
    codeCopyText: '#8a6010',
    privateLabel: '#7a5830',
    glow: `radial-gradient(ellipse 50% 60% at 10% 80%, rgba(200,150,80,0.08) 0%, transparent 70%),
           radial-gradient(ellipse 40% 40% at 90% 20%, rgba(139,100,40,0.05) 0%, transparent 60%)`,
    sliderAccent: '#8a6010',
    sliderRange: '#c8b898',
    rangeLabelColor: '#7a5830',
  };
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled: boolean }) {
  const { dark } = useThemeStore();
  return (
    <button
      disabled={disabled}
      onClick={onChange}
      style={{
        width: 40, height: 22, borderRadius: 11, border: 'none',
        background: on ? '#27ae60' : (dark ? 'rgba(42,63,106,0.8)' : 'rgba(139,100,40,0.15)'),
        position: 'relative', flexShrink: 0,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: on ? 20 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }} />
    </button>
  );
}

export function LobbyRoomScreen() {
  const { currentLobby } = useLobbyStore();
  const { myPlayerId } = usePlayerStore();
  const { dark, toggle } = useThemeStore();
  const isMobile = useIsMobile();
  const th = makeTheme(dark);
  const [availableMaps, setAvailableMaps] = useState<MapMeta[]>([]);

  useEffect(() => {
    socket.emit('lobby:maps', (res) => {
      if (res.ok) setAvailableMaps(res.data);
    });
  }, []);

  if (!currentLobby) return null;

  const { id, slots, settings, hostPlayerId } = currentLobby;
  const isHost = myPlayerId === hostPlayerId;
  const mySlot = slots.find((s) => s.playerId === myPlayerId);
  const occupied = slots.filter((s) => s.playerId);
  const allReady = occupied.length >= 2 && occupied.every((s) => s.ready);
  const privateCode = settings.private ? settings.privateCode : null;

  return (
    <div style={{
      minHeight: '100vh',
      background: th.bg,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Crimson Pro', Georgia, serif",
      color: th.text,
      overflow: isMobile ? 'auto' : 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: th.glow,
      }} />

      {/* ── HEADER ── */}
      <div style={{
        borderBottom: th.headerBorder,
        padding: isMobile ? '14px 20px' : '20px 44px',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        position: 'relative',
        zIndex: 1,
        flexShrink: 0,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: 22,
            fontWeight: 900,
            color: th.title,
            letterSpacing: 1,
          }}>
            OpenSettlers
          </div>
          <div style={{ fontSize: 12, color: th.privateLabel, marginTop: 2, fontStyle: 'italic' }}>
            {settings.private ? '🔒 Private room' : '🌐 Public room'}
            {settings.timerEnabled ? ' · Timer on' : ''}
            {' · '}
            <span style={{ fontFamily: 'monospace', opacity: 0.7 }}>#{id}</span>
          </div>
        </div>

        {/* Theme toggle */}
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
            flexShrink: 0,
          }}
        >
          {dark ? '☀️' : '🌙'}
        </button>

        {isHost && privateCode && (
          <div style={{
            background: th.codeBoxBg,
            border: th.codeBoxBorder,
            borderRadius: 10,
            padding: '8px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}>
            <div>
              <div style={{ fontSize: 9, color: th.codeLabel, letterSpacing: 3, fontFamily: "'Cinzel', serif", textTransform: 'uppercase' }}>Room Code</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 8, color: th.codeValue, fontFamily: 'monospace', lineHeight: 1.2 }}>
                {privateCode}
              </div>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(privateCode)}
              style={{
                background: 'transparent', border: `1px solid ${th.codeCopyBorder}`,
                color: th.codeCopyText, borderRadius: 6, padding: '4px 12px',
                cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
              }}
            >
              Copy
            </button>
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        overflow: isMobile ? 'visible' : 'hidden',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* LEFT — Players */}
        <div style={{
          width: isMobile ? '100%' : 340,
          borderRight: isMobile ? 'none' : th.leftBorder,
          borderBottom: isMobile ? th.leftBorder : 'none',
          display: 'flex',
          flexDirection: 'column',
          padding: isMobile ? '20px 20px' : '28px 28px',
          overflowY: 'auto',
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 10, letterSpacing: 4, color: th.accent,
            textTransform: 'uppercase',
            fontFamily: "'Cinzel', Georgia, serif",
            marginBottom: 4,
          }}>
            Players
          </div>
          <div style={{ fontSize: 12, color: th.textDim, fontStyle: 'italic', marginBottom: 20 }}>
            {occupied.length} / {settings.maxPlayers} joined
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {slots.map((slot, i) => {
              const clr = COLOR_CSS[slot.color ?? 'blue'] ?? '#457b9d';
              const isMe = slot.playerId === myPlayerId;
              const isHostSlot = slot.playerId === hostPlayerId;
              const filled = !!slot.playerId;

              const bg = filled
                ? isMe ? th.slotMe : slot.isBot ? th.slotBot : th.slotFilled
                : th.slotEmpty;
              const border = filled
                ? isMe ? th.slotMeBorder : slot.isBot ? th.slotBotBorder : th.slotFilledBorder
                : th.slotEmptyBorder;

              return (
                <div key={i} style={{
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: 12,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: filled ? clr : (dark ? '#1a2a3a' : '#d0c0a8'),
                    border: `2px solid ${filled ? clr + '66' : (dark ? '#0f1a2a' : '#c0a888')}`,
                    boxShadow: filled ? `0 0 8px ${clr}44` : 'none',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14,
                      color: filled
                        ? isMe ? th.nameMe : slot.isBot ? th.nameBot : th.nameFilled
                        : th.nameEmpty,
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontWeight: filled ? 600 : 400,
                    }}>
                      {slot.isBot && <span style={{ fontSize: 12 }}>🤖</span>}
                      {filled ? (slot.name ?? 'Unknown') : <em style={{ fontStyle: 'italic', fontSize: 13 }}>Empty</em>}
                    </div>
                    <div style={{ fontSize: 11, color: th.textDim, marginTop: 1, display: 'flex', gap: 6 }}>
                      {isMe && <span style={{ color: th.tagMe }}>you</span>}
                      {isHostSlot && !slot.isBot && <span style={{ color: th.tagHost }}>👑 host</span>}
                    </div>
                  </div>

                  {slot.isBot && isHost ? (
                    <button
                      onClick={() => socket.emit('lobby:remove_bot', { lobbyId: id, playerId: slot.playerId! }, () => {})}
                      style={{
                        background: 'transparent',
                        color: th.removeBotText,
                        border: `1px solid ${th.removeBotBorder}`,
                        borderRadius: 6, padding: '2px 10px',
                        cursor: 'pointer', fontSize: 11,
                        fontFamily: 'inherit',
                      }}
                    >
                      Remove
                    </button>
                  ) : filled ? (
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: slot.ready ? 'rgba(39,174,96,0.25)' : 'rgba(231,76,60,0.15)',
                      border: `1.5px solid ${slot.ready ? '#27ae60' : '#e74c3c'}`,
                      flexShrink: 0,
                    }}>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {isHost && slots.some((s) => !s.playerId) && (
            <button
              onClick={() => socket.emit('lobby:add_bot', { lobbyId: id }, () => {})}
              style={{
                marginTop: 10,
                background: th.addBotBg,
                color: th.addBotText,
                border: `1px dashed ${th.addBotBorder}`,
                borderRadius: 10,
                padding: '10px 16px',
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: 'inherit',
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = th.addBotHoverBg; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = th.addBotBg; }}
            >
              🤖 Add Bot
            </button>
          )}
        </div>

        {/* RIGHT — Settings */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: isMobile ? '20px 20px' : '28px 36px',
          overflowY: 'auto',
        }}>
          {/* Map selector */}
          <div style={{ marginBottom: 32 }}>
            <div style={{
              fontSize: 10, letterSpacing: 4, color: th.accent,
              textTransform: 'uppercase',
              fontFamily: "'Cinzel', Georgia, serif",
              marginBottom: 16,
            }}>
              Map
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
              {availableMaps.map((map) => {
                const sel = settings.mapTemplateId === map.id;
                return (
                  <button
                    key={map.id}
                    disabled={!isHost}
                    onClick={() => socket.emit('lobby:settings', { lobbyId: id, settings: { mapTemplateId: map.id } })}
                    style={{
                      background: sel ? th.cardSelBg : th.cardUnselBg,
                      border: `1.5px solid ${sel ? th.cardSelBorder : th.cardUnselBorder}`,
                      borderRadius: 12,
                      padding: '12px 16px',
                      cursor: isHost ? 'pointer' : 'default',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                      minWidth: 120,
                    }}
                  >
                    {map.previewHexes && map.previewHexes.length > 0 && (
                      <div style={{ marginBottom: 8, borderRadius: 6, overflow: 'hidden' }}>
                        <MapPreview hexes={map.previewHexes} width={72} height={52} dark={dark} />
                      </div>
                    )}
                    <div style={{
                      fontSize: 15, fontWeight: 700,
                      color: sel ? th.cardSelTitleColor : th.cardUnselTitleColor,
                      fontFamily: "'Cinzel', Georgia, serif",
                      letterSpacing: 0.5,
                    }}>
                      {(map.name.split('(')[0] ?? map.name).trim()}
                    </div>
                    <div style={{ fontSize: 11, color: sel ? th.cardSubSelColor : th.cardSubColor, marginTop: 4, fontStyle: 'italic' }}>
                      {map.playerCounts[0]}–{map.playerCounts[map.playerCounts.length - 1]} players · {map.hexCount ? `${map.hexCount} tiles` : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Settings */}
          <div>
            <div style={{
              fontSize: 10, letterSpacing: 4, color: th.accent,
              textTransform: 'uppercase',
              fontFamily: "'Cinzel', Georgia, serif",
              marginBottom: 12,
            }}>
              Settings
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
              {/* Bank Resources — slider */}
              <div style={{
                flex: 2,
                background: th.settingsBg,
                border: th.settingsBorder,
                borderRadius: 14,
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: th.settingLabel, fontWeight: 600 }}>Bank Resources
                    <div style={{ fontSize: 10, color: th.settingNote, fontStyle: 'italic', marginTop: 1 }}>stock per type</div>
                  </div>
                  <div style={{
                    fontSize: 20, fontWeight: 800, color: th.accent,
                    fontFamily: "'Cinzel', Georgia, serif",
                  }}>
                    {settings.bankResourceCount}
                  </div>
                </div>
                <div>
                  <input
                    type="range" min={10} max={30} step={1}
                    value={settings.bankResourceCount}
                    disabled={!isHost}
                    onChange={(e) => socket.emit('lobby:settings', { lobbyId: id, settings: { bankResourceCount: Number(e.target.value) } })}
                    style={{ width: '100%', accentColor: th.sliderAccent, cursor: isHost ? 'pointer' : 'default' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: th.rangeLabelColor, fontSize: 10, marginTop: 2 }}>
                    <span>10</span><span>19 std</span><span>30</span>
                  </div>
                </div>
              </div>

              {/* Balanced Dice — box toggle */}
              {(['balancedDice', 'friendlyRobber'] as const).map((key) => {
                const on = settings[key];
                const label = key === 'balancedDice' ? 'Balanced Dice' : 'Friendly Robber';
                const note  = key === 'balancedDice' ? 'Flatter bell curve' : "Can't target ≤3 VP";
                return (
                  <button
                    key={key}
                    disabled={!isHost}
                    onClick={() => isHost && socket.emit('lobby:settings', { lobbyId: id, settings: { [key]: !on } })}
                    style={{
                      flex: 1,
                      background: on ? th.cardSelBg : th.settingsBg,
                      border: `1.5px solid ${on ? th.cardSelBorder : th.cardUnselBorder}`,
                      borderRadius: 14,
                      padding: '12px 14px',
                      cursor: isHost ? 'pointer' : 'default',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 12, color: on ? th.cardSelTitleColor : th.settingLabel, fontWeight: 600, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 10, color: on ? th.cardSubSelColor : th.settingNote, fontStyle: 'italic' }}>{note}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        borderTop: th.footerBorder,
        padding: '18px 44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 12,
        position: 'relative',
        zIndex: 1,
        flexShrink: 0,
      }}>
        <div style={{ flex: 1, fontSize: 12, color: th.footerStatus, fontStyle: 'italic' }}>
          {allReady
            ? '✓ All players ready'
            : `${occupied.filter((s) => s.ready).length}/${occupied.length} ready`}
        </div>

        {mySlot && (
          <button
            onClick={() => socket.emit('lobby:ready', { lobbyId: id, ready: !mySlot.ready })}
            style={{
              background: mySlot.ready ? th.readyOnBg : th.readyOffBg,
              border: `1px solid ${mySlot.ready ? th.readyOnBorder : th.readyOffBorder}`,
              color: mySlot.ready ? th.readyOnText : th.readyOffText,
              borderRadius: 10,
              padding: '10px 24px',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'Cinzel', Georgia, serif",
              letterSpacing: 0.5,
              transition: 'all 0.15s',
            }}
          >
            {mySlot.ready ? 'Not Ready' : '✓ Ready'}
          </button>
        )}

        {isHost && (
          <button
            disabled={!allReady}
            onClick={() => socket.emit('lobby:start', { lobbyId: id }, (res) => {
              if (!res.ok) alert(res.message);
            })}
            style={{
              background: allReady ? th.launchReadyBg : th.launchNotReadyBg,
              border: `1px solid ${allReady ? th.launchReadyBorder : th.launchNotReadyBorder}`,
              color: allReady ? th.launchReadyText : th.launchNotReadyText,
              borderRadius: 10,
              padding: '10px 28px',
              cursor: allReady ? 'pointer' : 'not-allowed',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'Cinzel', Georgia, serif",
              letterSpacing: 0.5,
              boxShadow: allReady ? '0 4px 20px rgba(184,148,42,0.25)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            ⚓ Launch Game
          </button>
        )}
      </div>
    </div>
  );
}
