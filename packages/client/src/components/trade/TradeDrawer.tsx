import React, { useState } from 'react';
import type { GameState, Player } from '@opensettlers/shared';
import { socket } from '../../socket.js';
import { RESOURCE_IMAGES, RESOURCE_COLORS, RESOURCE_LABELS } from '../../assets/resources.js';

type Resource = 'wood' | 'brick' | 'wheat' | 'sheep' | 'ore';
const RESOURCES: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];

interface Props {
  gameState: GameState;
  me: Player;
  portRates: Partial<Record<Resource, number>>;
  isMyTurn: boolean;
}

export function TradeDrawer({ gameState, me, portRates, isMyTurn }: Props) {
  const { phase, activeTradeOffer, players } = gameState;
  const [tab, setTab] = useState<'maritime' | 'player'>('maritime');

  // During trade offer pending — show offer status for all players
  if (phase === 'TRADE_OFFER_PENDING' && activeTradeOffer) {
    const isOfferer = activeTradeOffer.fromPlayerId === me.id;
    const offerer = players.find((p) => p.id === activeTradeOffer.fromPlayerId);
    return (
      <div style={drawerStyle}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
          {isOfferer ? 'Your trade offer is pending' : `Trade offer from ${offerer?.name}`}
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
          <ResourcePile label="Offering" resources={activeTradeOffer.offering} />
          <span style={{ alignSelf: 'center', fontSize: 18 }}>→</span>
          <ResourcePile label="Requesting" resources={activeTradeOffer.requesting} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isOfferer ? (
            <>
              {activeTradeOffer.acceptedBy.map((pid) => {
                const p = players.find((p2) => p2.id === pid);
                return (
                  <button key={pid} style={{ ...btnStyle, background: '#27ae60' }}
                    onClick={() => socket.emit('game:confirm_trade', { offerId: activeTradeOffer.id, targetPlayerId: pid })}>
                    Trade with {p?.name}
                  </button>
                );
              })}
              <button style={{ ...btnStyle, background: '#c0392b' }}
                onClick={() => socket.emit('game:cancel_trade', { offerId: activeTradeOffer.id })}>
                Cancel
              </button>
            </>
          ) : (
            <>
              {!activeTradeOffer.acceptedBy.includes(me.id) && !activeTradeOffer.rejectedBy.includes(me.id) && (() => {
                const canAffordTrade = (Object.entries(activeTradeOffer.requesting) as [Resource, number][])
                  .every(([res, amt]) => (me.hand[res] ?? 0) >= amt);
                return (
                  <>
                    <button
                      style={{ ...btnStyle, background: canAffordTrade ? '#27ae60' : '#aaa', cursor: canAffordTrade ? 'pointer' : 'not-allowed' }}
                      disabled={!canAffordTrade}
                      title={canAffordTrade ? undefined : "You don't have the required resources"}
                      onClick={() => socket.emit('game:accept_trade', { offerId: activeTradeOffer.id })}>
                      Accept
                    </button>
                    <button style={{ ...btnStyle, background: '#c0392b' }}
                      onClick={() => socket.emit('game:reject_trade', { offerId: activeTradeOffer.id })}>
                      Reject
                    </button>
                  </>
                );
              })()}
              {activeTradeOffer.acceptedBy.includes(me.id) && <span style={{ color: '#2ecc71' }}>Accepted ✓</span>}
              {activeTradeOffer.rejectedBy.includes(me.id) && <span style={{ color: '#e74c3c' }}>Rejected ✗</span>}
            </>
          )}
        </div>
      </div>
    );
  }

  if (phase !== 'BUILD_PHASE') return null;

  return (
    <div style={drawerStyle}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {(['maritime', 'player'] as const).map((t) => (
          <button key={t} style={{
            ...btnStyle,
            background: tab === t ? '#6b4c11' : 'var(--ui-btn-muted)',
            color: tab === t ? '#fff' : 'var(--ui-btn-muted-text)',
            borderBottom: tab === t ? '2px solid #a07828' : '2px solid transparent',
          }} onClick={() => setTab(t)}>
            {t === 'maritime' ? 'Maritime' : 'Player Trade'}
          </button>
        ))}
      </div>
      {tab === 'maritime'
        ? <MaritimeTab me={me} portRates={portRates} />
        : <PlayerTradeTab me={me} isMyTurn={isMyTurn} players={players} />
      }
    </div>
  );
}

function ResourcePile({ label, resources }: { label: string; resources: Partial<Record<Resource, number>> }) {
  const entries = Object.entries(resources).filter(([, n]) => (n ?? 0) > 0) as [Resource, number][];
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--ui-text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {entries.map(([res, n]) => (
          <div key={res} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: 30, height: 38, borderRadius: 4, background: RESOURCE_COLORS[res],
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            }}>
              <img src={RESOURCE_IMAGES[res]} width={18} height={18} style={{ objectFit: 'contain' }} alt={res} />
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>×{n}</span>
            </div>
          </div>
        ))}
        {entries.length === 0 && <span style={{ color: '#b0a898', fontSize: 12 }}>none</span>}
      </div>
    </div>
  );
}

function ResourceSelector({
  counts,
  selected,
  onToggle,
}: {
  counts: Partial<Record<Resource, number>>;
  selected: Partial<Record<Resource, number>>;
  onToggle: (res: Resource) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {RESOURCES.map((res) => {
        const have = counts[res] ?? 0;
        const sel = selected[res] ?? 0;
        return (
          <div key={res} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <button
              disabled={have === 0}
              onClick={() => onToggle(res)}
              style={{
                width: 38, height: 50, borderRadius: 6,
                background: sel > 0 ? RESOURCE_COLORS[res] : (have > 0 ? 'var(--ui-btn-muted)' : 'var(--ui-input-bg)'),
                border: sel > 0 ? '2px solid #6b4c11' : '1px solid var(--ui-card-border)',
                cursor: have > 0 ? 'pointer' : 'default',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                padding: 0,
              }}>
              <img src={RESOURCE_IMAGES[res]} width={20} height={20} style={{ objectFit: 'contain' }} alt={res} />
              <span style={{ color: sel > 0 ? '#fff' : '#5a4a35', fontSize: 11, fontWeight: 'bold' }}>{sel > 0 ? `×${sel}` : have}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function MaritimeTab({ me, portRates }: { me: Player; portRates: Partial<Record<Resource, number>> }) {
  const [giving, setGiving] = useState<Partial<Record<Resource, number>>>({});
  const [receiving, setReceiving] = useState<Resource | null>(null);

  const toggleGiving = (res: Resource) => {
    const currentRate = portRates[res] ?? 4;
    const sel = giving[res] ?? 0;
    if (sel >= currentRate) {
      setGiving({ ...giving, [res]: 0 });
    } else {
      setGiving({ ...giving, [res]: sel + 1 });
    }
  };

  const givingResource = Object.entries(giving).find(([, n]) => (n ?? 0) > 0)?.[0] as Resource | undefined;
  const requiredRate = givingResource ? (portRates[givingResource] ?? 4) : 4;
  const canTrade = givingResource && (giving[givingResource] ?? 0) >= requiredRate && receiving !== null && receiving !== givingResource;

  const doTrade = () => {
    if (!givingResource || !receiving || !canTrade) return;
    socket.emit('game:maritime_trade', {
      giving: { [givingResource]: requiredRate },
      receiving: { [receiving]: 1 },
    });
    setGiving({});
    setReceiving(null);
  };

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--ui-text-muted)', marginBottom: 4 }}>Give (click to add)</div>
      <ResourceSelector counts={me.hand} selected={giving} onToggle={toggleGiving} />
      <div style={{ fontSize: 11, color: 'var(--ui-text-muted)', margin: '8px 0 4px' }}>Receive</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {RESOURCES.filter((r) => r !== givingResource).map((res) => (
          <button key={res} onClick={() => setReceiving(res === receiving ? null : res)}
            style={{
              width: 38, height: 50, borderRadius: 6,
              background: receiving === res ? RESOURCE_COLORS[res] : 'var(--ui-btn-muted)',
              border: receiving === res ? '2px solid #6b4c11' : '1px solid var(--ui-card-border)',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              padding: 0,
            }}>
            <img src={RESOURCE_IMAGES[res]} width={20} height={20} style={{ objectFit: 'contain' }} alt={res} />
          </button>
        ))}
      </div>
      {givingResource && (
        <div style={{ fontSize: 11, color: 'var(--ui-text-muted)', marginTop: 6 }}>
          Rate: {requiredRate}:1 {(giving[givingResource] ?? 0) < requiredRate ? `(need ${requiredRate - (giving[givingResource] ?? 0)} more)` : '✓'}
        </div>
      )}
      <button
        disabled={!canTrade}
        style={{ ...btnStyle, marginTop: 8, background: canTrade ? '#27ae60' : '#333', color: canTrade ? '#fff' : '#666' }}
        onClick={doTrade}
      >Trade</button>
    </div>
  );
}

function PlayerTradeTab({ me, isMyTurn, players }: { me: Player; isMyTurn: boolean; players: Player[] }) {
  const [offering, setOffering] = useState<Partial<Record<Resource, number>>>({});
  const [requesting, setRequesting] = useState<Partial<Record<Resource, number>>>({});

  const toggleOffering = (res: Resource) => {
    const have = me.hand[res] ?? 0;
    const sel = (offering[res] ?? 0) + 1;
    setOffering({ ...offering, [res]: sel > have ? 0 : sel });
  };
  const toggleRequesting = (res: Resource) => {
    const sel = (requesting[res] ?? 0) + 1;
    setRequesting({ ...requesting, [res]: sel > 4 ? 0 : sel });
  };

  const hasOffering = Object.values(offering).some((n) => (n ?? 0) > 0);
  const hasRequesting = Object.values(requesting).some((n) => (n ?? 0) > 0);

  const opponents = players.filter((p) => p.id !== me.id);
  // For each requested resource, check at least one opponent has enough
  const requestEntries = Object.entries(requesting).filter(([, n]) => (n ?? 0) > 0) as [Resource, number][];
  const someoneCanFulfill = requestEntries.length === 0 || requestEntries.every(([res, amt]) =>
    opponents.some((p) => (p.hand[res] ?? 0) >= amt)
  );

  const canPropose = isMyTurn && hasOffering && hasRequesting && someoneCanFulfill;
  const proposeDisabledReason = !isMyTurn
    ? 'Only active player can propose'
    : !hasOffering || !hasRequesting
    ? 'Select resources to offer and request'
    : !someoneCanFulfill
    ? 'No opponent has the requested resources'
    : '';

  const propose = () => {
    socket.emit('game:propose_trade', { offering, requesting });
    setOffering({});
    setRequesting({});
  };

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--ui-text-muted)', marginBottom: 4 }}>I offer (click to add)</div>
      <ResourceSelector counts={me.hand} selected={offering} onToggle={toggleOffering} />
      <div style={{ fontSize: 11, color: 'var(--ui-text-muted)', margin: '8px 0 4px' }}>I want (click to add)</div>
      <ResourceSelector
        counts={{ wood: 4, brick: 4, wheat: 4, sheep: 4, ore: 4 }}
        selected={requesting}
        onToggle={toggleRequesting}
      />
      <button
        disabled={!canPropose}
        title={proposeDisabledReason}
        style={{ ...btnStyle, marginTop: 8, background: canPropose ? '#457b9d' : '#333', color: canPropose ? '#fff' : '#666' }}
        onClick={propose}
      >{isMyTurn ? 'Propose Trade' : 'Only active player can propose'}</button>
    </div>
  );
}

const drawerStyle: React.CSSProperties = {
  background: 'var(--ui-card-bg)',
  border: '1px solid var(--ui-card-border)',
  borderRadius: 10,
  padding: '12px 14px',
  fontSize: 13,
  minWidth: 280,
  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  color: 'var(--ui-text)',
};

const btnStyle: React.CSSProperties = {
  background: '#6b4c11',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '6px 12px',
  cursor: 'pointer',
  fontSize: 12,
};
