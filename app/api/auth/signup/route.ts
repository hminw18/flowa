import { NextResponse } from 'next/server';
import { createSession, createUser, getUserByUsername, getActiveSessionForUser } from '@/server/user-store';
import { buildSessionCookie } from '@/server/auth';
import { Language } from '@/lib/types';
import { addUserToGlobalRoom } from '@/server/room-store';

export const runtime = 'nodejs';

function validateUsername(username: string): string | null {
  const trimmed = username.trim();
  if (!trimmed) return 'Username is required';
  if (trimmed.length > 20) return 'Username must be 20 characters or less';
  return null;
}

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

  const validationError = validateUsername(username);
  if (validationError) {
    return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
  }

  const existing = await getUserByUsername(username);
  if (existing) {
    return NextResponse.json({ ok: false, error: 'Username already exists' }, { status: 409 });
  }

  const user = await createUser(username, nativeLanguage, learningLanguage);

  // Add user to global room
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
