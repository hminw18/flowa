import { NextResponse } from 'next/server';
import { getSessionIdFromCookieHeader } from '@/server/auth';
import { getSession } from '@/server/user-store';
import { getQuizByDate, saveQuizResponses, type QuizResponse } from '@/server/quiz-store';
import { query } from '@/server/db';
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

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isCorrect(expected: string, userAnswer: string) {
  const expectedNorm = normalize(expected);
  const userNorm = normalize(userAnswer);
  if (!expectedNorm) return false;
  return userNorm.includes(expectedNorm);
}

async function evaluateWithLLM(
  items: Array<{ prompt: string; answer: string; userAnswer: string }>,
  targetLanguageName: string
) {
  const client = getOpenAIClient();
  if (!client) return null;

  const model = getOpenAIModel();
  const payload = items.map((item, index) => ({
    index,
    prompt: item.prompt,
    expected: item.answer,
    userAnswer: item.userAnswer,
  }));

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a strict but fair language evaluator. Determine if each learner answer conveys the same meaning as the expected answer.
Return strict JSON: {"results":[{"index":number,"correct":boolean,"suggestion":string}]}
Rules:
- Mark correct if meaning is equivalent, even with minor grammar issues.
- suggestion must be a more natural, local ${targetLanguageName} version if improvement is possible.
- If no better phrasing is needed, set suggestion to "".
- Do not include any text outside JSON.`,
      },
      {
        role: 'user',
        content: JSON.stringify(payload),
      },
    ],
    temperature: 1,
    reasoning_effort: 'medium',
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) return null;

  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.results)) return null;
    const map = new Map<number, { correct: boolean; suggestion: string }>();
    for (const row of parsed.results) {
      if (typeof row?.index !== 'number') continue;
      map.set(row.index, {
        correct: Boolean(row.correct),
        suggestion: typeof row.suggestion === 'string' ? row.suggestion.trim() : '',
      });
    }
    return map;
  } catch {
    return null;
  }
}

export async function GET(request: Request, context: { params: { date: string } }) {
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

  return NextResponse.json({
    ok: true,
    quiz: {
      quizDate: quiz.quizDate,
      createdAt: quiz.createdAt,
      completedAt: quiz.completedAt,
      score: quiz.score,
      items: quiz.items,
      responses: quiz.responses ?? [],
    },
  });
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
  if (quiz.completedAt) {
    return NextResponse.json({ ok: false, error: 'Quiz already completed' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const providedResponses = Array.isArray(body?.responses) ? body.responses : null;
  if (providedResponses) {
    if (providedResponses.length !== quiz.items.length) {
      return NextResponse.json({ ok: false, error: 'Invalid responses' }, { status: 400 });
    }
    const responses: QuizResponse[] = quiz.items.map((item, idx) => {
      const incoming = providedResponses[idx] || {};
      return {
        ...item,
        userAnswer: typeof incoming.userAnswer === 'string' ? incoming.userAnswer : '',
        correct: Boolean(incoming.correct),
        suggestion: typeof incoming.suggestion === 'string' ? incoming.suggestion : undefined,
        firstAnswer: typeof incoming.firstAnswer === 'string' ? incoming.firstAnswer : undefined,
        finalAnswer: typeof incoming.finalAnswer === 'string' ? incoming.finalAnswer : undefined,
        correctOnFirst: typeof incoming.correctOnFirst === 'boolean' ? incoming.correctOnFirst : undefined,
      };
    });
    const score = responses.filter((res) => res.correct).length;
    await saveQuizResponses(session.userId, date, responses, score);
    return NextResponse.json({ ok: true, score, responses });
  }

  const userAnswers = Array.isArray(body?.answers) ? body.answers : null;
  if (!userAnswers || userAnswers.length !== quiz.items.length) {
    return NextResponse.json({ ok: false, error: 'Invalid answers' }, { status: 400 });
  }

  const normalizedAnswers = quiz.items.map((item, idx) => ({
    prompt: item.prompt,
    answer: item.answer || '',
    userAnswer: typeof userAnswers[idx] === 'string' ? userAnswers[idx].trim() : '',
  }));
  const languageName = LANGUAGE_NAMES[session.learningLanguage] ?? 'English';
  const llmResults = await evaluateWithLLM(normalizedAnswers, languageName);

  const responses: QuizResponse[] = quiz.items.map((item, idx) => {
    const userAnswer = normalizedAnswers[idx].userAnswer;
    const llm = llmResults?.get(idx);
    const correct = llm ? llm.correct : isCorrect(item.answer || '', userAnswer);
    const suggestion = llm?.suggestion || '';
    return {
      ...item,
      userAnswer,
      correct,
      suggestion: suggestion || undefined,
    };
  });

  const score = responses.filter((res) => res.correct).length;
  await saveQuizResponses(session.userId, date, responses, score);

  return NextResponse.json({ ok: true, score, responses });
}

export async function DELETE(request: Request, context: { params: { date: string } }) {
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

  await query('delete from daily_quizzes where user_id = $1 and quiz_date = $2', [
    session.userId,
    date,
  ]);

  return NextResponse.json({ ok: true });
}
