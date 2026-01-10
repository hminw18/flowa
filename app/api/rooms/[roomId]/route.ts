import { NextResponse } from 'next/server';
import { getSessionIdFromCookieHeader } from '@/server/auth';
import { getSession } from '@/server/user-store';
import { getRoomById, isMember } from '@/server/room-store';

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

  const room = await getRoomById(params.roomId);
  if (!room) {
    return NextResponse.json({ ok: false, error: 'Room not found' }, { status: 404 });
  }

  const member = await isMember(params.roomId, session.userId);
  if (!member) {
    return NextResponse.json({ ok: false, error: 'Not a room member' }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    room: { roomId: room.roomId, roomType: room.roomType, name: room.name },
  });
}
