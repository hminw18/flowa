/**
 * Socket.io client utility
 * Provides typed socket connection for browser
 */

import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from './types';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

/**
 * Get or create socket connection
 */
export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    // Automatically use current domain in production, localhost in development
    const url = process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

    socket = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      withCredentials: true,
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
    });
  }

  return socket;
}

/**
 * Reconnect socket (useful after login to refresh authentication)
 */
export function reconnectSocket(): void {
  if (socket) {
    console.log('[Socket] Reconnecting...');
    socket.disconnect();
    socket.connect();
  }
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
