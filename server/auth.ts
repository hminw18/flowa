import { IncomingMessage } from 'http';
import { getSession, touchSession } from './user-store';
import { Language } from '../lib/types';

const SESSION_COOKIE_NAME = 'ci_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey) continue;
    cookies[rawKey] = decodeURIComponent(rawValue.join('='));
  }

  return cookies;
}

export function getSessionIdFromRequest(req: IncomingMessage): string | null {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME] ?? null;
}

export function getSessionIdFromCookieHeader(cookieHeader?: string | null): string | null {
  const cookies = parseCookies(cookieHeader || undefined);
  return cookies[SESSION_COOKIE_NAME] ?? null;
}

export async function getUserFromRequest(req: IncomingMessage): Promise<{
  sessionId: string;
  userId: string;
  username: string;
  nativeLanguage: Language;
  learningLanguage: Language;
} | null> {
  const sessionId = getSessionIdFromRequest(req);
  if (!sessionId) return null;

  const session = await getSession(sessionId);
  if (!session) return null;

  await touchSession(sessionId);
  return {
    sessionId,
    userId: session.userId,
    username: session.username,
    nativeLanguage: session.nativeLanguage,
    learningLanguage: session.learningLanguage,
  };
}

export function buildSessionCookie(sessionId: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`;
}

export function clearSessionCookie(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
