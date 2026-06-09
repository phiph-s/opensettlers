import React from 'react';
import { socket } from '../socket.js';
import { useLobbyStore } from '../store/useLobbyStore.js';
import { usePlayerStore } from '../store/usePlayerStore.js';

const COLOR_MAP: Record<string, string> = {
  red: '#e63946',
  blue: '#457b9d',
  orange: '#f4a261',
  white: '#f1faee',
  green: '#2ecc71',
  purple: '#9b59b6',
};

export function LobbyRoomScreen() {
  const { currentLobby } = useLobbyStore();
  const { myPlayerId } = usePlayerStore();

  if (!currentLobby) return null;

  const { id, slots, settings, hostPlayerId } = currentLobby;
  const isHost = myPlayerId === hostPlayerId;
  const mySlot = slots.find((s) => s.playerId === myPlayerId);
  const occupied = slots.filter((s) => s.playerId);
  const allReady = occupied.length >= 2 && occupied.every((s) => s.ready);
  const privateCode = settings.private ? settings.privateCode : null;

  return (
    <div style={{ padding: 32, maxWidth: 500, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 8, color: '#f1c40f' }}>Lobby #{id}</h2>
      <p style={{ color: '#aaa', marginBottom: 16, fontSize: 13 }}>
        Map: {settings.mapTemplateId} | Timer: {settings.timerEnabled ? 'on' : 'off'}
        {settings.private && ' | Private'}
      </p>

      {isHost && privateCode && (
        <div style={{ background: '#16213e', border: '1px solid #457b9d', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <strong>Private Room Code</strong>
          <div style={{ fontSize: 28, fontWeight: 'bold', letterSpacing: 8, color: '#f4a261', margin: '6px 0' }}>{privateCode}</div>
          <button
            style={{ background: '#457b9d', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: 13 }}
            onClick={() => navigator.clipboard.writeText(privateCode)}
          >
            Copy Code
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {slots.map((slot, i) => {
          const slotCssColor = slot.color ? (COLOR_MAP[slot.color] ?? '#aaa') : '#333';
          return (
            <div
              key={i}
              style={{
                background: '#16213e',
                border: `1px solid ${slot.playerId ? '#457b9d' : '#333'}`,
                borderRadius: 8,
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: slotCssColor,
                border: '1px solid rgba(255,255,255,0.3)',
                flexShrink: 0,
              }} />
              <span style={{ flex: 1 }}>
                {slot.playerId ? (slot.name ?? 'Unknown') : <em style={{ color: '#555' }}>Empty</em>}
                {slot.playerId === myPlayerId && ' (you)'}
                {slot.playerId === hostPlayerId && ' 👑'}
              </span>
              {slot.playerId && (
                <span style={{ color: slot.ready ? '#2ecc71' : '#e74c3c', fontSize: 12 }}>
                  {slot.ready ? '✓ Ready' : '○ Not ready'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {mySlot && (
          <button
            style={{
              background: mySlot.ready ? '#c0392b' : '#2ecc71',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 20px',
              cursor: 'pointer',
              fontWeight: 'bold',
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
              background: allReady ? '#f4a261' : '#555',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 20px',
              cursor: allReady ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
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
  );
}
