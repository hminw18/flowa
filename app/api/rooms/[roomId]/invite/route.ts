import { NextResponse } from 'next/server';
import { getSessionIdFromCookieHeader } from '@/server/auth';
import { getSession, getUserByUsername } from '@/server/user-store';
import { addMembersToRoom, getRoomById, isMember } from '@/server/room-store';

export const runtime = 'nodejs';

export async function POST(
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

  const roomId = params.roomId;
  const room = await getRoomById(roomId);
  if (!room) {
    return NextResponse.json({ ok: false, error: 'Room not found' }, { status: 404 });
  }

  if (room.roomType !== 'group') {
    return NextResponse.json({ ok: false, error: 'Invites are only for group chats' }, { status: 400 });
  }

  const member = await isMember(roomId, session.userId);
  if (!member) {
    return NextResponse.json({ ok: false, error: 'Not a room member' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const members = Array.isArray(body?.members) ? (body.members as string[]) : [];
  const normalizedMembers = members.map((m) => m.trim()).filter(Boolean);

  if (normalizedMembers.length === 0) {
    return NextResponse.json({ ok: false, error: 'No members provided' }, { status: 400 });
  }

  const memberIds: string[] = [];
  for (const memberName of normalizedMembers) {
    const user = await getUserByUsername(memberName);
    if (!user) {
      return NextResponse.json({ ok: false, error: `User not found: ${memberName}` }, { status: 404 });
    }
    memberIds.push(user.userId);
  }

  await addMembersToRoom(roomId, memberIds);
  return NextResponse.json({ ok: true });
}
