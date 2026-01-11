import { NextResponse } from 'next/server';
import { getSessionIdFromCookieHeader } from '@/server/auth';
import { getSession } from '@/server/user-store';
import { getSavedExpressions } from '@/server/saved-store';

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

  const items = await getSavedExpressions(session.userId);
  return NextResponse.json({ ok: true, items });
}
