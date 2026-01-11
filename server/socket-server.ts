/**
 * Socket.io server implementation
 * Handles real-time messaging and multi-language translation
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
  Language,
  GLOBAL_ROOM_ID,
} from '../lib/types';
import {
  getRoomMessages,
  addMessage,
  addTranslations,
  markRoomRead,
  getReadUpdates,
  addUserToGlobalRoom,
} from './room-store';
import { getUserFromRequest } from './auth';
import { setSessionActive } from './user-store';
import { translateToAllLanguages } from './translate';

const MAX_MESSAGE_LENGTH = 500;
const RATE_LIMIT_PER_SECOND = 2;

// Rate limiting map: userId -> timestamps[]
const rateLimitMap = new Map<string, number[]>();
const sessionConnections = new Map<string, number>();

/**
 * Check rate limit for user
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userTimestamps = rateLimitMap.get(userId) || [];

  // Remove timestamps older than 1 second
  const recentTimestamps = userTimestamps.filter((ts) => now - ts < 1000);

  if (recentTimestamps.length >= RATE_LIMIT_PER_SECOND) {
    return false;
  }

  recentTimestamps.push(now);
  rateLimitMap.set(userId, recentTimestamps);
  return true;
}

/**
 * Translate message and broadcast to room
 */
async function translateMessage(io: SocketIOServer, message: Message): Promise<void> {
  try {
    console.log(`[Translation] Starting for message ${message.messageId}`);

    const translations = await translateToAllLanguages(message.originalText, message.originalLanguage);

    // Save translations to database
    await addTranslations(message.messageId, translations);

    // Broadcast translations to room
    io.to(message.roomId).emit('message:translationsReady', {
      messageId: message.messageId,
      translations,
    });

    console.log(`[Translation] Success for message ${message.messageId}`);
  } catch (error) {
    console.error(`[Translation] Failed for message ${message.messageId}:`, error);
    // Don't broadcast error - messages can still be viewed without translation
  }
}

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

  io.use(async (socket, next) => {
    try {
      const user = await getUserFromRequest(socket.request);
      if (!user) {
        return next(new Error('Unauthorized'));
      }

      socket.data.userId = user.userId;
      socket.data.username = user.username;
      socket.data.sessionId = user.sessionId;
      socket.data.nativeLanguage = user.nativeLanguage;
      socket.data.learningLanguage = user.learningLanguage;

      console.log(
        `[Socket] User authenticated - ${user.username} (${user.nativeLanguage}→${user.learningLanguage})`
      );

      const currentCount = sessionConnections.get(user.sessionId) ?? 0;
      sessionConnections.set(user.sessionId, currentCount + 1);
      await setSessionActive(user.sessionId, true);
      return next();
    } catch (error) {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // room:join handler
    socket.on('room:join', async (payload, callback) => {
      const { roomId: requestedRoomId } = payload;
      const { userId, username } = socket.data;

      if (!userId || !username) {
        callback({ ok: false, error: 'Missing user context' });
        return;
      }

      const roomId = GLOBAL_ROOM_ID;
      if (requestedRoomId && requestedRoomId !== roomId) {
        console.warn(`[Room] Redirecting join to global room (requested ${requestedRoomId})`);
      }

      await addUserToGlobalRoom(userId);
      socket.join(roomId);

      // Send message history
      const messages = await getRoomMessages(roomId);
      socket.emit('message:history', messages);

      // Mark room as read
      await markRoomRead(roomId, userId);
      const updates = await getReadUpdates(roomId);
      io.to(roomId).emit('message:readUpdate', { updates });

      console.log(`[Room] ${username} joined room ${roomId}`);
      callback({ ok: true });
    });

    // message:send handler
    socket.on('message:send', async (payload, callback) => {
      const { roomId: requestedRoomId, originalText } = payload;
      const { userId, username, nativeLanguage } = socket.data;
      const roomId = GLOBAL_ROOM_ID;

      console.log(`[Socket] message:send - User: ${username}, Room: ${roomId}`);

      // Validation
      if (!userId || !username || !originalText || !nativeLanguage) {
        callback({ ok: false, error: 'Missing required fields' });
        return;
      }

      if (requestedRoomId && requestedRoomId !== roomId) {
        console.warn(`[Room] Redirecting send to global room (requested ${requestedRoomId})`);
      }

      if (originalText.trim().length === 0) {
        callback({ ok: false, error: 'Empty message' });
        return;
      }

      if (originalText.length > MAX_MESSAGE_LENGTH) {
        callback({ ok: false, error: `Message too long (max ${MAX_MESSAGE_LENGTH} chars)` });
        return;
      }

      await addUserToGlobalRoom(userId);

      // Rate limiting
      if (!checkRateLimit(userId)) {
        callback({ ok: false, error: 'Rate limit exceeded' });
        return;
      }

      // Create message
      const message: Message = {
        messageId: uuidv4(),
        roomId,
        senderUserId: userId,
        senderUsername: username,
        originalText,
        originalLanguage: nativeLanguage,
        createdAt: Date.now(),
      };

      // Add to store
      const storedMessage = await addMessage(roomId, message);

      // Broadcast to room
      io.to(roomId).emit('message:new', storedMessage);

      // Respond to sender
      callback({ ok: true, message: storedMessage });

      // Trigger translation (async, non-blocking)
      translateMessage(io, message);
    });

    // room:read handler
    socket.on('room:read', async (payload, callback) => {
      const { roomId: requestedRoomId } = payload;
      const { userId, username } = socket.data;
      const roomId = GLOBAL_ROOM_ID;

      console.log(`[Room] room:read - User: ${username}, Room: ${roomId}`);

      if (!userId) {
        callback({ ok: false, error: 'Missing required fields' });
        return;
      }

      if (requestedRoomId && requestedRoomId !== roomId) {
        console.warn(`[Room] Redirecting read to global room (requested ${requestedRoomId})`);
      }

      await addUserToGlobalRoom(userId);
      await markRoomRead(roomId, userId);
      const updates = await getReadUpdates(roomId);
      console.log(`[Room] Read updates:`, updates);
      io.to(roomId).emit('message:readUpdate', { updates });
      callback({ ok: true });
    });

    // disconnect handler
    socket.on('disconnect', async () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);

      const { sessionId } = socket.data;
      if (sessionId) {
        const currentCount = sessionConnections.get(sessionId) ?? 0;
        const newCount = Math.max(0, currentCount - 1);
        sessionConnections.set(sessionId, newCount);

        if (newCount === 0) {
          await setSessionActive(sessionId, false);
          sessionConnections.delete(sessionId);
        }
      }
    });
  });

  return io;
}
