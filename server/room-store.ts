/**
 * Postgres-backed room store
 * Persists rooms, messages, and metrics
 */

import { Message } from '../lib/types';
import { query } from './db';

async function ensureRoom(roomId: string): Promise<void> {
  await query(
    'insert into rooms (room_id) values ($1) on conflict (room_id) do nothing',
    [roomId]
  );
  await query('update rooms set last_activity = now() where room_id = $1', [roomId]);
}

export async function getOrCreateRoom(roomId: string): Promise<{ roomId: string; messages: Message[] }> {
  await ensureRoom(roomId);
  const messages = await getRoomMessages(roomId);
  return { roomId, messages };
}

async function getRoomMessages(roomId: string): Promise<Message[]> {
  const result = await query<{
    message_id: string;
    room_id: string;
    sender_client_id: string;
    sender_username: string;
    original_text: string;
    created_at: number;
    translation_status: 'pending' | 'ready' | 'error';
    translated_text: string | null;
    highlight_start: number | null;
    highlight_end: number | null;
  }>(
    `select
       message_id,
       room_id,
       sender_client_id,
       sender_username,
       original_text,
       created_at,
       translation_status,
       translated_text,
       highlight_start,
       highlight_end
     from messages
     where room_id = $1
     order by created_at asc`,
    [roomId]
  );

  return result.rows.map((row) => ({
    messageId: row.message_id,
    roomId: row.room_id,
    senderClientId: row.sender_client_id,
    senderUsername: row.sender_username,
    originalText: row.original_text,
    createdAt: row.created_at,
    translationStatus: row.translation_status,
    translatedText: row.translated_text ?? undefined,
    highlightSpan:
      row.highlight_start !== null && row.highlight_end !== null
        ? { start: row.highlight_start, end: row.highlight_end }
        : undefined,
  }));
}

export async function addClientToRoom(roomId: string, _clientId: string): Promise<void> {
  await ensureRoom(roomId);
}

export async function removeClientFromRoom(_roomId: string, _clientId: string): Promise<void> {
  return;
}

export async function addMessage(roomId: string, message: Message): Promise<void> {
  await ensureRoom(roomId);
  await query(
    `insert into messages (
       message_id,
       room_id,
       sender_client_id,
       sender_username,
       original_text,
       created_at,
       translation_status
     ) values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      message.messageId,
      message.roomId,
      message.senderClientId,
      message.senderUsername,
      message.originalText,
      message.createdAt,
      message.translationStatus,
    ]
  );
  await query('update rooms set last_activity = now() where room_id = $1', [roomId]);
}

export async function updateMessageTranslation(
  roomId: string,
  messageId: string,
  translatedText: string,
  highlightSpan: { start: number; end: number }
): Promise<void> {
  await query(
    `update messages
     set translation_status = 'ready',
         translated_text = $3,
         highlight_start = $4,
         highlight_end = $5
     where room_id = $1 and message_id = $2`,
    [roomId, messageId, translatedText, highlightSpan.start, highlightSpan.end]
  );
  await query('update rooms set last_activity = now() where room_id = $1', [roomId]);
}

export async function markTranslationError(roomId: string, messageId: string): Promise<void> {
  await query(
    `update messages
     set translation_status = 'error'
     where room_id = $1 and message_id = $2`,
    [roomId, messageId]
  );
  await query('update rooms set last_activity = now() where room_id = $1', [roomId]);
}

export async function recordTranslationOpen(roomId: string, messageId: string): Promise<void> {
  await query(
    `insert into translation_opens (room_id, message_id)
     values ($1, $2)
     on conflict (room_id, message_id) do nothing`,
    [roomId, messageId]
  );
  await query('update rooms set last_activity = now() where room_id = $1', [roomId]);
}

export async function getRoomMetrics(roomId: string): Promise<{
  totalMessages: number;
  uniqueOpened: number;
  openRate: number;
}> {
  const totalResult = await query<{ count: string }>(
    'select count(*)::text as count from messages where room_id = $1',
    [roomId]
  );
  const openedResult = await query<{ count: string }>(
    'select count(*)::text as count from translation_opens where room_id = $1',
    [roomId]
  );

  const totalMessages = Number(totalResult.rows[0]?.count ?? 0);
  const uniqueOpened = Number(openedResult.rows[0]?.count ?? 0);
  const openRate = totalMessages > 0 ? uniqueOpened / totalMessages : 0;

  return { totalMessages, uniqueOpened, openRate };
}
