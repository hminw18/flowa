import { NextResponse } from 'next/server';
import { getSessionIdFromCookieHeader } from '@/server/auth';
import { getSession } from '@/server/user-store';
import { getOpenAIClient, getOpenAIModel } from '@/server/llm-client';
import { LANGUAGE_NAMES, type Language } from '@/lib/types';

export const runtime = 'nodejs';

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
  const cue = body?.cue as string | undefined;
  const expectedText = body?.expectedText as string | null | undefined;
  const expectedEnglish = body?.expectedEnglish as string | null | undefined;
  const userResponse = body?.userResponse as string | undefined;
  const contextText = body?.contextText as string | null | undefined;
  const contextEnglish = body?.contextEnglish as string | null | undefined;
  const targetLanguage = body?.targetLanguage as Language | undefined;
  const nativeLanguage = body?.nativeLanguage as Language | undefined;

  if (!cue || !userResponse) {
    return NextResponse.json({ ok: false, error: 'Missing cue or user response' }, { status: 400 });
  }

  const client = getOpenAIClient();
  if (!client) {
    return NextResponse.json({ ok: false, error: 'OpenAI not configured' }, { status: 500 });
  }

  const languageName = targetLanguage ? LANGUAGE_NAMES[targetLanguage] : 'English';
  const nativeLanguageName = nativeLanguage ? LANGUAGE_NAMES[nativeLanguage] : 'English';
  const expectedOutput = expectedText ?? expectedEnglish ?? null;
  const contextLine = contextText ?? contextEnglish ?? null;

  const systemPrompt = `You are a ${languageName} coach. Evaluate whether the learner's response conveys the meaning of the native cue and sounds natural in ${languageName}.
Return strict JSON: {"pass": boolean, "feedback": string, "suggestion": string}
Rules:
- Pass if meaning is conveyed even with minor grammar issues.
- If pass is false, feedback should say what is missing or incorrect in 1-2 sentences in ${nativeLanguageName}.
- If pass is true, feedback should be a short positive confirmation (1 sentence) in ${nativeLanguageName}.
- If you can improve the phrasing for more natural, local usage, put that in "suggestion" in ${languageName}. Otherwise set suggestion to "".
- Do not include anything outside JSON.`;

  const model = getOpenAIModel();
  const userPrompt = [
    `Native cue: ${cue}`,
    expectedOutput
      ? `Expected ${languageName}: ${expectedOutput}`
      : `Expected ${languageName}: (not provided)`,
    contextLine ? `Context (previous partner line): ${contextLine}` : null,
    `Learner response (${languageName}): ${userResponse}`,
  ]
    .filter(Boolean)
    .join('\n');

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 1,
    reasoning_effort: 'medium',
    response_format: { type: 'json_object' },
  });

  const choice = completion.choices[0];
  const content = choice?.message?.content?.trim();
  if (!content) {
    console.warn('[Roleplay] Empty evaluation', {
      finishReason: choice?.finish_reason,
      usage: completion.usage,
    });
    return NextResponse.json({ ok: false, error: 'Empty response from OpenAI' }, { status: 500 });
  }

  try {
    const parsed = JSON.parse(content);
    const pass = Boolean(parsed.pass);
    const feedback = typeof parsed.feedback === 'string' ? parsed.feedback.trim() : '';
    const suggestion = typeof parsed.suggestion === 'string' ? parsed.suggestion.trim() : '';
    if (!feedback) {
      return NextResponse.json({ ok: false, error: 'Invalid response from OpenAI' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, pass, feedback, suggestion });
  } catch (error) {
    console.warn('[Roleplay] Failed to parse evaluation', { error, content });
    return NextResponse.json({ ok: false, error: 'Invalid response from OpenAI' }, { status: 500 });
  }
}
