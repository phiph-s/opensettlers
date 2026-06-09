import { useEffect, useRef } from 'react';
import type { GameState } from '@opensettlers/shared';
import { socket } from '../socket.js';
import { playResourceGain, playYourTurn, playRobber } from '../sounds/soundEngine.js';

export function useSoundEffects(gameState: GameState | null, myPlayerId: string | null): void {
  const prevPhaseRef = useRef<string | null>(null);
  const prevActiveIdRef = useRef<string | null>(null);
  const initialized = useRef(false);

  // Resource gain: socket event
  useEffect(() => {
    const handler = (data: { distributions: Record<string, unknown> }) => {
      if (myPlayerId && data.distributions[myPlayerId]) playResourceGain();
    };
    socket.on('game:resources_distributed', handler);
    return () => { socket.off('game:resources_distributed', handler); };
  }, [myPlayerId]);

  // Your turn + robber: watch state transitions
  useEffect(() => {
    if (!gameState) return;

    const { phase, activePlayerIndex, players } = gameState;
    const activeId = players[activePlayerIndex]?.id ?? null;

    // Skip sounds on initial load — just record current state
    if (!initialized.current) {
      prevPhaseRef.current = phase;
      prevActiveIdRef.current = activeId;
      initialized.current = true;
      return;
    }

    const prevPhase = prevPhaseRef.current;
    const prevActiveId = prevActiveIdRef.current;

    // Robber rolled: entering ROBBER_PLACEMENT from any non-steal phase
    if (phase === 'ROBBER_PLACEMENT' && prevPhase !== 'ROBBER_PLACEMENT' && prevPhase !== 'STEAL') {
      playRobber();
    }

    // Your turn starting: active player just became me, in a turn-start phase
    const isMyTurnStart = phase === 'PRE_ROLL' || phase === 'SETUP_PLACE_SETTLEMENT';
    if (activeId === myPlayerId && activeId !== prevActiveId && isMyTurnStart) {
      playYourTurn();
    }
    // Also handle phase change to PRE_ROLL while staying active player (rare edge case)
    if (activeId === myPlayerId && phase === 'PRE_ROLL' && prevPhase !== 'PRE_ROLL' && prevPhase !== 'ROBBER_PLACEMENT' && prevPhase !== 'STEAL' && prevPhase !== 'DISCARD_PHASE') {
      playYourTurn();
    }

    prevPhaseRef.current = phase;
    prevActiveIdRef.current = activeId;
  });
}
