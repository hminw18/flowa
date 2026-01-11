import { v4 as uuidv4 } from 'uuid';
import { query } from './db';
import { Language } from '../lib/types';

export type SavedExpression = {
  messageId: string;
  originalText: string;
  translatedText: string | null;
  targetLanguage: Language;
  createdAt: string;
};

export async function getSavedMessageIds(userId: string): Promise<string[]> {
  const result = await query<{ message_id: string }>(
    'select message_id from saved_expressions where user_id = $1 order by created_at desc',
    [userId]
  );
  return result.rows.map((row) => row.message_id);
}

export async function getSavedExpressions(userId: string): Promise<SavedExpression[]> {
  const result = await query<{
    message_id: string;
    original_text: string;
    translated_text: string | null;
    target_language: Language;
    created_at: string;
  }>(
    `select message_id, original_text, translated_text, target_language, created_at
     from saved_expressions
     where user_id = $1
     order by created_at desc`,
    [userId]
  );

  return result.rows.map((row) => ({
    messageId: row.message_id,
    originalText: row.original_text,
    translatedText: row.translated_text,
    targetLanguage: row.target_language,
    createdAt: row.created_at,
  }));
}

export async function saveExpressionForUser(
  userId: string,
  messageId: string,
  targetLanguage: Language
): Promise<void> {
  const messageResult = await query<{
    message_id: string;
    original_text: string;
    original_language: Language;
    translated_text: string | null;
  }>(
    `select m.message_id, m.original_text, m.original_language, t.translated_text
     from messages m
     left join translations t on t.message_id = m.message_id and t.target_language = $2
     where m.message_id = $1`,
    [messageId, targetLanguage]
  );

  if (messageResult.rows.length === 0) {
    throw new Error('Message not found');
  }

  const message = messageResult.rows[0];
  const translatedText =
    message.translated_text ?? (message.original_language === targetLanguage ? message.original_text : null);

  await query(
    `insert into saved_expressions (
       saved_id,
       user_id,
       message_id,
       original_text,
       translated_text,
       target_language
     ) values ($1, $2, $3, $4, $5, $6)
     on conflict (user_id, message_id) do update
     set original_text = excluded.original_text,
         translated_text = excluded.translated_text,
         target_language = excluded.target_language,
         created_at = now()`,
    [uuidv4(), userId, messageId, message.original_text, translatedText, targetLanguage]
  );
}

export async function unsaveExpressionForUser(userId: string, messageId: string): Promise<void> {
  await query('delete from saved_expressions where user_id = $1 and message_id = $2', [
    userId,
    messageId,
  ]);
}
