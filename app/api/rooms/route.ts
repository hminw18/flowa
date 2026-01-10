import { NextResponse } from 'next/server';
import { getSessionIdFromCookieHeader } from '@/server/auth';
import { getSession } from '@/server/user-store';
import { getRoomsForUser, createDirectRoom, createGroupRoom } from '@/server/room-store';
import { getUserByUsername } from '@/server/user-store';

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

  const rooms = await getRoomsForUser(session.userId);
  return NextResponse.json({ ok: true, rooms });
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
  const roomType = body?.roomType as 'direct' | 'group' | undefined;
  const name = body?.name as string | undefined;
  const members = Array.isArray(body?.members) ? (body.members as string[]) : [];

  if (!roomType || !['direct', 'group'].includes(roomType)) {
    return NextResponse.json({ ok: false, error: 'Invalid room type' }, { status: 400 });
  }

  const normalizedMembers = members.map((member) => member.trim()).filter(Boolean);

  if (roomType === 'direct') {
    if (normalizedMembers.length !== 1) {
      return NextResponse.json({ ok: false, error: 'Direct room requires 1 username' }, { status: 400 });
    }

    const other = await getUserByUsername(normalizedMembers[0]);
    if (!other) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }
    if (other.userId === session.userId) {
      return NextResponse.json({ ok: false, error: 'Cannot start a chat with yourself' }, { status: 400 });
    }

    const roomId = await createDirectRoom(session.userId, other.userId);
    return NextResponse.json({ ok: true, roomId });
  }

  if (!name || !name.trim()) {
    return NextResponse.json({ ok: false, error: 'Group name is required' }, { status: 400 });
  }

  if (normalizedMembers.length === 0) {
    return NextResponse.json({ ok: false, error: 'Add at least one member' }, { status: 400 });
  }

  const memberIds: string[] = [];
  for (const member of normalizedMembers) {
    const user = await getUserByUsername(member);
    if (!user) {
      return NextResponse.json({ ok: false, error: `User not found: ${member}` }, { status: 404 });
    }
    if (user.userId !== session.userId) {
      memberIds.push(user.userId);
    }
  }

  const roomId = await createGroupRoom(name.trim(), session.userId, memberIds);
  return NextResponse.json({ ok: true, roomId });
}
