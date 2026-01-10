import { NextResponse } from 'next/server';
import { createSession, createUser, getActiveSessionForUser, getUserByUsername } from '@/server/user-store';
import { buildSessionCookie } from '@/server/auth';
import { addUserToGlobalRoom } from '@/server/room-store';
import { Language } from '@/lib/types';

export const runtime = 'nodejs';

function validateLanguage(lang: string): lang is Language {
  return lang === 'ko' || lang === 'en' || lang === 'es';
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = body?.username as string | undefined;
  const nativeLanguage = body?.nativeLanguage as string | undefined;
  const learningLanguage = body?.learningLanguage as string | undefined;

  if (!username) {
    return NextResponse.json({ ok: false, error: 'Username is required' }, { status: 400 });
  }

  if (!nativeLanguage || !validateLanguage(nativeLanguage)) {
    return NextResponse.json({ ok: false, error: 'Valid native language is required' }, { status: 400 });
  }

  if (!learningLanguage || !validateLanguage(learningLanguage)) {
    return NextResponse.json({ ok: false, error: 'Valid learning language is required' }, { status: 400 });
  }

  if (nativeLanguage === learningLanguage) {
    return NextResponse.json({ ok: false, error: 'Native and learning languages must be different' }, { status: 400 });
  }

  // Check if user exists
  let user = await getUserByUsername(username.trim());

  // If user doesn't exist, create new user
  if (!user) {
    user = await createUser(username.trim(), nativeLanguage, learningLanguage);
  }

  // Add user to global room (idempotent)
  await addUserToGlobalRoom(user.userId);

  const active = await getActiveSessionForUser(user.userId);
  if (active) {
    return NextResponse.json({ ok: false, error: 'User already logged in' }, { status: 409 });
  }

  const sessionId = await createSession(user.userId);
  const response = NextResponse.json({ ok: true, user });
  response.headers.set('Set-Cookie', buildSessionCookie(sessionId));
  return response;
}
