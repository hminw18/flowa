/**
 * Multi-language translation module
 * Supports Korean, English, and Spanish translations using OpenAI API
 */

import OpenAI from 'openai';
import { Language } from '../lib/types';

const MAX_TEXT_LENGTH = 500;
const TIMEOUT_MS = 15000;

let openai: OpenAI | null = null;
let configLogged = false;

const LANGUAGE_FULL_NAMES: Record<Language, string> = {
  ko: 'Korean',
  en: 'English',
  es: 'Spanish',
};

/**
 * Initialize OpenAI client
 */
function getOpenAIClient(): OpenAI | null {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
  const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (!configLogged) {
    console.log('=== OpenAI Configuration ===');
    console.log('API Key exists:', !!OPENAI_API_KEY);
    console.log('Model:', OPENAI_MODEL);
    console.log('===========================');
    configLogged = true;
  }

  if (!OPENAI_API_KEY) {
    return null;
  }

  if (!openai) {
    openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
  }

  return openai;
}

/**
 * Translate text to all supported languages
 * @param text Original text
 * @param sourceLanguage Language of the original text
 * @returns Object with translations for each target language
 */
export async function translateToAllLanguages(
  text: string,
  sourceLanguage: Language
): Promise<Record<Language, string>> {
  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error(`Text too long (max ${MAX_TEXT_LENGTH} characters)`);
  }

  if (!text.trim()) {
    throw new Error('Empty text provided');
  }

  const targetLanguages: Language[] = ['ko', 'en', 'es'].filter(
    (lang) => lang !== sourceLanguage
  ) as Language[];

  const translations: Record<Language, string> = {
    [sourceLanguage]: text, // Original text
  } as Record<Language, string>;

  const client = getOpenAIClient();

  // If OpenAI not configured, use stub
  if (!client) {
    console.warn('[Translation] OpenAI not configured, using stub translations');
    for (const targetLang of targetLanguages) {
      translations[targetLang] = await translateStub(text, sourceLanguage, targetLang);
    }
    return translations;
  }

  // Translate to all target languages in parallel
  const translationPromises = targetLanguages.map(async (targetLang) => {
    try {
      const translated = await translateWithOpenAI(client, text, sourceLanguage, targetLang);
      return { targetLang, translated };
    } catch (error) {
      console.error(`[Translation] Failed ${sourceLanguage}->${targetLang}:`, error);
      const fallback = await translateStub(text, sourceLanguage, targetLang);
      return { targetLang, translated: fallback };
    }
  });

  const results = await Promise.all(translationPromises);

  for (const { targetLang, translated } of results) {
    translations[targetLang] = translated;
  }

  return translations;
}

/**
 * Translate using OpenAI API
 */
async function translateWithOpenAI(
  client: OpenAI,
  text: string,
  sourceLang: Language,
  targetLang: Language
): Promise<string> {
  const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const sourceName = LANGUAGE_FULL_NAMES[sourceLang];
  const targetName = LANGUAGE_FULL_NAMES[targetLang];

  const normalized = text.trim().replace(/\s+/g, ' ');
  console.log(`[Translation] ${sourceLang}->${targetLang}: "${normalized.substring(0, 50)}..."`);

  const runTranslation = async () => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Translation timeout')), TIMEOUT_MS);
    });

    const translationPromise = client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a native ${targetName} speaker. Translate the given ${sourceName} text into natural, colloquial ${targetName} that real locals would actually say.
Rules:
- Preserve the original meaning and tone
- Prefer common, everyday phrasing over textbook-style wording
- Output ONLY the translated text, no explanations or additional text`,
        },
        {
          role: 'user',
          content: normalized,
        },
      ],
      temperature: 1,
      reasoning_effort: 'medium',
    });

    const completion = await Promise.race([translationPromise, timeoutPromise]);
    const choice = completion.choices[0];
    const translatedText = choice?.message?.content?.trim();

    return { translatedText, choice, usage: completion.usage };
  };

  const primary = await runTranslation();
  console.log('[Translation] Usage (primary)', {
    model: OPENAI_MODEL,
    inputLength: normalized.length,
    finishReason: primary.choice?.finish_reason,
    usage: primary.usage,
  });
  if (!primary.translatedText) {
    console.warn('[Translation] Empty response (primary)', {
      model: OPENAI_MODEL,
      inputLength: normalized.length,
      finishReason: primary.choice?.finish_reason,
      usage: primary.usage,
    });

    const retry = await runTranslation();
    console.log('[Translation] Usage (retry)', {
      model: OPENAI_MODEL,
      inputLength: normalized.length,
      finishReason: retry.choice?.finish_reason,
      usage: retry.usage,
    });
    if (!retry.translatedText) {
      console.warn('[Translation] Empty response (retry)', {
        model: OPENAI_MODEL,
        inputLength: normalized.length,
        finishReason: retry.choice?.finish_reason,
        usage: retry.usage,
      });
      throw new Error('Empty response from OpenAI');
    }

    console.log(`[Translation] ${sourceLang}->${targetLang}: Success (retry)`);
    return retry.translatedText;
  }

  console.log(`[Translation] ${sourceLang}->${targetLang}: Success`);
  return primary.translatedText;
}

/**
 * Stub translation for demo/fallback
 */
async function translateStub(
  text: string,
  sourceLang: Language,
  targetLang: Language
): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Simple phrase translations
  const phrases: Record<string, Record<Language, string>> = {
    // Korean phrases
    '안녕하세요': { ko: '안녕하세요', en: 'Hello', es: 'Hola' },
    '안녕': { ko: '안녕', en: 'Hi', es: 'Hola' },
    '감사합니다': { ko: '감사합니다', en: 'Thank you', es: 'Gracias' },
    '좋은 아침입니다': { ko: '좋은 아침입니다', en: 'Good morning', es: 'Buenos días' },
    '만나서 반갑습니다': { ko: '만나서 반갑습니다', en: 'Nice to meet you', es: 'Encantado de conocerte' },

    // English phrases
    Hello: { ko: '안녕하세요', en: 'Hello', es: 'Hola' },
    'Thank you': { ko: '감사합니다', en: 'Thank you', es: 'Gracias' },
    'Good morning': { ko: '좋은 아침입니다', en: 'Good morning', es: 'Buenos días' },
    'Nice to meet you': { ko: '만나서 반갑습니다', en: 'Nice to meet you', es: 'Encantado de conocerte' },

    // Spanish phrases
    Hola: { ko: '안녕하세요', en: 'Hello', es: 'Hola' },
    Gracias: { ko: '감사합니다', en: 'Thank you', es: 'Gracias' },
    'Buenos días': { ko: '좋은 아침입니다', en: 'Good morning', es: 'Buenos días' },
  };

  const exactMatch = phrases[text.trim()];
  if (exactMatch && exactMatch[targetLang]) {
    return exactMatch[targetLang];
  }

  // Fallback: generic placeholder
  return `[${LANGUAGE_FULL_NAMES[targetLang]}: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}]`;
}
