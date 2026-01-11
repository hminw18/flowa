import { query } from './db';
import { Message, Language } from '../lib/types';

export async function getTodayConversationWindow(
  roomId: string,
  userId: string
): Promise<Message[]> {
  const result = await query<{
    message_id: string;
    room_id: string;
    sender_user_id: string;
    sender_username: string;
    original_text: string;
    original_language: Language;
    created_at_ms: number;
  }>(
    `with user_window as (
       select min(created_at) as start_at, max(created_at) as end_at
       from messages
       where room_id = $1
         and sender_user_id = $2
         and created_at >= date_trunc('day', now())
         and created_at < date_trunc('day', now()) + interval '1 day'
     )
     select
       m.message_id,
       m.room_id,
       m.sender_user_id,
       m.sender_username,
       m.original_text,
       m.original_language,
       (extract(epoch from m.created_at) * 1000)::bigint as created_at_ms
     from messages m
     join user_window w on w.start_at is not null and w.end_at is not null
     where m.room_id = $1
       and m.created_at >= w.start_at
       and m.created_at <= w.end_at
     order by m.created_at asc
     limit 200`,
    [roomId, userId]
  );

  return result.rows.map((row) => ({
    messageId: row.message_id,
    roomId: row.room_id,
    senderUserId: row.sender_user_id,
    senderUsername: row.sender_username,
    originalText: row.original_text,
    originalLanguage: row.original_language,
    createdAt: Number(row.created_at_ms),
  }));
}
