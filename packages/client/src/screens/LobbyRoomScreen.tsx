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
interface MapMeta { id: string; name: string; playerCounts: number[]; hexCount?: number; seafarers?: boolean; previewHexes?: PreviewHex[] }

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

          {/* Ready + Launch — below player list */}
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, color: th.textDim, fontStyle: 'italic', textAlign: 'center' }}>
              {allReady ? '✓ All players ready' : `${occupied.filter((s) => s.ready).length}/${occupied.length} ready`}
            </div>
            {mySlot && (
              <button
                onClick={() => socket.emit('lobby:ready', { lobbyId: id, ready: !mySlot.ready })}
                style={{
                  background: mySlot.ready ? th.readyOnBg : th.readyOffBg,
                  border: `1px solid ${mySlot.ready ? th.readyOnBorder : th.readyOffBorder}`,
                  color: mySlot.ready ? th.readyOnText : th.readyOffText,
                  borderRadius: 10, padding: '10px 0',
                  cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  fontFamily: "'Cinzel', Georgia, serif", letterSpacing: 0.5,
                  width: '100%', transition: 'all 0.15s',
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
                  borderRadius: 10, padding: '10px 0',
                  cursor: allReady ? 'pointer' : 'not-allowed',
                  fontSize: 13, fontWeight: 700,
                  fontFamily: "'Cinzel', Georgia, serif", letterSpacing: 0.5,
                  width: '100%',
                  boxShadow: allReady ? '0 4px 20px rgba(184,148,42,0.25)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                ⚓ Launch Game
              </button>
            )}
          </div>
        </div>

        {/* RIGHT — Settings */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: isMobile ? '20px 20px' : '28px 36px',
          overflowY: 'auto',
          alignItems: 'flex-start',
        }}>
        <div style={{ width: '100%', maxWidth: 640 }}>
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
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {map.seafarers && (
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.75 }}>
                          <path d="M1 12c2-2 4-2 7 0s5 2 7 0"/>
                          <path d="M8 3v7"/>
                          <path d="M8 3l-4 4h8L8 3z"/>
                        </svg>
                      )}
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
            <div style={{ fontSize: 10, letterSpacing: 4, color: th.accent, textTransform: 'uppercase', fontFamily: "'Cinzel', Georgia, serif", marginBottom: 12 }}>
              Settings
            </div>

            {/* Top row: Bank slider + VP picker side by side */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              {/* Bank Resources */}
              <div style={{ flex: 3, minWidth: 0, background: th.settingsBg, border: th.settingsBorder, borderRadius: 12, padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={th.settingLabel} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="9" width="4" height="6" rx="1"/><rect x="6" y="5" width="4" height="10" rx="1"/><rect x="11" y="1" width="4" height="14" rx="1"/>
                  </svg>
                  <span style={{ fontSize: 11, color: th.settingLabel, fontWeight: 600, fontFamily: "'Cinzel', Georgia, serif", letterSpacing: 0.5 }}>Bank Resources</span>
                  <span style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 800, color: th.accent, fontFamily: "'Cinzel', Georgia, serif", lineHeight: 1 }}>{settings.bankResourceCount}</span>
                </div>
                <input
                  type="range" min={10} max={30} step={1}
                  value={settings.bankResourceCount}
                  disabled={!isHost}
                  onChange={(e) => socket.emit('lobby:settings', { lobbyId: id, settings: { bankResourceCount: Number(e.target.value) } })}
                  style={{ width: '100%', accentColor: th.sliderAccent, cursor: isHost ? 'pointer' : 'default', height: 3 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', color: th.rangeLabelColor, fontSize: 9, marginTop: 2, letterSpacing: 0.3 }}>
                  <span>10</span><span style={{ color: th.accent }}>19 std</span><span>30</span>
                </div>
              </div>

              {/* VP to Win */}
              <div style={{ flex: 2, minWidth: 0, background: th.settingsBg, border: th.settingsBorder, borderRadius: 12, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={th.settingLabel} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 1l1.8 3.6 4 .6-2.9 2.8.7 4L8 10l-3.6 1.9.7-4L2.2 5.2l4-.6z"/>
                  </svg>
                  <span style={{ fontSize: 11, color: th.settingLabel, fontWeight: 600, fontFamily: "'Cinzel', Georgia, serif", letterSpacing: 0.5 }}>Victory Points</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[8, 10, 12, 14, 16].map((v) => {
                    const sel = settings.vpToWin === v;
                    return (
                      <button key={v} disabled={!isHost}
                        onClick={() => isHost && socket.emit('lobby:settings', { lobbyId: id, settings: { vpToWin: v } })}
                        style={{
                          width: 30, height: 26,
                          background: sel ? th.cardSelBg : 'transparent',
                          border: `1.5px solid ${sel ? th.cardSelBorder : th.cardUnselBorder}`,
                          borderRadius: 6, cursor: isHost ? 'pointer' : 'default',
                          fontSize: 11, fontWeight: 700,
                          color: sel ? th.cardSelTitleColor : th.settingNote,
                          fontFamily: "'Cinzel', Georgia, serif",
                          transition: 'background 0.12s, border-color 0.12s',
                        }}>{v}</button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Toggle rows — 2-column grid */}
            {(() => {
              const Toggle = ({ label, note, icon, on, onClick }: { label: string; note: string; icon: React.ReactNode; on: boolean; onClick: () => void }) => (
                <button
                  disabled={!isHost}
                  onClick={onClick}
                  style={{
                    background: on ? th.cardSelBg : th.settingsBg,
                    border: `1.5px solid ${on ? th.cardSelBorder : th.cardUnselBorder}`,
                    borderRadius: 10, padding: '9px 12px',
                    cursor: isHost ? 'pointer' : 'default',
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'background 0.15s, border-color 0.15s',
                    width: '100%',
                  }}
                >
                  <span style={{ color: on ? th.cardSelTitleColor : th.settingNote, flexShrink: 0, display: 'flex' }}>{icon}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: on ? th.cardSelTitleColor : th.settingLabel, fontFamily: "'Cinzel', Georgia, serif", letterSpacing: 0.3 }}>{label}</span>
                    <span style={{ display: 'block', fontSize: 9, color: on ? th.cardSubSelColor : th.settingNote, marginTop: 1 }}>{note}</span>
                  </span>
                  {/* pill toggle */}
                  <span style={{
                    width: 26, height: 14, borderRadius: 7, flexShrink: 0,
                    background: on ? th.cardSelBorder : th.cardUnselBorder,
                    display: 'flex', alignItems: 'center',
                    padding: '0 2px',
                    transition: 'background 0.2s',
                  }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%', background: '#fff',
                      marginLeft: on ? 12 : 0,
                      transition: 'margin-left 0.18s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }} />
                  </span>
                </button>
              );

              const s = settings as unknown as Record<string, unknown>;
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Toggle label="Balanced Dice" note="Flatter bell curve" on={!!s['balancedDice']}
                    onClick={() => isHost && socket.emit('lobby:settings', { lobbyId: id, settings: { balancedDice: !s['balancedDice'] } })}
                    icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/><circle cx="4" cy="4" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="4" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>}
                  />
                  <Toggle label="Friendly Robber" note="Can't target ≤3 VP" on={!!s['friendlyRobber']}
                    onClick={() => isHost && socket.emit('lobby:settings', { lobbyId: id, settings: { friendlyRobber: !s['friendlyRobber'] } })}
                    icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1L2 3.5V8c0 3 2.5 5.5 6 6.5 3.5-1 6-3.5 6-6.5V3.5L8 1z"/><path d="M5.5 8l1.8 1.8L10.5 6.5" strokeWidth="1.6"/></svg>}
                  />
                  <Toggle label="Random Order" note="Shuffle seat order" on={!!s['randomizeOrder']}
                    onClick={() => isHost && socket.emit('lobby:settings', { lobbyId: id, settings: { randomizeOrder: !s['randomizeOrder'] } })}
                    icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1 5h10M1 11h10"/><polyline points="8,3 11,5 8,7"/><polyline points="8,9 11,11 8,13"/></svg>}
                  />
                  <Toggle label="Extra Buildings" note="+2 settlements · +2 cities · +5 roads" on={!!s['extraBuildings']}
                    onClick={() => isHost && socket.emit('lobby:settings', { lobbyId: id, settings: { extraBuildings: !s['extraBuildings'] } })}
                    icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1 14h14"/><path d="M3 14V8l5-5 5 5v6"/><rect x="6" y="10" width="4" height="4"/></svg>}
                  />
                </div>
              );
            })()}

            {/* Seafarers expansion — only shown when map supports it */}
            {(() => {
              const supportsSeafarers = availableMaps.find((m) => m.id === settings.mapTemplateId)?.seafarers;
              if (!supportsSeafarers) return null;
              const seafOn = !!(settings as unknown as Record<string, unknown>)['seafarers'];
              const discOn = !!(settings as unknown as Record<string, unknown>)['discoveryBonus'];

              const Toggle = ({ label, note, icon, on, disabled: dis, onClick }: { label: string; note: string; icon: React.ReactNode; on: boolean; disabled?: boolean; onClick: () => void }) => (
                <button
                  disabled={!isHost || dis}
                  onClick={onClick}
                  style={{
                    background: on ? th.cardSelBg : th.settingsBg,
                    border: `1.5px solid ${on ? th.cardSelBorder : th.cardUnselBorder}`,
                    borderRadius: 10, padding: '9px 12px',
                    cursor: isHost && !dis ? 'pointer' : 'default',
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'background 0.15s, border-color 0.15s, opacity 0.15s',
                    width: '100%', opacity: dis ? 0.45 : 1,
                  }}
                >
                  <span style={{ color: on ? th.cardSelTitleColor : th.settingNote, flexShrink: 0, display: 'flex' }}>{icon}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: on ? th.cardSelTitleColor : th.settingLabel, fontFamily: "'Cinzel', Georgia, serif", letterSpacing: 0.3 }}>{label}</span>
                    <span style={{ display: 'block', fontSize: 9, color: on ? th.cardSubSelColor : th.settingNote, marginTop: 1 }}>{note}</span>
                  </span>
                  <span style={{
                    width: 26, height: 14, borderRadius: 7, flexShrink: 0,
                    background: on ? th.cardSelBorder : th.cardUnselBorder,
                    display: 'flex', alignItems: 'center', padding: '0 2px',
                    transition: 'background 0.2s',
                  }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%', background: '#fff',
                      marginLeft: on ? 12 : 0,
                      transition: 'margin-left 0.18s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }} />
                  </span>
                </button>
              );

              return (
                <div style={{ marginTop: 10, border: `1.5px solid ${th.cardUnselBorder}`, borderRadius: 12, padding: '12px 14px', background: th.settingsBg }}>
                  <div style={{ fontSize: 9, letterSpacing: 3, color: th.accent, textTransform: 'uppercase', fontFamily: "'Cinzel', Georgia, serif", marginBottom: 10 }}>
                    Sailing Expansion
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <Toggle label="Enable Sailing" note="Ships, pirate & sea routes" on={seafOn}
                      onClick={() => isHost && socket.emit('lobby:settings', { lobbyId: id, settings: { seafarers: !seafOn, discoveryBonus: !seafOn ? discOn : false } })}
                      icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12c2-2 4-2 7 0s5 2 7 0"/><path d="M8 3v7"/><path d="M8 3l-4 4h8L8 3z"/></svg>}
                    />
                    <Toggle label="Discovery Bonus" note="+2 VP for first island settlement" on={discOn && seafOn} disabled={!seafOn}
                      onClick={() => seafOn && isHost && socket.emit('lobby:settings', { lobbyId: id, settings: { discoveryBonus: !discOn } })}
                      icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><line x1="8" y1="2" x2="8" y2="4"/><line x1="8" y1="12" x2="8" y2="14"/><line x1="2" y1="8" x2="4" y2="8"/><line x1="12" y1="8" x2="14" y2="8"/><circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"/></svg>}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>{/* maxWidth wrapper */}
        </div>
      </div>

    </div>
  );
}
