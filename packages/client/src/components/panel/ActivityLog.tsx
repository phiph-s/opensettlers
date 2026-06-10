import React, { useEffect, useRef, useState } from 'react';
import type { Player } from '@opensettlers/shared';
import { socket } from '../../socket.js';
import { RESOURCE_IMAGES } from '../../assets/resources.js';

interface LogEntry {
  id: number;
  icon?: string;
  text: string;
  color?: string;
  resources?: Partial<Record<string, number>>;
  tradeGive?: Partial<Record<string, number>>;
  tradeGet?: Partial<Record<string, number>>;
}

interface Props {
  players: Player[];
}

function InlineResources({ resources }: { resources: Partial<Record<string, number>> }) {
  const entries = Object.entries(resources).filter(([, n]) => (n ?? 0) > 0);
  if (entries.length === 0) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginLeft: 3, verticalAlign: 'middle' }}>
      {entries.map(([res, n]) => {
        const img = RESOURCE_IMAGES[res];
        return (
          <span key={res} style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
            {img && (
              <img src={img} style={{ width: 11, height: 11, borderRadius: 2, display: 'inline-block', verticalAlign: 'middle' }} />
            )}
            <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1 }}>×{n}</span>
          </span>
        );
      })}
    </span>
  );
}

function TradeResources({ give, get }: { give: Partial<Record<string, number>>; get: Partial<Record<string, number>> }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 3, verticalAlign: 'middle' }}>
      <InlineResources resources={give} />
      <span style={{ fontSize: 10, color: 'var(--ui-text-muted)', lineHeight: 1 }}>→</span>
      <InlineResources resources={get} />
    </span>
  );
}

const DEV_ICONS: Record<string, string> = {
  knight: '⚔️',
  road_building: '🛣️',
  year_of_plenty: '🎁',
  monopoly: '🏦',
  victory_point: '⭐',
};

export function ActivityLog({ players }: Props) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const counter = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getName = (id: string | null) =>
    id ? (players.find((p) => p.id === id)?.name ?? 'Someone') : 'Someone';

  const add = (entry: Omit<LogEntry, 'id'>) => {
    const id = ++counter.current;
    setEntries((prev) => [...prev.slice(-29), { id, ...entry }]);
  };

  useEffect(() => {
    const onDiceRolled = (payload: { roll: [number, number]; activePlayerId: string }) => {
      const sum = payload.roll[0] + payload.roll[1];
      add({
        icon: '🎲',
        text: `${getName(payload.activePlayerId)} rolled ${payload.roll[0]}+${payload.roll[1]}=${sum}`,
        color: sum === 7 ? '#b91c1c' : '#8b6914',
      });
    };

    const onResourcesDistributed = (payload: { distributions: Record<string, Partial<Record<string, number>>> }) => {
      for (const [pid, dist] of Object.entries(payload.distributions)) {
        const total = Object.values(dist).reduce((s: number, n) => s + (n ?? 0), 0);
        if (total > 0) {
          add({
            icon: '📦',
            text: `${getName(pid)} collected ${total}:`,
            color: '#166534',
            resources: dist,
          });
        }
      }
    };

    const onBuildingPlaced = (payload: { buildingType: string; playerId: string }) => {
      const [icon, label] =
        payload.buildingType === 'road'       ? ['🛤️', 'a road'] :
        payload.buildingType === 'settlement' ? ['🏠', 'a settlement'] :
        payload.buildingType === 'city'       ? ['🏙️', 'a city'] :
        ['🔨', payload.buildingType];
      add({ icon, text: `${getName(payload.playerId)} built ${label}` });
    };

    const onRobberMoved = (payload: { byPlayerId: string }) => {
      add({ icon: '🦹', text: `${getName(payload.byPlayerId)} moved the robber`, color: '#b91c1c' });
    };

    const onStolen = (payload: { fromPlayerId: string; byPlayerId: string }) => {
      add({ icon: '💰', text: `${getName(payload.byPlayerId)} stole from ${getName(payload.fromPlayerId)}`, color: '#b91c1c' });
    };

    const onDevCardPlayed = (payload: { cardType: string; playerId: string }) => {
      const label =
        payload.cardType === 'knight'         ? 'Knight' :
        payload.cardType === 'road_building'  ? 'Road Building' :
        payload.cardType === 'year_of_plenty' ? 'Year of Plenty' :
        payload.cardType === 'monopoly'       ? 'Monopoly' : 'a dev card';
      add({
        icon: DEV_ICONS[payload.cardType] ?? '🃏',
        text: `${getName(payload.playerId)} played ${label}`,
        color: '#6b21a8',
      });
    };

    const onTradeExecuted = (payload: {
      fromPlayerId: string;
      toPlayerId: string | null;
      offered: Partial<Record<string, number>>;
      received: Partial<Record<string, number>>;
    }) => {
      if (payload.toPlayerId === null) {
        // Maritime / bank trade
        add({
          icon: '⚓',
          text: `${getName(payload.fromPlayerId)} traded with bank:`,
          color: '#1e5a8a',
          tradeGive: payload.offered,
          tradeGet: payload.received,
        });
      } else {
        // Player-to-player trade
        add({
          icon: '🤝',
          text: `${getName(payload.fromPlayerId)} → ${getName(payload.toPlayerId)}:`,
          color: '#1e5a8a',
          tradeGive: payload.offered,
          tradeGet: payload.received,
        });
      }
    };

    const onTradeResolved = (payload: { offerId: string; outcome: string }) => {
      // Only log cancellations and expirations (accepted is already shown via trade_executed)
      if (payload.outcome === 'cancelled') {
        add({ icon: '✗', text: 'Trade offer cancelled', color: '#6b7280' });
      } else if (payload.outcome === 'expired') {
        add({ icon: '⏱', text: 'Trade offer expired', color: '#6b7280' });
      }
    };

    const onLongestRoad = (payload: { playerId: string | null; length: number }) => {
      if (payload.playerId) {
        add({ icon: '🛣️', text: `${getName(payload.playerId)} claimed Longest Road (${payload.length})`, color: '#b5550a' });
      }
    };

    const onLargestArmy = (payload: { playerId: string | null; count: number }) => {
      if (payload.playerId) {
        add({ icon: '⚔️', text: `${getName(payload.playerId)} claimed Largest Army (${payload.count} knights)`, color: '#b91c1c' });
      }
    };

    socket.on('game:dice_rolled', onDiceRolled);
    socket.on('game:resources_distributed', onResourcesDistributed);
    socket.on('game:building_placed', onBuildingPlaced);
    socket.on('game:robber_moved', onRobberMoved);
    socket.on('game:stolen', onStolen);
    socket.on('game:dev_card_played', onDevCardPlayed);
    socket.on('game:trade_executed', onTradeExecuted);
    socket.on('game:trade_resolved', onTradeResolved);
    socket.on('game:longest_road_changed', onLongestRoad);
    socket.on('game:largest_army_changed', onLargestArmy);

    return () => {
      socket.off('game:dice_rolled', onDiceRolled);
      socket.off('game:resources_distributed', onResourcesDistributed);
      socket.off('game:building_placed', onBuildingPlaced);
      socket.off('game:robber_moved', onRobberMoved);
      socket.off('game:stolen', onStolen);
      socket.off('game:dev_card_played', onDevCardPlayed);
      socket.off('game:trade_executed', onTradeExecuted);
      socket.off('game:trade_resolved', onTradeResolved);
      socket.off('game:longest_road_changed', onLongestRoad);
      socket.off('game:largest_army_changed', onLargestArmy);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [entries]);

  return (
    <div style={{
      background: 'var(--ui-panel)',
      borderRadius: 10,
      border: '1px solid var(--ui-border)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      maxHeight: 200,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.04)',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--ui-text-muted)',
        padding: '7px 10px 5px', borderBottom: '1px solid var(--ui-border-light)',
        flexShrink: 0, fontFamily: "'Cinzel', Georgia, serif", letterSpacing: 2, textTransform: 'uppercase',
      }}>
        Activity
      </div>
      <div ref={scrollRef} style={{ overflowY: 'auto', padding: '4px 8px', flex: 1, minHeight: 0 }}>
        {entries.length === 0 && (
          <div style={{ color: 'var(--ui-text-faint)', fontSize: 11, padding: '4px 0' }}>No activity yet</div>
        )}
        {entries.map((e) => (
          <div key={e.id} style={{ fontSize: 11, color: e.color ?? 'var(--ui-text)', padding: '2px 0', lineHeight: 1.5, display: 'flex', alignItems: 'baseline', gap: 4 }}>
            {e.icon && <span style={{ fontSize: 11, flexShrink: 0 }}>{e.icon}</span>}
            <span>
              {e.text}
              {e.resources && <InlineResources resources={e.resources} />}
              {(e.tradeGive || e.tradeGet) && (
                <TradeResources give={e.tradeGive ?? {}} get={e.tradeGet ?? {}} />
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
