import { NextResponse } from 'next/server';
import { getSessionIdFromCookieHeader } from '@/server/auth';
import { getSession } from '@/server/user-store';
import { getQuizByDate } from '@/server/quiz-store';
import { getOpenAIClient, getOpenAIModel } from '@/server/llm-client';
import { LANGUAGE_NAMES } from '@/lib/types';

export const runtime = 'nodejs';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeDateParam(value: string) {
  if (!value) return null;
  const trimmed = value.trim();
  if (DATE_RE.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

export async function POST(request: Request, context: { params: { date: string } }) {
  const sessionId = getSessionIdFromCookieHeader(request.headers.get('cookie'));
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const date = normalizeDateParam(context.params.date);
  if (!date) {
    return NextResponse.json({ ok: false, error: 'Invalid date' }, { status: 400 });
  }

  const quiz = await getQuizByDate(session.userId, date);
  if (!quiz) {
    return NextResponse.json({ ok: false, error: 'Quiz not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const index = typeof body?.index === 'number' ? body.index : -1;
  const userAnswer = typeof body?.userAnswer === 'string' ? body.userAnswer.trim() : '';

  if (index < 0 || index >= quiz.items.length) {
    return NextResponse.json({ ok: false, error: 'Invalid index' }, { status: 400 });
  }
  if (!userAnswer) {
    return NextResponse.json({ ok: false, error: 'Answer required' }, { status: 400 });
  }

  const item = quiz.items[index];
  const targetName = LANGUAGE_NAMES[session.learningLanguage] ?? 'English';
  const nativeName = LANGUAGE_NAMES[session.nativeLanguage] ?? 'English';

  const client = getOpenAIClient();
  if (!client) {
    return NextResponse.json({ ok: false, error: 'OpenAI not configured' }, { status: 500 });
  }

  const model = getOpenAIModel();
  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You evaluate learner answers in ${targetName}. Determine if the user's answer conveys the same meaning as the expected answer.
Return strict JSON: {"correct": boolean, "feedback": string, "suggestion": string}
Rules:
- If meaning is equivalent, correct = true.
- feedback must be in ${nativeName}, friendly coach tone.
- If correct, feedback should be short praise in ${nativeName}.
- If incorrect, feedback should be a hint in ${nativeName} WITHOUT giving the correct answer.
- suggestion must be a more natural, local ${targetName} phrasing only when correct. Otherwise "".
- Do not include any text outside JSON.`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          prompt: item.prompt,
          expected: item.answer,
          userAnswer,
        }),
      },
    ],
    temperature: 1,
    reasoning_effort: 'medium',
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    return NextResponse.json({ ok: false, error: 'Empty response from OpenAI' }, { status: 500 });
  }

  try {
    const parsed = JSON.parse(content);
    const correct = Boolean(parsed.correct);
    const feedback = typeof parsed.feedback === 'string' ? parsed.feedback.trim() : '';
    const suggestion = typeof parsed.suggestion === 'string' ? parsed.suggestion.trim() : '';
    if (!feedback) {
      return NextResponse.json({ ok: false, error: 'Invalid response from OpenAI' }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      correct,
      feedback,
      suggestion: correct ? suggestion : '',
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid response from OpenAI' }, { status: 500 });
  }
}
