import React, { useEffect, useState } from 'react';
import { socket } from '../socket.js';
import { useLobbyStore } from '../store/useLobbyStore.js';
import { usePlayerStore } from '../store/usePlayerStore.js';
import type { LobbyState } from '@opensettlers/shared';

export function LobbyListScreen() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPrivate, setIsPrivate] = useState(false);
  const [privateCode, setPrivateCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const { lobbies, setLobbies, setCurrentLobby } = useLobbyStore();
  const { setPlayer, setLobbyId } = usePlayerStore();

  useEffect(() => {
    socket.emit('lobby:list', (res) => {
      if (res.ok) setLobbies(res.data);
    });
  }, [setLobbies]);

  const createLobby = () => {
    if (!name.trim()) { setError('Enter your name'); return; }
    socket.emit('lobby:create', { playerName: name.trim(), settings: { maxPlayers, private: isPrivate } }, (res) => {
      if (res.ok) {
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
        setPlayer(res.data.playerId, name.trim());
        setCurrentLobby(res.data.lobby);
        setLobbyId(res.data.lobby.id);
      } else {
        setError(res.message);
      }
    });
  };

  return (
    <div style={{ padding: 32, maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 24, color: '#f1c40f' }}>🏝️ OpenSettlers</h1>

      {privateCode && (
        <div style={{ background: '#16213e', border: '1px solid #457b9d', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <strong>Room created! Share this code:</strong>
          <div style={{ fontSize: 32, fontWeight: 'bold', letterSpacing: 8, color: '#f4a261', margin: '8px 0' }}>{privateCode}</div>
          <button style={btnStyle} onClick={() => navigator.clipboard.writeText(privateCode)}>Copy Code</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createLobby()}
          style={inputStyle}
        />
        <button style={btnStyle} onClick={createLobby}>
          Create Lobby
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} style={inputStyle}>
          {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} players</option>)}
        </select>
        <label style={{ color: '#aaa', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
          Private lobby
        </label>
      </div>

      {error && <p style={{ color: '#e74c3c', marginBottom: 12 }}>{error}</p>}

      <h3 style={{ marginBottom: 12, color: '#aaa' }}>Open Lobbies</h3>
      {lobbies.length === 0 ? (
        <p style={{ color: '#555' }}>No lobbies yet. Create one!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {lobbies.filter((l) => l.status === 'waiting' && !l.settings.private).map((lobby) => (
            <LobbyRow key={lobby.id} lobby={lobby} onJoin={() => joinLobby(lobby.id)} />
          ))}
        </div>
      )}

      <h3 style={{ marginBottom: 12, color: '#aaa' }}>Join by Code</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          placeholder="Enter room code..."
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={6}
          style={{ ...inputStyle, letterSpacing: 4, textTransform: 'uppercase' }}
        />
        <button style={btnStyle} onClick={joinByCode}>Join</button>
      </div>
    </div>
  );
}

function LobbyRow({ lobby, onJoin }: { lobby: LobbyState; onJoin: () => void }) {
  const occupied = lobby.slots.filter((s) => s.playerId).length;
  return (
    <div style={{
      background: '#16213e',
      border: '1px solid #333',
      borderRadius: 8,
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <strong>#{lobby.id}</strong>
        <span style={{ color: '#aaa', marginLeft: 8 }}>
          {occupied}/{lobby.settings.maxPlayers} players
        </span>
      </div>
      <button style={btnStyle} onClick={onJoin}>Join</button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: '#16213e',
  color: '#eee',
  border: '1px solid #457b9d',
  borderRadius: 6,
  padding: '8px 12px',
  fontSize: 16,
};

const btnStyle: React.CSSProperties = {
  background: '#457b9d',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '8px 18px',
  cursor: 'pointer',
  fontSize: 14,
};
