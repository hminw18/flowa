import { NextResponse } from 'next/server';
import { clearSessionCookie, getSessionIdFromCookieHeader } from '@/server/auth';
import { deleteSession, setSessionActive } from '@/server/user-store';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const sessionId = getSessionIdFromCookieHeader(request.headers.get('cookie'));

  if (sessionId) {
    await setSessionActive(sessionId, false);
    await deleteSession(sessionId);
  }

  const response = NextResponse.json({ ok: true });
  response.headers.set('Set-Cookie', clearSessionCookie());
  return response;
}
