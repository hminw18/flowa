import { NextResponse } from 'next/server';
import { getSessionIdFromCookieHeader } from '@/server/auth';
import { getSession } from '@/server/user-store';
import { getSavedMessageIds, saveExpressionForUser, unsaveExpressionForUser } from '@/server/saved-store';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const sessionId = getSessionIdFromCookieHeader(request.headers.get('cookie'));
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const savedMessageIds = await getSavedMessageIds(session.userId);
  return NextResponse.json({ ok: true, savedMessageIds });
}

export async function POST(request: Request) {
  const sessionId = getSessionIdFromCookieHeader(request.headers.get('cookie'));
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const messageId = body?.messageId as string | undefined;
  const action = body?.action as string | undefined;

  if (!messageId || !action) {
    return NextResponse.json({ ok: false, error: 'Missing messageId or action' }, { status: 400 });
  }

  if (action === 'save') {
    await saveExpressionForUser(session.userId, messageId, session.learningLanguage);
    return NextResponse.json({ ok: true, saved: true });
  }

  if (action === 'unsave') {
    await unsaveExpressionForUser(session.userId, messageId);
    return NextResponse.json({ ok: true, saved: false });
  }

  return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
}
