import { v4 as uuidv4 } from 'uuid';
import { query } from './db';
import { Language } from '../lib/types';

export type User = {
  userId: string;
  username: string;
  nativeLanguage: Language;
  learningLanguage: Language;
};

export type Session = {
  sessionId: string;
  userId: string;
  username: string;
  nativeLanguage: Language;
  learningLanguage: Language;
  isActive: boolean;
  lastSeen: string;
};

export async function getUserByUsername(username: string): Promise<User | null> {
  const result = await query<{ user_id: string; username: string; native_language: Language; learning_language: Language }>(
    'select user_id, username, native_language, learning_language from users where username = $1',
    [username]
  );

  if (result.rows.length === 0) return null;
  return {
    userId: result.rows[0].user_id,
    username: result.rows[0].username,
    nativeLanguage: result.rows[0].native_language,
    learningLanguage: result.rows[0].learning_language,
  };
}

export async function getUserById(userId: string): Promise<User | null> {
  const result = await query<{ user_id: string; username: string; native_language: Language; learning_language: Language }>(
    'select user_id, username, native_language, learning_language from users where user_id = $1',
    [userId]
  );

  if (result.rows.length === 0) return null;
  return {
    userId: result.rows[0].user_id,
    username: result.rows[0].username,
    nativeLanguage: result.rows[0].native_language,
    learningLanguage: result.rows[0].learning_language,
  };
}

export async function createUser(
  username: string,
  nativeLanguage: Language,
  learningLanguage: Language
): Promise<User> {
  const userId = uuidv4();
  await query(
    'insert into users (user_id, username, native_language, learning_language) values ($1, $2, $3, $4)',
    [userId, username, nativeLanguage, learningLanguage]
  );
  return { userId, username, nativeLanguage, learningLanguage };
}

export async function createSession(userId: string): Promise<string> {
  const sessionId = uuidv4();
  await query('insert into sessions (session_id, user_id, is_active) values ($1, $2, true)', [
    sessionId,
    userId,
  ]);
  return sessionId;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const result = await query<{
    session_id: string;
    user_id: string;
    username: string;
    native_language: Language;
    learning_language: Language;
    is_active: boolean;
    last_seen: string;
  }>(
    `select s.session_id, s.user_id, s.is_active, s.last_seen, u.username, u.native_language, u.learning_language
     from sessions s
     join users u on u.user_id = s.user_id
     where s.session_id = $1`,
    [sessionId]
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    username: row.username,
    nativeLanguage: row.native_language,
    learningLanguage: row.learning_language,
    isActive: row.is_active,
    lastSeen: row.last_seen,
  };
}

export async function getActiveSessionForUser(userId: string): Promise<Session | null> {
  const result = await query<{
    session_id: string;
    user_id: string;
    username: string;
    native_language: Language;
    learning_language: Language;
    is_active: boolean;
    last_seen: string;
  }>(
    `select s.session_id, s.user_id, s.is_active, s.last_seen, u.username, u.native_language, u.learning_language
     from sessions s
     join users u on u.user_id = s.user_id
     where s.user_id = $1 and s.is_active = true
     order by s.last_seen desc
     limit 1`,
    [userId]
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    username: row.username,
    nativeLanguage: row.native_language,
    learningLanguage: row.learning_language,
    isActive: row.is_active,
    lastSeen: row.last_seen,
  };
}

export async function setSessionActive(sessionId: string, isActive: boolean): Promise<void> {
  await query('update sessions set is_active = $2, last_seen = now() where session_id = $1', [
    sessionId,
    isActive,
  ]);
}

export async function touchSession(sessionId: string): Promise<void> {
  await query('update sessions set last_seen = now() where session_id = $1', [sessionId]);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await query('delete from sessions where session_id = $1', [sessionId]);
}
