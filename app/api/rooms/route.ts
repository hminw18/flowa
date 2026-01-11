import { NextResponse } from 'next/server';
import { getSessionIdFromCookieHeader } from '@/server/auth';
import { getSession } from '@/server/user-store';
import { addUserToGlobalRoom, getRoomMessages, getUnreadCountForUser } from '@/server/room-store';
import { GLOBAL_ROOM_ID, GLOBAL_ROOM_NAME } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * GET /api/rooms
 * Returns only the global chat room
 */
export async function GET(request: Request) {
  const sessionId = getSessionIdFromCookieHeader(request.headers.get('cookie'));
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure user is a member of the global room
  await addUserToGlobalRoom(session.userId);
  const globalRoomId = GLOBAL_ROOM_ID;

  // Get messages for preview
  const messages = await getRoomMessages(globalRoomId);
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  const unreadCount = await getUnreadCountForUser(globalRoomId, session.userId);

  const room = {
    roomId: globalRoomId,
    roomType: 'group' as const,
    name: GLOBAL_ROOM_NAME,
    directUser: null,
    lastMessage,
    unreadCount,
  };

  return NextResponse.json({ ok: true, rooms: [room] });
}
