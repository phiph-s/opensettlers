import React, { useState } from 'react';
import type { GameState, Player, Resource } from '@opensettlers/shared';
import { socket } from '../../socket.js';

const RESOURCES: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];

interface Props {
  gameState: GameState;
  me: Player;
}

export function TradePanel({ gameState, me }: Props) {
  const { phase, activeTradeOffer, players } = gameState;

  if (phase === 'BUILD_PHASE') {
    return <MaritimeTradeForm me={me} />;
  }

  if (phase === 'TRADE_OFFER_PENDING' && activeTradeOffer) {
    const isFrom = activeTradeOffer.fromPlayerId === me.id;
    if (isFrom) {
      return (
        <div style={panelStyle}>
          <strong>Trade pending…</strong>
          <p style={{ fontSize: 12, color: '#aaa' }}>
            Offering: {JSON.stringify(activeTradeOffer.offering)}<br />
            Requesting: {JSON.stringify(activeTradeOffer.requesting)}<br />
            Accepted: {activeTradeOffer.acceptedBy.map((id) => players.find((p) => p.id === id)?.name).join(', ') || 'none'}
          </p>
          {activeTradeOffer.acceptedBy.map((pid) => (
            <button
              key={pid}
              style={btnStyle}
              onClick={() => socket.emit('game:confirm_trade', { offerId: activeTradeOffer.id, targetPlayerId: pid })}
            >
              Trade with {players.find((p) => p.id === pid)?.name}
            </button>
          ))}
          <button
            style={{ ...btnStyle, background: '#c0392b' }}
            onClick={() => socket.emit('game:cancel_trade', { offerId: activeTradeOffer.id })}
          >
            Cancel
          </button>
        </div>
      );
    }
    return (
      <div style={panelStyle}>
        <strong>Trade offer from {players.find((p) => p.id === activeTradeOffer.fromPlayerId)?.name}</strong>
        <p style={{ fontSize: 12 }}>
          Offering: {JSON.stringify(activeTradeOffer.offering)}<br />
          Requesting: {JSON.stringify(activeTradeOffer.requesting)}
        </p>
        {!activeTradeOffer.acceptedBy.includes(me.id) && !activeTradeOffer.rejectedBy.includes(me.id) && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnStyle} onClick={() => socket.emit('game:accept_trade', { offerId: activeTradeOffer.id })}>
              Accept
            </button>
            <button style={{ ...btnStyle, background: '#c0392b' }} onClick={() => socket.emit('game:reject_trade', { offerId: activeTradeOffer.id })}>
              Reject
            </button>
          </div>
        )}
        {activeTradeOffer.acceptedBy.includes(me.id) && <span style={{ color: '#2ecc71' }}>Accepted ✓</span>}
        {activeTradeOffer.rejectedBy.includes(me.id) && <span style={{ color: '#e74c3c' }}>Rejected ✗</span>}
      </div>
    );
  }

  return null;
}

function MaritimeTradeForm({ me }: { me: Player }) {
  const [giving, setGiving] = useState<Resource>('wood');
  const [receiving, setReceiving] = useState<Resource>('brick');
  const [giveAmt, setGiveAmt] = useState(4);

  return (
    <div style={panelStyle}>
      <strong>Maritime Trade</strong>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
        <select
          value={giving}
          onChange={(e) => setGiving(e.target.value as Resource)}
          style={selectStyle}
        >
          {RESOURCES.map((r) => <option key={r}>{r}</option>)}
        </select>
        <input
          type="number"
          min={2}
          max={4}
          value={giveAmt}
          onChange={(e) => setGiveAmt(Number(e.target.value))}
          style={{ width: 40, ...selectStyle }}
        />
        <span>→</span>
        <select
          value={receiving}
          onChange={(e) => setReceiving(e.target.value as Resource)}
          style={selectStyle}
        >
          {RESOURCES.map((r) => <option key={r}>{r}</option>)}
        </select>
        <span>×1</span>
        <button
          style={btnStyle}
          onClick={() =>
            socket.emit('game:maritime_trade', {
              giving: { [giving]: giveAmt },
              receiving: { [receiving]: 1 },
            })
          }
        >
          Trade
        </button>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: '#16213e',
  border: '1px solid #457b9d',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 13,
};

const btnStyle: React.CSSProperties = {
  background: '#457b9d',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  padding: '5px 10px',
  cursor: 'pointer',
};

const selectStyle: React.CSSProperties = {
  background: '#0f3460',
  color: '#eee',
  border: '1px solid #457b9d',
  borderRadius: 4,
  padding: '3px 6px',
};
