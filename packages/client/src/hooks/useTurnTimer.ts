import { useEffect, useState } from 'react';

export function useTurnTimer(deadline: number | null): number {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!deadline) {
      setSecondsLeft(0);
      return;
    }

    const tick = () => {
      const diff = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(diff);
    };

    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [deadline]);

  return secondsLeft;
}
