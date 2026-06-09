import React, { useEffect, useState } from 'react';
import { socket } from '../socket.js';
import { useLobbyStore } from '../store/useLobbyStore.js';
import { usePlayerStore } from '../store/usePlayerStore.js';

const COLOR_MAP: Record<string, string> = {
  red: '#e63946', blue: '#457b9d', orange: '#f4a261', black: '#2c2c2c',
  green: '#2ecc71', purple: '#9b59b6',
};

interface MapMeta { id: string; name: string; playerCounts: number[] }

export function LobbyRoomScreen() {
  const { currentLobby } = useLobbyStore();
  const { myPlayerId } = usePlayerStore();
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

  function changeMap(mapId: string) {
    socket.emit('lobby:settings', { lobbyId: id, settings: { mapTemplateId: mapId } });
  }

  const selectedMap = availableMaps.find((m) => m.id === settings.mapTemplateId);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0f2040 0%, #1a3560 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <h2 style={{ color: '#f1c40f', marginBottom: 4, fontSize: 22 }}>Lobby #{id}</h2>
        <p style={{ color: '#7a90b0', fontSize: 12, marginBottom: 20, marginTop: 0 }}>
          {settings.private ? 'Private room' : 'Public room'}
          {settings.timerEnabled ? ' · Timer on' : ''}
        </p>

        {/* Private code */}
        {isHost && privateCode && (
          <div style={{
            background: '#16213e', border: '1px solid #457b9d', borderRadius: 8,
            padding: 12, marginBottom: 16,
          }}>
            <div style={{ color: '#aac4f4', fontSize: 12, marginBottom: 4 }}>Room Code</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', letterSpacing: 8, color: '#f4a261' }}>{privateCode}</div>
            <button
              style={{ marginTop: 6, background: '#457b9d', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}
              onClick={() => navigator.clipboard.writeText(privateCode)}
            >
              Copy
            </button>
          </div>
        )}

        {/* Map selector */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: '#aac4f4', fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Map
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {availableMaps.map((map) => {
              const selected = settings.mapTemplateId === map.id;
              return (
                <button
                  key={map.id}
                  disabled={!isHost}
                  onClick={() => changeMap(map.id)}
                  style={{
                    background: selected ? '#f4a261' : '#16213e',
                    color: selected ? '#fff' : '#aac4f4',
                    border: `2px solid ${selected ? '#f4a261' : '#2a3f6a'}`,
                    borderRadius: 8,
                    padding: '8px 14px',
                    cursor: isHost ? 'pointer' : 'default',
                    fontSize: 13,
                    fontWeight: selected ? 700 : 400,
                    transition: 'background 0.15s, border-color 0.15s',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{map.name}</div>
                  <div style={{ fontSize: 10, opacity: 0.75, marginTop: 2 }}>
                    {map.playerCounts[0]}–{map.playerCounts[map.playerCounts.length - 1]} players
                  </div>
                </button>
              );
            })}
          </div>
          {!isHost && selectedMap && (
            <div style={{ color: '#7a90b0', fontSize: 11, marginTop: 6 }}>
              {selectedMap.name} · set by host
            </div>
          )}
        </div>

        {/* Player slots */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {slots.map((slot, i) => {
            const slotColor = slot.color ? (COLOR_MAP[slot.color] ?? '#aaa') : '#333';
            return (
              <div
                key={i}
                style={{
                  background: '#16213e',
                  border: `1px solid ${slot.playerId ? '#2a4a7a' : '#1e2e4a'}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: slotColor,
                  border: '1.5px solid rgba(255,255,255,0.25)',
                  flexShrink: 0,
                }} />
                <span style={{ flex: 1, color: slot.playerId ? '#d0dff5' : '#3a4a6a', fontSize: 13 }}>
                  {slot.playerId ? (slot.name ?? 'Unknown') : <em>Empty</em>}
                  {slot.playerId === myPlayerId && <span style={{ color: '#7a90b0', fontSize: 11 }}> (you)</span>}
                  {slot.playerId === hostPlayerId && ' 👑'}
                </span>
                {slot.playerId && (
                  <span style={{ color: slot.ready ? '#2ecc71' : '#e74c3c', fontSize: 12, fontWeight: 600 }}>
                    {slot.ready ? '✓' : '○'}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          {mySlot && (
            <button
              style={{
                background: mySlot.ready ? '#c0392b' : '#27ae60',
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 22px', cursor: 'pointer', fontWeight: 700, fontSize: 14,
              }}
              onClick={() => socket.emit('lobby:ready', { lobbyId: id, ready: !mySlot.ready })}
            >
              {mySlot.ready ? 'Not Ready' : 'Ready!'}
            </button>
          )}
          {isHost && (
            <button
              disabled={!allReady}
              style={{
                background: allReady ? '#f4a261' : '#2a3a5a',
                color: allReady ? '#fff' : '#4a5a7a',
                border: 'none', borderRadius: 8,
                padding: '10px 22px',
                cursor: allReady ? 'pointer' : 'not-allowed',
                fontWeight: 700, fontSize: 14,
                transition: 'background 0.15s',
              }}
              onClick={() => socket.emit('lobby:start', { lobbyId: id }, (res) => {
                if (!res.ok) alert(res.message);
              })}
            >
              🚀 Start Game
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
