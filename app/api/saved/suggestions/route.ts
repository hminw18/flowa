import { NextResponse } from 'next/server';
import { getSessionIdFromCookieHeader } from '@/server/auth';
import { getSession } from '@/server/user-store';
import { getTodayConversationWindow } from '@/server/conversation-store';
import { getOpenAIClient, getOpenAIModel } from '@/server/llm-client';
import { GLOBAL_ROOM_ID } from '@/lib/types';

export const runtime = 'nodejs';

type SuggestionItem = {
  messageId: string;
  text: string;
  senderUsername: string | null;
};

function fallbackSuggestions(messages: Array<{ messageId: string; originalText: string; senderUsername: string }>) {
  const picked = messages
    .filter((msg) => msg.originalText.trim().length > 0)
    .slice(-3)
    .reverse();
  return picked.map((msg) => ({
    messageId: msg.messageId,
    text: msg.originalText,
    senderUsername: msg.senderUsername ?? null,
  }));
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

  const messages = await getTodayConversationWindow(GLOBAL_ROOM_ID, session.userId);
  if (messages.length === 0) {
    return NextResponse.json({ ok: false, error: 'No messages today' }, { status: 400 });
  }

  const client = getOpenAIClient();
  if (!client) {
    return NextResponse.json({ ok: true, items: fallbackSuggestions(messages) });
  }

  const model = getOpenAIModel();
  const lines = messages
    .filter((msg) => msg.originalText.trim().length > 0)
    .map((msg) => `${msg.messageId} | ${msg.senderUsername}: ${msg.originalText}`)
    .join('\n');

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content:
          'Select exactly 3 key expressions from the chat log that are worth saving for language learning. Return strict JSON: {"messageIds": ["id1","id2","id3"]}. Only pick from the provided IDs.',
      },
      {
        role: 'user',
        content: lines,
      },
    ],
    temperature: 1,
    reasoning_effort: 'medium',
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    return NextResponse.json({ ok: true, items: fallbackSuggestions(messages) });
  }

  try {
    const parsed = JSON.parse(content);
    const ids = Array.isArray(parsed.messageIds) ? parsed.messageIds : [];
    const idSet = new Set<string>();
    const items: SuggestionItem[] = [];
    for (const id of ids) {
      if (typeof id !== 'string' || idSet.has(id)) continue;
      const msg = messages.find((m) => m.messageId === id);
      if (!msg) continue;
      idSet.add(id);
      items.push({
        messageId: msg.messageId,
        text: msg.originalText,
        senderUsername: msg.senderUsername ?? null,
      });
    }

    if (items.length > 0) {
      return NextResponse.json({ ok: true, items: items.slice(0, 3) });
    }
  } catch (error) {
    console.warn('[Saved] Failed to parse suggestions', { error });
  }

  return NextResponse.json({ ok: true, items: fallbackSuggestions(messages) });
}
