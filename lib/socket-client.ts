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
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
    socket = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
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
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Generate a unique client ID
 */
export function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get or create client ID from sessionStorage
 */
export function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return '';

  const storageKey = 'ci_messenger_client_id';
  let clientId = sessionStorage.getItem(storageKey);

  if (!clientId) {
    clientId = generateClientId();
    sessionStorage.setItem(storageKey, clientId);
  }

  return clientId;
}
