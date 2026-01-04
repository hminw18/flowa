/**
 * In-memory room store
 * Manages room state, messages, and metrics
 */

import { RoomState, Message } from '../lib/types';

// In-memory storage
const rooms = new Map<string, RoomState>();

// GC interval: 30 minutes of inactivity
const ROOM_INACTIVITY_TIMEOUT = 30 * 60 * 1000;

/**
 * Get or create a room
 */
export function getOrCreateRoom(roomId: string): RoomState {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      roomId,
      clients: new Set(),
      messages: [],
      metrics: {
        totalMessages: 0,
        openedMessageIds: new Set(),
        translationOpens: 0,
      },
      lastActivity: Date.now(),
    });
  }

  const room = rooms.get(roomId)!;
  room.lastActivity = Date.now();
  return room;
}

/**
 * Get room by ID (returns undefined if not exists)
 */
export function getRoom(roomId: string): RoomState | undefined {
  return rooms.get(roomId);
}

/**
 * Add client to room
 */
export function addClientToRoom(roomId: string, clientId: string): void {
  const room = getOrCreateRoom(roomId);
  room.clients.add(clientId);
}

/**
 * Remove client from room
 */
export function removeClientFromRoom(roomId: string, clientId: string): void {
  const room = getRoom(roomId);
  if (room) {
    room.clients.delete(clientId);
  }
}

/**
 * Add message to room
 */
export function addMessage(roomId: string, message: Message): void {
  const room = getOrCreateRoom(roomId);
  room.messages.push(message);
  room.metrics.totalMessages++;
  room.lastActivity = Date.now();
}

/**
 * Update message with translation
 */
export function updateMessageTranslation(
  roomId: string,
  messageId: string,
  translatedText: string,
  highlightSpan: { start: number; end: number }
): Message | undefined {
  const room = getRoom(roomId);
  if (!room) return undefined;

  const message = room.messages.find(m => m.messageId === messageId);
  if (!message) return undefined;

  message.translationStatus = 'ready';
  message.translatedText = translatedText;
  message.highlightSpan = highlightSpan;
  room.lastActivity = Date.now();

  return message;
}

/**
 * Mark message translation as error
 */
export function markTranslationError(roomId: string, messageId: string): Message | undefined {
  const room = getRoom(roomId);
  if (!room) return undefined;

  const message = room.messages.find(m => m.messageId === messageId);
  if (!message) return undefined;

  message.translationStatus = 'error';
  room.lastActivity = Date.now();

  return message;
}

/**
 * Record translation open event
 */
export function recordTranslationOpen(roomId: string, messageId: string): void {
  const room = getRoom(roomId);
  if (!room) return;

  room.metrics.openedMessageIds.add(messageId);
  room.metrics.translationOpens++;
  room.lastActivity = Date.now();
}

/**
 * Get room metrics
 */
export function getRoomMetrics(roomId: string): {
  totalMessages: number;
  uniqueOpened: number;
  openRate: number;
} {
  const room = getRoom(roomId);
  if (!room) {
    return { totalMessages: 0, uniqueOpened: 0, openRate: 0 };
  }

  const totalMessages = room.metrics.totalMessages;
  const uniqueOpened = room.metrics.openedMessageIds.size;
  const openRate = totalMessages > 0 ? uniqueOpened / totalMessages : 0;

  return { totalMessages, uniqueOpened, openRate };
}

/**
 * Garbage collection: remove inactive rooms
 */
function garbageCollect(): void {
  const now = Date.now();
  const roomsToDelete: string[] = [];

  for (const [roomId, room] of rooms.entries()) {
    if (now - room.lastActivity > ROOM_INACTIVITY_TIMEOUT) {
      roomsToDelete.push(roomId);
    }
  }

  for (const roomId of roomsToDelete) {
    rooms.delete(roomId);
    console.log(`[GC] Removed inactive room: ${roomId}`);
  }

  if (roomsToDelete.length > 0) {
    console.log(`[GC] Cleaned up ${roomsToDelete.length} inactive rooms`);
  }
}

// Start GC interval (every 10 minutes)
setInterval(garbageCollect, 10 * 60 * 1000);

// Export for testing/debugging
export function getAllRooms(): Map<string, RoomState> {
  return rooms;
}
