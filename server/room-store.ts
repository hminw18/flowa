/**
 * Postgres-backed room/message store
 */

import { v4 as uuidv4 } from 'uuid';
import { Message, RoomSummary, Language } from '../lib/types';
import { query } from './db';

type DbMessageRow = {
  message_id: string;
  room_id: string;
  sender_user_id: string;
  sender_username: string;
  original_text: string;
  original_language: Language;
  created_at_ms: number;
  unread_count: number;
  translations: Record<Language, string> | null;
};

export async function getRoomMessages(roomId: string): Promise<Message[]> {
  const result = await query<DbMessageRow>(
    `with member_count as (
       select count(*)::int as count
       from room_members
       where room_id = $1
     ),
     read_counts as (
       select message_id, count(*)::int as read_count
       from message_reads
       where room_id = $1
       group by message_id
     ),
     message_translations as (
       select
         message_id,
         jsonb_object_agg(target_language, translated_text) as translations
       from translations
       group by message_id
     )
     select
       m.message_id,
       m.room_id,
       m.sender_user_id,
       m.sender_username,
       m.original_text,
       m.original_language,
       (extract(epoch from m.created_at) * 1000)::bigint as created_at_ms,
       greatest(0, member_count.count - 1 - coalesce(read_counts.read_count, 0))::int as unread_count,
       mt.translations
     from messages m
     cross join member_count
     left join read_counts on read_counts.message_id = m.message_id
     left join message_translations mt on mt.message_id = m.message_id
     where m.room_id = $1
     order by m.created_at asc`,
    [roomId]
  );

  return result.rows.map((row) => ({
    messageId: row.message_id,
    roomId: row.room_id,
    senderUserId: row.sender_user_id,
    senderUsername: row.sender_username,
    originalText: row.original_text,
    originalLanguage: row.original_language,
    createdAt: Number(row.created_at_ms),
    unreadCount: row.unread_count,
    translations: row.translations ?? undefined,
  }));
}

export async function getRoomById(
  roomId: string
): Promise<{ roomId: string; roomType: 'direct' | 'group'; name: string | null } | null> {
  const result = await query<{ room_id: string; room_type: 'direct' | 'group'; name: string | null }>(
    'select room_id, room_type, name from rooms where room_id = $1',
    [roomId]
  );
  if (result.rows.length === 0) return null;
  return {
    roomId: result.rows[0].room_id,
    roomType: result.rows[0].room_type,
    name: result.rows[0].name,
  };
}

export async function isMember(roomId: string, userId: string): Promise<boolean> {
  const result = await query<{ exists: boolean }>(
    'select exists(select 1 from room_members where room_id = $1 and user_id = $2) as exists',
    [roomId, userId]
  );
  return result.rows[0]?.exists ?? false;
}

export async function createDirectRoom(userId: string, otherUserId: string): Promise<string> {
  const directKey = [userId, otherUserId].sort().join(':');
  const roomId = uuidv4();

  await query(
    `insert into rooms (room_id, room_type, direct_key, created_by)
     values ($1, 'direct', $2, $3)
     on conflict (direct_key) do nothing`,
    [roomId, directKey, userId]
  );

  const existing = await query<{ room_id: string }>('select room_id from rooms where direct_key = $1', [
    directKey,
  ]);
  const finalRoomId = existing.rows[0]?.room_id ?? roomId;

  await query(
    `insert into room_members (room_id, user_id)
     values ($1, $2), ($1, $3)
     on conflict (room_id, user_id) do nothing`,
    [finalRoomId, userId, otherUserId]
  );

  return finalRoomId;
}

export async function createGroupRoom(name: string, creatorId: string, memberUserIds: string[]): Promise<string> {
  const roomId = uuidv4();
  await query(
    `insert into rooms (room_id, room_type, name, created_by)
     values ($1, 'group', $2, $3)`,
    [roomId, name, creatorId]
  );

  const uniqueMembers = Array.from(new Set([creatorId, ...memberUserIds]));
  const values = uniqueMembers.map((_, idx) => `($1, $${idx + 2})`).join(', ');
  await query(`insert into room_members (room_id, user_id) values ${values} on conflict do nothing`, [
    roomId,
    ...uniqueMembers,
  ]);

  return roomId;
}

export async function addMessage(roomId: string, message: Message): Promise<Message> {
  const result = await query<{ created_at: string }>(
    `insert into messages (
       message_id,
       room_id,
       sender_user_id,
       sender_username,
       original_text,
       original_language
     ) values ($1, $2, $3, $4, $5, $6)
     returning created_at`,
    [
      message.messageId,
      roomId,
      message.senderUserId,
      message.senderUsername,
      message.originalText,
      message.originalLanguage,
    ]
  );

  await query('update rooms set updated_at = now() where room_id = $1', [roomId]);

  const createdAtMs = Math.floor(new Date(result.rows[0].created_at).getTime());
  const unreadCount = await getUnreadCountForMessage(roomId, message.messageId);

  return {
    ...message,
    createdAt: createdAtMs,
    unreadCount,
  };
}

export async function addTranslations(
  messageId: string,
  translations: Record<Language, string>
): Promise<void> {
  const entries = Object.entries(translations);
  if (entries.length === 0) return;

  const values = entries
    .map((_, idx) => {
      const base = idx * 2;
      return `($1, $${base + 2}, $${base + 3})`;
    })
    .join(', ');

  const params = [messageId, ...entries.flat()];

  await query(
    `insert into translations (message_id, target_language, translated_text)
     values ${values}
     on conflict (message_id, target_language) do update
     set translated_text = excluded.translated_text`,
    params
  );
}

export async function getTranslationsForMessage(messageId: string): Promise<Record<Language, string>> {
  const result = await query<{ target_language: Language; translated_text: string }>(
    'select target_language, translated_text from translations where message_id = $1',
    [messageId]
  );

  const translations: Record<Language, string> = {} as Record<Language, string>;
  for (const row of result.rows) {
    translations[row.target_language] = row.translated_text;
  }

  return translations;
}

export async function markRoomRead(roomId: string, userId: string): Promise<void> {
  await query(
    `insert into message_reads (room_id, message_id, user_id)
     select $1, m.message_id, $2
     from messages m
     where m.room_id = $1
       and m.sender_user_id <> $2
       and not exists (
         select 1 from message_reads mr
         where mr.message_id = m.message_id and mr.user_id = $2
       )`,
    [roomId, userId]
  );
}

export async function getUnreadCountForMessage(roomId: string, messageId: string): Promise<number> {
  const result = await query<{ unread_count: number }>(
    `with member_count as (
       select count(*)::int as count
       from room_members
       where room_id = $1
     ),
     read_count as (
       select count(*)::int as count
       from message_reads
       where message_id = $2
     )
     select greatest(0, member_count.count - 1 - read_count.count)::int as unread_count
     from member_count, read_count`,
    [roomId, messageId]
  );

  return result.rows[0]?.unread_count ?? 0;
}

export async function getReadUpdates(roomId: string): Promise<Array<{ messageId: string; unreadCount: number }>> {
  const result = await query<{ message_id: string; unread_count: number }>(
    `with member_count as (
       select count(*)::int as count
       from room_members
       where room_id = $1
     ),
     read_counts as (
       select message_id, count(*)::int as read_count
       from message_reads
       where room_id = $1
       group by message_id
     )
     select
       m.message_id,
       greatest(0, member_count.count - 1 - coalesce(read_counts.read_count, 0))::int as unread_count
     from messages m
     cross join member_count
     left join read_counts on read_counts.message_id = m.message_id
     where m.room_id = $1`,
    [roomId]
  );

  return result.rows.map((row) => ({
    messageId: row.message_id,
    unreadCount: row.unread_count,
  }));
}

const GLOBAL_ROOM_ID = 'global';

export async function getOrCreateGlobalRoom(): Promise<string> {
  // Check if global room exists
  const existing = await query<{ room_id: string }>(
    'select room_id from rooms where room_id = $1',
    [GLOBAL_ROOM_ID]
  );

  if (existing.rows.length > 0) {
    return GLOBAL_ROOM_ID;
  }

  // Create global room
  await query(
    `insert into rooms (room_id, room_type, name, created_by)
     values ($1, 'group', 'Global Chat', null)`,
    [GLOBAL_ROOM_ID]
  );

  return GLOBAL_ROOM_ID;
}

export async function addUserToGlobalRoom(userId: string): Promise<void> {
  const roomId = await getOrCreateGlobalRoom();
  await query(
    `insert into room_members (room_id, user_id)
     values ($1, $2)
     on conflict (room_id, user_id) do nothing`,
    [roomId, userId]
  );
}

export async function getRoomsForUser(userId: string): Promise<RoomSummary[]> {
  const result = await query<{
    room_id: string;
    room_type: 'direct' | 'group';
    name: string | null;
    other_user_id: string | null;
    other_username: string | null;
    last_message_id: string | null;
    last_message_text: string | null;
    last_message_lang: Language | null;
    last_message_time: number | null;
    unread_count: number;
  }>(
    `with user_rooms as (
       select room_id
       from room_members
       where user_id = $1
     ),
     room_member_counts as (
       select room_id, count(*)::int as member_count
       from room_members
       group by room_id
     ),
     direct_other_users as (
       select rm.room_id, u.user_id, u.username
       from room_members rm
       join users u on u.user_id = rm.user_id
       where rm.room_id in (select room_id from user_rooms)
         and rm.user_id <> $1
     ),
     last_messages as (
       select distinct on (m.room_id)
         m.room_id,
         m.message_id,
         m.original_text,
         m.original_language,
         (extract(epoch from m.created_at) * 1000)::bigint as created_at_ms
       from messages m
       where m.room_id in (select room_id from user_rooms)
       order by m.room_id, m.created_at desc
     ),
     unread_counts as (
       select m.room_id, count(*)::int as unread_count
       from messages m
       where m.room_id in (select room_id from user_rooms)
         and m.sender_user_id <> $1
         and not exists (
           select 1 from message_reads mr
           where mr.message_id = m.message_id and mr.user_id = $1
         )
       group by m.room_id
     )
     select
       r.room_id,
       r.room_type,
       r.name,
       dou.user_id as other_user_id,
       dou.username as other_username,
       lm.message_id as last_message_id,
       lm.original_text as last_message_text,
       lm.original_language as last_message_lang,
       lm.created_at_ms as last_message_time,
       coalesce(uc.unread_count, 0)::int as unread_count
     from rooms r
     join user_rooms ur on ur.room_id = r.room_id
     left join direct_other_users dou on dou.room_id = r.room_id
     left join last_messages lm on lm.room_id = r.room_id
     left join unread_counts uc on uc.room_id = r.room_id
     order by coalesce(lm.created_at_ms, 0) desc`,
    [userId]
  );

  return result.rows.map((row) => ({
    roomId: row.room_id,
    roomType: row.room_type,
    name: row.name,
    directUser:
      row.other_user_id && row.other_username
        ? { userId: row.other_user_id, username: row.other_username }
        : null,
    lastMessage:
      row.last_message_id && row.last_message_text && row.last_message_lang
        ? {
            messageId: row.last_message_id,
            roomId: row.room_id,
            senderUserId: '',
            senderUsername: '',
            originalText: row.last_message_text,
            originalLanguage: row.last_message_lang,
            createdAt: row.last_message_time || 0,
          }
        : null,
    unreadCount: row.unread_count,
  }));
}
