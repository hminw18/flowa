/**
 * Socket.io server implementation
 * Handles real-time messaging, translation, and metrics
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  Message,
} from '../lib/types';
import {
  getOrCreateRoom,
  addClientToRoom,
  removeClientFromRoom,
  addMessage,
  updateMessageTranslation,
  markTranslationError,
  recordTranslationOpen,
  getRoomMetrics,
} from './room-store';
import { translateKoToEn } from './translate';
import { selectHighlight } from './highlight';

const MAX_MESSAGE_LENGTH = 500;
const RATE_LIMIT_PER_SECOND = 2;

// Rate limiting map: clientId -> timestamps[]
const rateLimitMap = new Map<string, number[]>();

/**
 * Initialize Socket.io server
 */
export function initSocketServer(httpServer: HTTPServer): SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
> {
  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // room:join handler
    socket.on('room:join', async (payload, callback) => {
      const { roomId, clientId, username } = payload;

      if (!roomId || !clientId || !username) {
        callback({ ok: false, error: 'Missing roomId, clientId, or username' });
        return;
      }

      // Join socket.io room
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.clientId = clientId;
      socket.data.username = username;

      // Add to room store
      await addClientToRoom(roomId, clientId);

      // Send message history to the new client
      const room = await getOrCreateRoom(roomId);
      socket.emit('message:history', room.messages);

      console.log(`[Room] ${username} (${clientId}) joined room ${roomId}`);
      callback({ ok: true });
    });

    // message:send handler
    socket.on('message:send', async (payload, callback) => {
      const { roomId, clientId, username, originalText } = payload;

      // Validation
      if (!roomId || !clientId || !username || !originalText) {
        callback({ ok: false, error: 'Missing required fields' });
        return;
      }

      if (originalText.trim().length === 0) {
        callback({ ok: false, error: 'Empty message' });
        return;
      }

      if (originalText.length > MAX_MESSAGE_LENGTH) {
        callback({ ok: false, error: `Message too long (max ${MAX_MESSAGE_LENGTH} chars)` });
        return;
      }

      // Rate limiting
      if (!checkRateLimit(clientId)) {
        callback({ ok: false, error: 'Rate limit exceeded' });
        return;
      }

      // Create message
      const message: Message = {
        messageId: uuidv4(),
        roomId,
        senderClientId: clientId,
        senderUsername: username,
        originalText,
        createdAt: Date.now(),
        translationStatus: 'pending',
      };

      // Add to store
      await addMessage(roomId, message);

      // Broadcast to room
      io.to(roomId).emit('message:new', message);

      // Respond to sender
      callback({ ok: true, message });

      // Trigger translation (async, non-blocking)
      translateMessage(io, message);
    });

    // translation:open handler
    socket.on('translation:open', async (payload, callback) => {
      const { roomId, clientId, messageId } = payload;

      if (!roomId || !clientId || !messageId) {
        callback({ ok: false, error: 'Missing required fields' });
        return;
      }

      // Record metrics
      await recordTranslationOpen(roomId, messageId);

      // Get updated metrics
      const metrics = await getRoomMetrics(roomId);

      // Broadcast metrics update (optional)
      io.to(roomId).emit('room:metrics:update', metrics);

      callback({ ok: true });
    });

    // room:metrics:get handler
    socket.on('room:metrics:get', async (payload, callback) => {
      const { roomId } = payload;

      if (!roomId) {
        callback({ ok: false, error: 'Missing roomId' });
        return;
      }

      const metrics = await getRoomMetrics(roomId);
      callback({ ok: true, metrics });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      const { roomId, clientId } = socket.data;
      if (roomId && clientId) {
        await removeClientFromRoom(roomId, clientId);
        console.log(`[Room] Client ${clientId} left room ${roomId}`);
      }
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  console.log('[Socket.io] Server initialized');
  return io;
}

/**
 * Translate message asynchronously
 */
async function translateMessage(
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  message: Message
): Promise<void> {
  try {
    const translatedText = await translateKoToEn(message.originalText);
    const highlightSpan = selectHighlight(translatedText);

    // Update message in store
    await updateMessageTranslation(message.roomId, message.messageId, translatedText, highlightSpan);

    // Notify clients
    io.to(message.roomId).emit('message:translationReady', {
      messageId: message.messageId,
      translatedText,
      highlightSpan,
    });

    console.log(`[Translation] Success for message ${message.messageId}`);
  } catch (error) {
    console.error(`[Translation] Error for message ${message.messageId}:`, error);

    // Mark as error
    await markTranslationError(message.roomId, message.messageId);

    // Notify clients
    io.to(message.roomId).emit('message:translationError', {
      messageId: message.messageId,
    });
  }
}

/**
 * Rate limiting check
 */
function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(clientId) || [];

  // Filter timestamps within last second
  const recentTimestamps = timestamps.filter(ts => now - ts < 1000);

  if (recentTimestamps.length >= RATE_LIMIT_PER_SECOND) {
    return false;
  }

  // Add current timestamp
  recentTimestamps.push(now);
  rateLimitMap.set(clientId, recentTimestamps);

  // Cleanup old entries periodically
  if (Math.random() < 0.01) {
    cleanupRateLimitMap();
  }

  return true;
}

/**
 * Cleanup rate limit map
 */
function cleanupRateLimitMap(): void {
  const now = Date.now();
  for (const [clientId, timestamps] of rateLimitMap.entries()) {
    const recentTimestamps = timestamps.filter(ts => now - ts < 60000); // Keep last minute
    if (recentTimestamps.length === 0) {
      rateLimitMap.delete(clientId);
    } else {
      rateLimitMap.set(clientId, recentTimestamps);
    }
  }
}
