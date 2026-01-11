import { NextResponse } from 'next/server';
import { getSessionIdFromCookieHeader } from '@/server/auth';
import { getSession } from '@/server/user-store';
import { getTodayConversationWindow } from '@/server/conversation-store';
import { getOpenAIClient, getOpenAIModel } from '@/server/llm-client';
import { getSavedExpressions } from '@/server/saved-store';
import { listQuizzes, getQuizByDate, saveTodayQuiz, type QuizItem } from '@/server/quiz-store';
import { GLOBAL_ROOM_ID, LANGUAGE_NAMES, type Language } from '@/lib/types';
import { query } from '@/server/db';

export const runtime = 'nodejs';

function buildConversationPrompt(messages: Array<{ senderUsername: string; originalText: string }>) {
  return messages.map((m) => `${m.senderUsername}: ${m.originalText}`).join('\n');
}

function fallbackKeyItems(
  messages: Array<{ originalText: string }>,
  count: number
): Array<{ prompt: string; answer: string }> {
  const items: Array<{ prompt: string; answer: string }> = [];
  const slice = messages.slice(-count);
  for (const msg of slice) {
    items.push({
      prompt: msg.originalText,
      answer: msg.originalText,
    });
  }
  return items;
}

async function generateKeyItems(
  messages: Array<{ senderUsername: string; originalText: string }>,
  count: number,
  targetLanguage: Language
): Promise<Array<{ prompt: string; answer: string }>> {
  if (count <= 0) return [];
  const cleaned = messages.filter((msg) => msg.originalText.trim().length > 0);
  if (cleaned.length === 0) {
    return fallbackKeyItems(messages, count);
  }
  const client = getOpenAIClient();
  if (!client) {
    return fallbackKeyItems(cleaned, count);
  }

  const model = getOpenAIModel();
  const prompt = buildConversationPrompt(cleaned);
  const targetName = LANGUAGE_NAMES[targetLanguage];

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content:
          `Extract key expressions from the chat log and provide natural ${targetName} translations. Output strict JSON with a top-level "items" array of objects: { "prompt": "<Original>", "answer": "<${targetName}>" }. Return exactly the requested number of items.`,
      },
      {
        role: 'user',
        content: `Number of items: ${count}\n\n${prompt}`,
      },
    ],
    temperature: 1,
    reasoning_effort: 'medium',
    response_format: { type: 'json_object' },
  });

  const choice = completion.choices[0];
  const content = choice?.message?.content;
  if (!content || content.trim().length === 0) {
    console.warn('[Quiz] Empty LLM response', {
      finishReason: choice?.finish_reason,
    });
    return fallbackKeyItems(messages, count);
  }

  try {
    const parsed = JSON.parse(content);
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    if (items.length >= count) {
      return items.slice(0, count);
    }
    if (items.length > 0) {
      return [...items, ...fallbackKeyItems(messages, count - items.length)];
    }
  } catch (error) {
    return fallbackKeyItems(messages, count);
  }

  return fallbackKeyItems(messages, count);
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

  const quizzes = await listQuizzes(session.userId);
  const todayResult = await query<{ today: string }>('select current_date::text as today');
  const serverToday = todayResult.rows[0]?.today ?? null;
  return NextResponse.json({ ok: true, quizzes, serverToday });
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

  const todayResult = await query<{ today: string }>('select current_date::text as today');
  const today = todayResult.rows[0]?.today;
  if (!today) {
    return NextResponse.json({ ok: false, error: 'Failed to determine quiz date' }, { status: 500 });
  }
  const existing = await getQuizByDate(session.userId, today);
  if (existing) {
    return NextResponse.json({ ok: true, quizDate: existing.quizDate, items: existing.items });
  }

  const messages = await getTodayConversationWindow(GLOBAL_ROOM_ID, session.userId);
  if (messages.length === 0) {
    return NextResponse.json({ ok: false, error: 'No messages today' }, { status: 400 });
  }

  const savedExpressions = await getSavedExpressions(session.userId);
  const savedItems: QuizItem[] = savedExpressions.map((expr) => ({
    prompt: expr.originalText,
    answer: expr.translatedText ?? '',
    source: 'saved',
  }));

  const keyCount = savedItems.length > 3 ? 1 : Math.max(0, 3 - savedItems.length);
  const keyItemsRaw = await generateKeyItems(messages, keyCount, session.learningLanguage);
  const keyItems: QuizItem[] = keyItemsRaw.map((item) => ({
    prompt: item.prompt,
    answer: item.answer,
    source: 'key',
  }));

  const items = [...savedItems, ...keyItems];
  await saveTodayQuiz(session.userId, items);
  return NextResponse.json({ ok: true, quizDate: today, items });
}
