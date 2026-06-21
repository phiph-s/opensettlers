import { create } from 'zustand';

export type ConnectionStatus = 'connected' | 'reconnecting';

interface ConnectionStore {
  status: ConnectionStatus;
  /** True once we've successfully connected at least once this session. */
  hasConnected: boolean;
  setStatus: (status: ConnectionStatus) => void;
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  status: 'reconnecting',
  hasConnected: false,
  setStatus: (status) =>
    set((s) => ({ status, hasConnected: s.hasConnected || status === 'connected' })),
}));
