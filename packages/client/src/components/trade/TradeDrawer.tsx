import React, { useState } from 'react';
import type { GameState, Player, TradeOffer } from '@opensettlers/shared';
import { socket } from '../../socket.js';
import { RESOURCE_IMAGES, RESOURCE_COLORS } from '../../assets/resources.js';

type Resource = 'wood' | 'brick' | 'wheat' | 'sheep' | 'ore';
const RESOURCES: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];
const MAX_REQUEST = 9;

interface Props {
  gameState: GameState;
  me: Player;
  portRates: Partial<Record<Resource, number>>;
  isMyTurn: boolean;
}

type Basket = Partial<Record<Resource, number>>;

const entriesOf = (b: Basket) => Object.entries(b).filter(([, n]) => (n ?? 0) > 0) as [Resource, number][];
const totalOf = (b: Basket) => RESOURCES.reduce((s, r) => s + (b[r] ?? 0), 0);

// ── Icons ─────────────────────────────────────────────────────────────────────
function ExchangeIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h13l-3.5-3.5" />
      <path d="M20 16H7l3.5 3.5" />
    </svg>
  );
}
function BankIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5 10v8M9 10v8M15 10v8M19 10v8" />
      <path d="M3 21h18" />
    </svg>
  );
}
function PeopleIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8.5" cy="8" r="3" />
      <path d="M2.5 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6M21.5 20c0-2.7-1.6-4.7-4-5.3" />
    </svg>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export function TradeDrawer({ gameState, me, portRates, isMyTurn }: Props) {
  const { phase, activeTradeOffer, players } = gameState;

  if (phase === 'TRADE_OFFER_PENDING' && activeTradeOffer) {
    return <PendingOffer offer={activeTradeOffer} me={me} players={players} />;
  }

  if (phase !== 'BUILD_PHASE') return null;
  // Only the active player can initiate a trade (bank or proposal).
  if (!isMyTurn) return null;

  return <TradeBuilder me={me} portRates={portRates} players={players} />;
}

// ── Trade builder (unified give → receive) ─────────────────────────────────────
function TradeBuilder({ me, portRates, players }: { me: Player; portRates: Partial<Record<Resource, number>>; players: Player[] }) {
  const [give, setGive] = useState<Basket>({});
  const [get, setGet] = useState<Basket>({});

  const rateOf = (r: Resource) => portRates[r] ?? 4;

  const adjust = (which: 'give' | 'get', res: Resource, delta: number) => {
    const setter = which === 'give' ? setGive : setGet;
    const cap = which === 'give' ? (me.hand[res] ?? 0) : MAX_REQUEST;
    setter((prev) => {
      const next = Math.max(0, Math.min(cap, (prev[res] ?? 0) + delta));
      return { ...prev, [res]: next };
    });
  };

  const reset = () => { setGive({}); setGet({}); };

  const giveEntries = entriesOf(give);
  const getEntries = entriesOf(get);

  // Bank: give exactly the port rate of ONE resource, receive exactly 1 of a different one.
  const bankGive = giveEntries.length === 1 ? giveEntries[0]! : null;
  const bankRate = bankGive ? rateOf(bankGive[0]) : 0;
  const bankValid =
    !!bankGive &&
    getEntries.length === 1 &&
    bankGive[1] === bankRate &&
    getEntries[0]![1] === 1 &&
    getEntries[0]![0] !== bankGive[0];

  // Player offer: non-empty both sides, and at least one opponent can fulfill each request.
  const opponents = players.filter((p) => p.id !== me.id);
  const someoneCanFulfill = getEntries.every(([res, amt]) => opponents.some((p) => (p.hand[res] ?? 0) >= amt));
  const playerValid = giveEntries.length > 0 && getEntries.length > 0 && someoneCanFulfill;

  const doBank = () => {
    if (!bankValid || !bankGive) return;
    socket.emit('game:maritime_trade', { giving: { [bankGive[0]]: bankRate }, receiving: { [getEntries[0]![0]]: 1 } });
    reset();
  };
  const doOffer = () => {
    if (!playerValid) return;
    socket.emit('game:propose_trade', { offering: give, requesting: get });
    reset();
  };

  const hasAny = giveEntries.length > 0 || getEntries.length > 0;
  const hint = !hasAny
    ? 'Add what you’ll give and what you want.'
    : !bankValid && !playerValid
    ? (giveEntries.length === 1 && getEntries.length === 1 && !someoneCanFulfill
        ? 'No one holds that — try the bank at your port rate.'
        : 'Match a port rate for the bank, or pick anything to offer players.')
    : '';

  return (
    // Bottom-aligned row: hint stacks above the card (left), actions sit alongside
    // (right). The trade card itself keeps a constant height so the trays never jump.
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {hint && <div style={hintCardStyle}>{hint}</div>}
        <div style={drawerStyle}>
          <Header />
          <Tray
            title="You give"
            tint="give"
            basket={give}
            owned={me.hand}
            rateOf={rateOf}
            onAdjust={(res, d) => adjust('give', res, d)}
          />
          <Divider />
          <Tray
            title="You receive"
            tint="get"
            basket={get}
            onAdjust={(res, d) => adjust('get', res, d)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 7, width: 122 }}>
        {hasAny && <button onClick={reset} style={clearStyle}>Clear</button>}
        <ActionButton
          icon={<BankIcon size={18} />}
          label="Bank"
          sublabel={bankValid ? `${bankRate}:1` : 'port rate'}
          tone="bank"
          enabled={bankValid}
          onClick={doBank}
        />
        <ActionButton
          icon={<PeopleIcon size={18} />}
          label="Offer"
          sublabel="to players"
          tone="players"
          enabled={playerValid}
          onClick={doOffer}
        />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
      <span style={{ color: '#d4a017', display: 'flex' }}><ExchangeIcon size={16} /></span>
      <span style={{ fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700, fontSize: 14, letterSpacing: '0.04em', color: 'var(--ui-text)' }}>
        Trade
      </span>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(212,160,23,0.5), transparent)' }} />
    </div>
  );
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--ui-card-border)' }} />
      <span style={{
        width: 24, height: 24, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--ui-input-bg)', border: '1px solid var(--ui-card-border)',
        color: 'var(--ui-text-muted)',
      }}>
        <ExchangeIcon size={13} />
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--ui-card-border)' }} />
    </div>
  );
}

// ── Resource tray with steppers ─────────────────────────────────────────────────
function Tray({
  title, tint, basket, owned, rateOf, onAdjust,
}: {
  title: string;
  tint: 'give' | 'get';
  basket: Basket;
  owned?: Partial<Record<Resource, number>>;
  rateOf?: (r: Resource) => number;
  onAdjust: (res: Resource, delta: number) => void;
}) {
  const accent = tint === 'give' ? '#c8920a' : '#4d86b0';
  return (
    <div>
      <div style={{ fontSize: 10.5, color: 'var(--ui-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, fontWeight: 700 }}>
        {title}
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        {RESOURCES.map((res) => {
          const amt = basket[res] ?? 0;
          const have = owned ? (owned[res] ?? 0) : undefined;
          const max = have ?? MAX_REQUEST;
          const disabled = have !== undefined && have === 0;
          const rate = rateOf?.(res);
          return (
            <div key={res} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              opacity: disabled ? 0.4 : 1,
            }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 36, height: 40, borderRadius: 7,
                  background: amt > 0 ? RESOURCE_COLORS[res] : 'var(--ui-input-bg)',
                  border: amt > 0 ? `2px solid ${accent}` : '1px solid var(--ui-card-border)',
                  boxShadow: amt > 0 ? `0 2px 8px ${accent}55` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
                }}>
                  <img src={RESOURCE_IMAGES[res]} width={20} height={20} style={{ objectFit: 'contain' }} alt={res} />
                </div>
                {amt > 0 && (
                  <span style={{
                    position: 'absolute', top: -6, right: -6,
                    minWidth: 17, height: 17, padding: '0 3px', borderRadius: 9,
                    background: accent, color: '#fff', fontSize: 11, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1.5px solid var(--ui-card-bg)',
                  }}>{amt}</span>
                )}
                {rate !== undefined && (
                  <span style={{
                    position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)',
                    fontSize: 8.5, fontWeight: 700, color: rate < 4 ? '#d4a017' : 'var(--ui-text-muted)',
                    background: 'var(--ui-card-bg)', padding: '0 2px', borderRadius: 3, whiteSpace: 'nowrap',
                  }}>{rate}:1</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 2, marginTop: rate !== undefined ? 4 : 0 }}>
                <StepBtn label="−" onClick={() => onAdjust(res, -1)} disabled={amt <= 0} />
                <StepBtn label="+" onClick={() => onAdjust(res, +1)} disabled={disabled || amt >= max} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 16, height: 16, lineHeight: '14px', borderRadius: 4, padding: 0,
        background: disabled ? 'transparent' : 'var(--ui-btn-muted)',
        color: disabled ? 'var(--ui-card-border)' : 'var(--ui-text)',
        border: '1px solid var(--ui-card-border)',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 13, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >{label}</button>
  );
}

function ActionButton({ icon, label, sublabel, tone, enabled, onClick }: {
  icon: React.ReactNode; label: string; sublabel?: string; tone: 'bank' | 'players'; enabled: boolean; onClick: () => void;
}) {
  const bg = tone === 'bank' ? '#2f6f9e' : '#2a9d6a';
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      style={{
        width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        padding: '11px 8px', borderRadius: 10, border: 'none',
        background: enabled ? bg : 'var(--ui-input-bg)',
        color: enabled ? '#fff' : 'var(--ui-text-muted)',
        cursor: enabled ? 'pointer' : 'default',
        boxShadow: enabled ? `0 3px 12px ${bg}66` : 'none',
        transition: 'background 0.15s, box-shadow 0.15s, transform 0.1s',
      }}
      onMouseDown={(e) => { if (enabled) e.currentTarget.style.transform = 'scale(0.97)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <span style={{ display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.02em' }}>{label}</span>
      {sublabel && <span style={{ fontSize: 9.5, fontWeight: 600, opacity: 0.85 }}>{sublabel}</span>}
    </button>
  );
}

// ── Pending offer view ─────────────────────────────────────────────────────────
function PendingOffer({ offer, me, players }: { offer: TradeOffer; me: Player; players: Player[] }) {
  const isOfferer = offer.fromPlayerId === me.id;
  const offerer = players.find((p) => p.id === offer.fromPlayerId);
  const iAccepted = offer.acceptedBy.includes(me.id);
  const iRejected = offer.rejectedBy.includes(me.id);
  const canAfford = (Object.entries(offer.requesting) as [Resource, number][]).every(([res, amt]) => (me.hand[res] ?? 0) >= amt);

  return (
    <div style={drawerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <span style={{ color: '#d4a017', display: 'flex' }}><PeopleIcon size={15} /></span>
        <span style={{ fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700, fontSize: 13, color: 'var(--ui-text)' }}>
          {isOfferer ? 'Your offer is pending' : `${offerer?.name} offers a trade`}
        </span>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(212,160,23,0.5), transparent)' }} />
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Pile label={isOfferer ? 'You give' : 'They give'} resources={offer.offering} accent="#c8920a" />
        <span style={{ color: 'var(--ui-text-muted)', display: 'flex' }}><ExchangeIcon size={16} /></span>
        <Pile label={isOfferer ? 'You want' : 'They want'} resources={offer.requesting} accent="#4d86b0" />
      </div>

      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {isOfferer ? (
          <>
            {offer.acceptedBy.length === 0 && (
              <span style={{ fontSize: 11.5, color: 'var(--ui-text-muted)', alignSelf: 'center' }}>Waiting for responses…</span>
            )}
            {offer.acceptedBy.map((pid) => {
              const p = players.find((p2) => p2.id === pid);
              return (
                <button key={pid} style={{ ...solidBtn('#2a9d6a'), flex: 1 }}
                  onClick={() => socket.emit('game:confirm_trade', { offerId: offer.id, targetPlayerId: pid })}>
                  Trade with {p?.name}
                </button>
              );
            })}
            <button style={solidBtn('#b0413a')}
              onClick={() => socket.emit('game:cancel_trade', { offerId: offer.id })}>
              Cancel
            </button>
          </>
        ) : iAccepted ? (
          <span style={statusPill('#2a9d6a')}>Accepted — waiting for {offerer?.name}</span>
        ) : iRejected ? (
          <span style={statusPill('#b0413a')}>Rejected</span>
        ) : (
          <>
            <button
              style={{ ...solidBtn(canAfford ? '#2a9d6a' : 'var(--ui-input-bg)'), flex: 1, color: canAfford ? '#fff' : 'var(--ui-text-muted)', cursor: canAfford ? 'pointer' : 'not-allowed' }}
              disabled={!canAfford}
              title={canAfford ? undefined : 'You don’t have the requested resources'}
              onClick={() => socket.emit('game:accept_trade', { offerId: offer.id })}>
              Accept
            </button>
            <button style={{ ...solidBtn('#b0413a'), flex: 1 }}
              onClick={() => socket.emit('game:reject_trade', { offerId: offer.id })}>
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Pile({ label, resources, accent }: { label: string; resources: Basket; accent: string }) {
  const entries = entriesOf(resources);
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 9.5, color: 'var(--ui-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, fontWeight: 700 }}>{label}</div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
        {entries.length === 0 && <span style={{ color: 'var(--ui-text-muted)', fontSize: 12 }}>—</span>}
        {entries.map(([res, n]) => (
          <div key={res} style={{ position: 'relative' }}>
            <div style={{
              width: 32, height: 38, borderRadius: 6, background: RESOURCE_COLORS[res],
              border: `1.5px solid ${accent}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src={RESOURCE_IMAGES[res]} width={18} height={18} style={{ objectFit: 'contain' }} alt={res} />
            </div>
            <span style={{
              position: 'absolute', top: -6, right: -6, minWidth: 16, height: 16, padding: '0 3px',
              borderRadius: 8, background: accent, color: '#fff', fontSize: 10.5, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--ui-card-bg)',
            }}>{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────────
const drawerStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, var(--ui-card-bg), color-mix(in srgb, var(--ui-card-bg) 88%, #000))',
  border: '1px solid var(--ui-card-border)',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 13,
  width: 332,
  boxShadow: '0 10px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
  color: 'var(--ui-text)',
};

// Hint lives in its own card stacked above the trade card so toggling it never
// changes the trade card's height. Matches the card's total width (332 + 14×2 padding).
const hintCardStyle: React.CSSProperties = {
  width: 332,
  background: 'var(--ui-card-bg)',
  border: '1px solid var(--ui-card-border)',
  borderRadius: 10,
  padding: '8px 14px',
  fontSize: 11.5,
  color: 'var(--ui-text-muted)',
  fontStyle: 'italic',
  textAlign: 'center',
  boxShadow: '0 6px 18px rgba(0,0,0,0.22)',
};

const clearStyle: React.CSSProperties = {
  width: '100%', padding: '4px', background: 'none', border: 'none',
  color: 'var(--ui-text-muted)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline',
};

function solidBtn(bg: string): React.CSSProperties {
  return { background: bg, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 };
}
function statusPill(color: string): React.CSSProperties {
  return { color, fontSize: 12, fontWeight: 700, padding: '6px 2px', flex: 1, textAlign: 'center' };
}
