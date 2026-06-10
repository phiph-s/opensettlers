import React, { useState } from 'react';
import type { DevCardInHand, DevCardType, TurnPhase } from '@opensettlers/shared';
import type { Resource } from '@opensettlers/shared';
import { socket } from '../../socket.js';
import { RESOURCE_IMAGES, RESOURCE_COLORS } from '../../assets/resources.js';

interface Props {
  devCards: DevCardInHand[];
  turnPhase: TurnPhase;
  isMyTurn: boolean;
  turnNumber: number;
  bank?: Partial<Record<Resource, number>>;
}

interface CardDisplay {
  label: string;
  icon: string;
  bg: string;
  canPlay: boolean;
}

const CARD_DISPLAY: Record<string, CardDisplay> = {
  knight:         { label: 'Knight',          icon: '⚔️',  bg: '#c0392b', canPlay: true },
  road_building:  { label: 'Road\nBuilding',   icon: '🛣️',  bg: '#8e44ad', canPlay: true },
  year_of_plenty: { label: 'Year of\nPlenty', icon: '🎁',  bg: '#27ae60', canPlay: true },
  monopoly:       { label: 'Monopoly',         icon: '🏦',  bg: '#d35400', canPlay: true },
  victory_point:  { label: 'Victory\nPoint',  icon: '⭐',  bg: '#f39c12', canPlay: false },
};

const RESOURCES: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];

function isPlayable(type: DevCardType, turnPhase: TurnPhase, isMyTurn: boolean, turnNumber: number, turnDrawn: number): boolean {
  if (!isMyTurn) return false;
  if (turnDrawn >= turnNumber) return false; // drawn this turn

  if (type === 'victory_point') return false;
  if (type === 'knight') return turnPhase === 'PRE_ROLL' || turnPhase === 'BUILD_PHASE';
  return turnPhase === 'BUILD_PHASE';
}

// ---- Resource picker popup ----
interface ResourcePickerProps {
  title: string;
  count: 1 | 2;
  onConfirm: (resources: Resource[]) => void;
  onCancel: () => void;
  bank?: Partial<Record<Resource, number>>;
}

function ResourcePicker({ title, count, onConfirm, onCancel, bank }: ResourcePickerProps) {
  const [picks, setPicks] = useState<Resource[]>([]);

  const toggle = (r: Resource) => {
    if (count === 1) { setPicks([r]); return; }
    const selectedCount = picks.filter(x => x === r).length;
    if (selectedCount >= 2) {
      setPicks(picks.filter(x => x !== r));    // 2 → 0: cycle back
    } else if (picks.length < 2) {
      setPicks([...picks, r]);                  // 0→1 or 1→2: add
    } else {
      setPicks(picks.filter(x => x !== r));    // at max with mixed: remove this one
    }
  };

  const ready = picks.length === count;

  return (
    <div style={{
      position: 'absolute',
      bottom: '100%',
      left: 0,
      marginBottom: 8,
      background: 'var(--ui-card-bg)',
      border: '1.5px solid var(--ui-card-border)',
      borderRadius: 10,
      padding: 12,
      zIndex: 100,
      minWidth: 210,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--ui-text-muted)', marginBottom: 10, fontWeight: 600 }}>{title}</div>
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        {RESOURCES.map((r) => {
          const selectedCount = picks.filter((x) => x === r).length;
          const isSelected = selectedCount > 0;
          const bankCount = bank?.[r] ?? 19;
          const unavailable = bankCount === 0;
          return (
            <button
              key={r}
              onClick={() => !unavailable && toggle(r)}
              disabled={unavailable && !isSelected}
              style={{
                width: 38,
                height: 50,
                borderRadius: 6,
                background: isSelected ? RESOURCE_COLORS[r] : 'var(--ui-input-bg)',
                border: isSelected ? `2px solid ${RESOURCE_COLORS[r]}` : '1.5px solid var(--ui-card-border)',
                cursor: unavailable ? 'not-allowed' : 'pointer',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                position: 'relative',
                opacity: unavailable ? 0.35 : 1,
                boxShadow: isSelected ? `0 0 0 2px ${RESOURCE_COLORS[r]}44` : 'none',
                transition: 'background 0.1s, box-shadow 0.1s',
              }}
            >
              <img src={RESOURCE_IMAGES[r]} width={24} height={24} style={{ objectFit: 'contain' }} alt={r} />
              {isSelected && (
                <div style={{
                  position: 'absolute', top: -6, right: -6,
                  background: '#6b4c11', color: '#fff',
                  fontSize: 9, fontWeight: 'bold',
                  borderRadius: 8, padding: '1px 4px',
                }}>{selectedCount}</div>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          disabled={!ready}
          onClick={() => ready && onConfirm(picks)}
          style={{
            flex: 1,
            background: ready ? '#6b4c11' : '#d8cfc4',
            color: ready ? '#fff' : '#a89880',
            border: 'none',
            borderRadius: 6,
            padding: '6px 8px',
            fontSize: 12,
            fontWeight: 700,
            cursor: ready ? 'pointer' : 'default',
            transition: 'background 0.15s',
          }}
        >Play</button>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            background: '#f2ede4',
            color: '#6b4c11',
            border: '1.5px solid #c9bfae',
            borderRadius: 6,
            padding: '6px 8px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >Cancel</button>
      </div>
    </div>
  );
}

// ---- Single card stack ----
interface CardStackProps {
  type: DevCardType;
  cards: DevCardInHand[];
  playable: boolean;
  bank?: Partial<Record<Resource, number>>;
}

function CardStack({ type, cards, playable, bank }: CardStackProps) {
  const [popup, setPopup] = useState<'yop' | 'monopoly' | null>(null);
  const display = CARD_DISPLAY[type] ?? { label: type, icon: '?', bg: '#555', canPlay: false };
  const count = cards.length;
  const labelLines = display.label.split('\n');

  const handleClick = () => {
    if (!playable) return;
    if (type === 'knight') {
      socket.emit('game:play_knight');
    } else if (type === 'road_building') {
      socket.emit('game:play_road_building');
    } else if (type === 'year_of_plenty') {
      setPopup('yop');
    } else if (type === 'monopoly') {
      setPopup('monopoly');
    }
  };

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {/* Shadow stack for multiple cards */}
      {count > 1 && (
        <div style={{
          position: 'absolute',
          top: -3,
          left: 3,
          width: 44,
          height: 60,
          borderRadius: 6,
          background: display.bg,
          opacity: 0.5,
          border: '2px solid rgba(255,255,255,0.15)',
        }} />
      )}
      {count > 2 && (
        <div style={{
          position: 'absolute',
          top: -6,
          left: 6,
          width: 44,
          height: 60,
          borderRadius: 6,
          background: display.bg,
          opacity: 0.3,
          border: '2px solid rgba(255,255,255,0.1)',
        }} />
      )}

      {/* Main card */}
      <div
        onClick={handleClick}
        style={{
          width: 44,
          height: 60,
          borderRadius: 6,
          background: display.bg,
          border: '2px solid rgba(255,255,255,0.25)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          cursor: playable ? 'pointer' : 'default',
          opacity: playable ? 1 : 0.45,
          position: 'relative',
          boxShadow: playable ? `0 0 8px ${display.bg}88` : 'none',
          transition: 'opacity 0.15s, box-shadow 0.15s',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>{display.icon}</span>
        {labelLines.map((line, i) => (
          <span key={i} style={{ fontSize: 8, color: '#fff', fontWeight: 'bold', lineHeight: 1.1, textAlign: 'center' }}>
            {line}
          </span>
        ))}

        {/* Count badge */}
        {count > 1 && (
          <div style={{
            position: 'absolute',
            top: -6,
            right: -6,
            background: '#fff',
            color: '#000',
            fontSize: 10,
            fontWeight: 'bold',
            borderRadius: 10,
            minWidth: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            border: '1px solid #333',
          }}>{count}</div>
        )}
      </div>

      {/* Popups */}
      {popup === 'yop' && (
        <ResourcePicker
          title="Year of Plenty — pick 2 resources"
          count={2}
          bank={bank}
          onConfirm={(picks) => {
            socket.emit('game:play_year_of_plenty', { resource1: picks[0] as Resource, resource2: picks[1] as Resource });
            setPopup(null);
          }}
          onCancel={() => setPopup(null)}
        />
      )}
      {popup === 'monopoly' && (
        <ResourcePicker
          title="Monopoly — pick a resource"
          count={1}
          bank={bank}
          onConfirm={(picks) => {
            socket.emit('game:play_monopoly', { resource: picks[0] as Resource });
            setPopup(null);
          }}
          onCancel={() => setPopup(null)}
        />
      )}
    </div>
  );
}

// ---- Main DevCardHand ----
export function DevCardHand({ devCards, turnPhase, isMyTurn, turnNumber, bank }: Props) {
  // Group cards by type
  const groups = new Map<DevCardType, DevCardInHand[]>();
  for (const card of devCards) {
    const existing = groups.get(card.type) ?? [];
    groups.set(card.type, [...existing, card]);
  }

  return (
    <div style={{
      display: 'flex',
      gap: 8,
      padding: '8px 12px',
      background: 'var(--ui-overlay-bg)',
      border: '1px solid var(--ui-border)',
      borderRadius: 10,
      flexShrink: 0,
      alignItems: 'flex-end',
    }}>
      {Array.from(groups.entries()).map(([type, cards]) => {
        // A group is playable if at least one card in it is playable
        const playable = cards.some((c) =>
          isPlayable(c.type, turnPhase, isMyTurn, turnNumber, c.turnDrawn)
        );
        return (
          <CardStack key={type} type={type} cards={cards} playable={playable} bank={bank} />
        );
      })}
    </div>
  );
}
