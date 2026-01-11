import { NextResponse } from 'next/server';
import { getSessionIdFromCookieHeader } from '@/server/auth';
import { getSession } from '@/server/user-store';
import { addUserToGlobalRoom } from '@/server/room-store';
import { GLOBAL_ROOM_ID, GLOBAL_ROOM_NAME } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  const sessionId = getSessionIdFromCookieHeader(request.headers.get('cookie'));
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (params.roomId !== GLOBAL_ROOM_ID) {
    return NextResponse.json({ ok: false, error: 'Room not found' }, { status: 404 });
  }

  await addUserToGlobalRoom(session.userId);

  return NextResponse.json({
    ok: true,
    room: { roomId: GLOBAL_ROOM_ID, roomType: 'group', name: GLOBAL_ROOM_NAME },
  });
}
