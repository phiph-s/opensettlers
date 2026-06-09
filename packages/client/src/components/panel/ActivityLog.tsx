import React, { useEffect, useRef, useState } from 'react';
import type { Player } from '@opensettlers/shared';
import { socket } from '../../socket.js';

interface LogEntry {
  id: number;
  text: string;
  color?: string;
}

interface Props {
  players: Player[];
}

export function ActivityLog({ players }: Props) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const counter = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getName = (id: string | null) =>
    id ? (players.find((p) => p.id === id)?.name ?? 'Someone') : 'Someone';

  const addEntry = (text: string, color?: string) => {
    const id = ++counter.current;
    setEntries((prev) => [...prev.slice(-19), { id, text, color }]);
  };

  useEffect(() => {
    const onDiceRolled = (payload: { roll: [number, number]; activePlayerId: string }) => {
      const sum = payload.roll[0] + payload.roll[1];
      addEntry(`${getName(payload.activePlayerId)} rolled ${payload.roll[0]}+${payload.roll[1]}=${sum}`, sum === 7 ? '#b91c1c' : '#8b6914');
    };

    const onResourcesDistributed = (payload: { distributions: Record<string, Partial<Record<string, number>>> }) => {
      for (const [pid, dist] of Object.entries(payload.distributions)) {
        const total = Object.values(dist).reduce((s: number, n) => s + (n ?? 0), 0);
        if (total > 0) addEntry(`${getName(pid)} received ${total} card${total !== 1 ? 's' : ''}`, '#166534');
      }
    };

    const onBuildingPlaced = (payload: { buildingType: string; playerId: string }) => {
      const label = payload.buildingType === 'road' ? 'a road'
        : payload.buildingType === 'settlement' ? 'a settlement'
        : payload.buildingType === 'city' ? 'a city' : payload.buildingType;
      addEntry(`${getName(payload.playerId)} built ${label}`, '#374151');
    };

    const onRobberMoved = (payload: { byPlayerId: string }) => {
      addEntry(`${getName(payload.byPlayerId)} moved the robber`, '#b91c1c');
    };

    const onStolen = (payload: { fromPlayerId: string; byPlayerId: string }) => {
      addEntry(`${getName(payload.byPlayerId)} stole a card from ${getName(payload.fromPlayerId)}`, '#b91c1c');
    };

    const onDevCardPlayed = (payload: { cardType: string; playerId: string }) => {
      const label = payload.cardType === 'victory_point' ? 'a dev card'
        : payload.cardType === 'knight' ? 'a Knight'
        : payload.cardType === 'road_building' ? 'Road Building'
        : payload.cardType === 'year_of_plenty' ? 'Year of Plenty'
        : payload.cardType === 'monopoly' ? 'Monopoly'
        : 'a dev card';
      addEntry(`${getName(payload.playerId)} played ${label}`, '#6b21a8');
    };

    const onTradeResolved = (payload: { offerId: string; outcome: string }) => {
      addEntry(`Trade ${payload.outcome}`, '#1e5a8a');
    };

    const onLongestRoad = (payload: { playerId: string | null; length: number }) => {
      if (payload.playerId) addEntry(`${getName(payload.playerId)} has Longest Road (${payload.length})`, '#b5550a');
    };

    const onLargestArmy = (payload: { playerId: string | null; count: number }) => {
      if (payload.playerId) addEntry(`${getName(payload.playerId)} has Largest Army (${payload.count} knights)`, '#b91c1c');
    };

    socket.on('game:dice_rolled', onDiceRolled);
    socket.on('game:resources_distributed', onResourcesDistributed);
    socket.on('game:building_placed', onBuildingPlaced);
    socket.on('game:robber_moved', onRobberMoved);
    socket.on('game:stolen', onStolen);
    socket.on('game:dev_card_played', onDevCardPlayed);
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
      socket.off('game:trade_resolved', onTradeResolved);
      socket.off('game:longest_road_changed', onLongestRoad);
      socket.off('game:largest_army_changed', onLargestArmy);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 8,
      border: '1px solid #d8cfc4',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      maxHeight: 180,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 'bold', color: '#7a6d5e', padding: '6px 10px 4px', borderBottom: '1px solid #e8e1d5', flexShrink: 0 }}>
        Activity
      </div>
      <div
        ref={scrollRef}
        style={{ overflowY: 'auto', padding: '4px 8px', flex: 1, minHeight: 0 }}
      >
        {entries.length === 0 && (
          <div style={{ color: '#b0a898', fontSize: 11, padding: '4px 0' }}>No activity yet</div>
        )}
        {entries.map((e) => (
          <div key={e.id} style={{ fontSize: 11, color: e.color ?? '#374151', padding: '2px 0', lineHeight: 1.4 }}>
            {e.text}
          </div>
        ))}
      </div>
    </div>
  );
}
