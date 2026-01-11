import { NextResponse } from 'next/server';
import { getSessionIdFromCookieHeader } from '@/server/auth';
import { getSession } from '@/server/user-store';
import { getTodayConversationWindow } from '@/server/conversation-store';
import { getTodayReview, saveTodayReview, type ReviewSession } from '@/server/review-store';
import { GLOBAL_ROOM_ID, LANGUAGE_NAMES, type Language, type Message } from '@/lib/types';
import { query } from '@/server/db';
import { translateToAllLanguages } from '@/server/translate';
import { addTranslations } from '@/server/room-store';

export const runtime = 'nodejs';

type TranslationRow = {
  message_id: string;
  target_language: Language;
  translated_text: string;
};

type TranslationMap = Record<string, Record<Language, string>>;

function buildTranslationMap(rows: TranslationRow[]): TranslationMap {
  const map: TranslationMap = {};
  for (const row of rows) {
    if (!map[row.message_id]) {
      map[row.message_id] = {} as Record<Language, string>;
    }
    map[row.message_id][row.target_language] = row.translated_text;
  }
  return map;
}

async function ensureTargetText(
  message: Message,
  translations: TranslationMap,
  targetLanguage: Language
): Promise<string | null> {
  if (message.originalLanguage === targetLanguage) {
    return message.originalText;
  }

  const existing = translations[message.messageId]?.[targetLanguage];
  if (existing) {
    return existing;
  }

  try {
    const newTranslations = await translateToAllLanguages(
      message.originalText,
      message.originalLanguage
    );
    await addTranslations(message.messageId, newTranslations);
    translations[message.messageId] = {
      ...(translations[message.messageId] ?? {}),
      ...newTranslations,
    };
    return newTranslations[targetLanguage] ?? null;
  } catch (error) {
    console.warn('[Review] Failed to translate for replay', {
      messageId: message.messageId,
      error,
    });
    return null;
  }
}

export async function GET(request: Request) {
  const sessionId = getSessionIdFromCookieHeader(request.headers.get('cookie'));
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const sessions = await getTodayReview(session.userId);
  return NextResponse.json({ ok: true, sessions });
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
  const startMessageId = body?.startMessageId as string | undefined;
  const endMessageId = body?.endMessageId as string | undefined;

  let messages = await getTodayConversationWindow(GLOBAL_ROOM_ID, session.userId);
  if (messages.length === 0) {
    return NextResponse.json({ ok: false, error: 'No messages today' }, { status: 400 });
  }

  if (startMessageId && endMessageId) {
    const startIdx = messages.findIndex((msg) => msg.messageId === startMessageId);
    const endIdx = messages.findIndex((msg) => msg.messageId === endMessageId);
    if (startIdx === -1 || endIdx === -1) {
      return NextResponse.json({ ok: false, error: 'Invalid message range' }, { status: 400 });
    }
    const from = Math.min(startIdx, endIdx);
    const to = Math.max(startIdx, endIdx);
    messages = messages.slice(from, to + 1);
  }

  const targetLanguage = session.learningLanguage;
  const targetLanguageName = LANGUAGE_NAMES[targetLanguage];

  const messageIds = messages.map((msg) => msg.messageId);
  let translationMap: TranslationMap = {};
  if (messageIds.length > 0) {
    const translationRows = await query<TranslationRow>(
      'select message_id, target_language, translated_text from translations where message_id = any($1::text[])',
      [messageIds]
    );
    translationMap = buildTranslationMap(translationRows.rows);
  }

  const turns: NonNullable<ReviewSession['turns']> = [];
  for (let idx = 0; idx < messages.length; idx += 1) {
    const msg = messages[idx];
    if (msg.senderUserId !== session.userId) continue;

    const expectedText = await ensureTargetText(msg, translationMap, targetLanguage);
    const turn: NonNullable<ReviewSession['turns']>[number] = {
      cue: msg.originalText,
      expectedText,
    };

    const next = messages[idx + 1];
    if (next && next.senderUserId !== session.userId) {
      const partnerMessages: NonNullable<
        NonNullable<ReviewSession['turns']>[number]['partnerMessages']
      > = [];
      let cursor = idx + 1;
      while (cursor < messages.length && messages[cursor].senderUserId !== session.userId) {
        const partnerMsg = messages[cursor];
        const partnerText = await ensureTargetText(partnerMsg, translationMap, targetLanguage);
        partnerMessages.push({
          text: partnerText ?? partnerMsg.originalText,
          username: partnerMsg.senderUsername ?? null,
        });
        cursor += 1;
      }
      if (partnerMessages.length > 0) {
        turn.partnerMessages = partnerMessages;
      }
    }

    turns.push(turn);
  }

  if (turns.length === 0) {
    return NextResponse.json({ ok: false, error: 'No user messages today' }, { status: 400 });
  }

  const sessions: ReviewSession[] = [
    {
      title: 'Role-Play Replay',
      description: `Replay today's conversation in ${targetLanguageName}.`,
      keyExpressions: turns[0]?.cue ? [turns[0].cue] : [],
      openingLine: `Replay your chat in ${targetLanguageName}.`,
      turns,
    },
  ];

  await saveTodayReview(session.userId, sessions);
  return NextResponse.json({ ok: true, sessions });
}
