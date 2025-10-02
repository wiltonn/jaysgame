import { io, type Socket } from 'socket.io-client';
import { writable, type Writable } from 'svelte/store';
import type { MatchState } from '@jaysgame/shared';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export interface SocketStore {
  socket: Socket | null;
  connected: boolean;
  matchState: MatchState | null;
}

export const socketStore: Writable<SocketStore> = writable({
  socket: null,
  connected: false,
  matchState: null,
});

/**
 * Initialize Socket.IO connection
 */
export function initSocket(token?: string): Socket {
  const socket = io(SOCKET_URL, {
    query: token ? { token } : undefined,
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('✓ Socket connected:', socket.id);
    socketStore.update((state) => ({ ...state, socket, connected: true }));
  });

  socket.on('disconnect', () => {
    console.log('✗ Socket disconnected');
    socketStore.update((state) => ({ ...state, connected: false }));
  });

  socket.on('error', (error: { message: string }) => {
    console.error('Socket error:', error);
  });

  // Listen for state updates
  socket.on('state:update', (state: MatchState) => {
    console.log('State update:', state.phase);
    socketStore.update((store) => ({ ...store, matchState: state }));
  });

  socketStore.update((state) => ({ ...state, socket }));

  return socket;
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  socketStore.update((state) => {
    if (state.socket) {
      state.socket.disconnect();
    }
    return {
      socket: null,
      connected: false,
      matchState: null,
    };
  });
}
