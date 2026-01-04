/**
 * Translation module
 * Translates Korean text to English using OpenAI API
 */

import OpenAI from 'openai';

const MAX_TEXT_LENGTH = 500;
const TIMEOUT_MS = 10000;

let openai: OpenAI | null = null;
let configLogged = false;

/**
 * Initialize OpenAI client
 */
function getOpenAIClient(): OpenAI | null {
  // Read env vars at runtime (lazy evaluation)
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
  const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  // Log configuration once
  if (!configLogged) {
    console.log('=== OpenAI Configuration (Runtime) ===');
    console.log('OPENAI_API_KEY exists:', !!OPENAI_API_KEY);
    console.log('OPENAI_API_KEY length:', OPENAI_API_KEY.length);
    console.log('OPENAI_API_KEY preview:', OPENAI_API_KEY ? `${OPENAI_API_KEY.substring(0, 10)}...${OPENAI_API_KEY.substring(OPENAI_API_KEY.length - 4)}` : 'NOT SET');
    console.log('OPENAI_MODEL:', OPENAI_MODEL);
    console.log('All env vars with OPENAI prefix:', Object.keys(process.env).filter(k => k.startsWith('OPENAI')));
    console.log('======================================');
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
 * Translates Korean text to English using OpenAI
 * @param text Korean text to translate
 * @returns English translation
 * @throws Error if translation fails
 */
export async function translateKoToEn(text: string): Promise<string> {
  // Validate input length
  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error(`Text too long (max ${MAX_TEXT_LENGTH} characters)`);
  }

  if (!text.trim()) {
    throw new Error('Empty text provided');
  }

  const client = getOpenAIClient();

  // If OpenAI is not configured, use stub
  if (!client) {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
    console.warn('[Translation] OpenAI API not configured, using stub translation');
    console.warn('[Translation] Reason: OPENAI_API_KEY is', OPENAI_API_KEY ? 'set but invalid' : 'NOT SET');
    console.warn('[Translation] Check your .env.local file or environment variables');
    return translateStub(text);
  }

  const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  console.log('[Translation] Using OpenAI API with model:', OPENAI_MODEL);

  try {
    // Create translation request with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Translation timeout')), TIMEOUT_MS);
    });

    const reasoning =
      OPENAI_MODEL.startsWith('o') || OPENAI_MODEL.startsWith('gpt-5')
        ? { effort: 'low' as const }
        : undefined;

    const translationPromise = client.responses.create({
      model: OPENAI_MODEL,
      instructions: `You are a Korean to English translator. Translate the given Korean text to natural English.
Rules:
- Provide direct, literal translation
- Maintain the original tone and meaning
- Output only the translated text, no explanations
- Keep the same sentence structure when possible`,
      input: text,
      max_output_tokens: 400,
      reasoning,
      text: { format: { type: 'text' } },
    });

    const completion = await Promise.race([translationPromise, timeoutPromise]);

    const translatedText =
      completion.output_text?.trim() ||
      completion.output
        ?.flatMap((item) => (item.type === 'message' ? item.content : []))
        .filter((content) => content.type === 'output_text')
        .map((content) => content.text)
        .join('')
        .trim();

    if (!translatedText) {
      console.warn('[Translation] Empty output_text', {
        id: completion.id,
        outputItems: completion.output?.length ?? 0,
      });
      console.warn(
        '[Translation] Output summary',
        completion.output?.map((item) => ({
          type: item.type,
          contentTypes: item.type === 'message' ? item.content.map((content) => content.type) : undefined,
          contentLengths:
            item.type === 'message'
              ? item.content.map((content) =>
                  'text' in content && typeof content.text === 'string' ? content.text.length : 0
                )
              : undefined,
        }))
      );
      throw new Error('Empty response from OpenAI');
    }

    return translatedText;
  } catch (error) {
    console.error('[Translation] OpenAI error:', error);

    if (error instanceof Error) {
      console.error('[Translation] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n'),
      });
    }

    // Fallback to stub on error
    if (error instanceof Error && error.message === 'Translation timeout') {
      console.warn('[Translation] Timeout (>10s), falling back to stub');
    } else {
      console.warn('[Translation] API error, falling back to stub');
      console.warn('[Translation] Possible reasons: Invalid API key, network issue, rate limit');
    }

    return translateStub(text);
  }
}

/**
 * Stub translation for demo/development/fallback
 * Uses simple word-by-word mapping with common phrases
 */
function translateStub(text: string): Promise<string> {
  return new Promise((resolve) => {
    // Simulate API delay
    setTimeout(() => {
      // Simple Korean->English mapping for common phrases
      const translations: Record<string, string> = {
        '안녕하세요': 'Hello',
        '안녕': 'Hi',
        '고맙습니다': 'Thank you',
        '감사합니다': 'Thank you very much',
        '좋은 아침입니다': 'Good morning',
        '좋은 밤 되세요': 'Good night',
        '어떻게 지내세요?': 'How are you doing?',
        '잘 지내요': 'I am doing well',
        '만나서 반갑습니다': 'Nice to meet you',
        '오늘 날씨가 좋네요': 'The weather is nice today',
        '뭐 하고 있어요?': 'What are you doing?',
        '영어 공부하고 있어요': 'I am studying English',
        '도와주세요': 'Please help me',
        '이해했어요': 'I understood',
        '모르겠어요': 'I do not know',
        '다시 말씀해 주세요': 'Please say that again',
        '오늘 뭐 먹었어요?': 'What did you eat today?',
        '점심 먹었어요': 'I ate lunch',
        '배고파요': 'I am hungry',
        '피곤해요': 'I am tired',
        '행복해요': 'I am happy',
        '슬퍼요': 'I am sad',
        '괜찮아요': 'I am okay',
        '미안해요': 'I am sorry',
        '사랑해요': 'I love you',
      };

      // Check for exact match
      const exactMatch = translations[text.trim()];
      if (exactMatch) {
        resolve(exactMatch);
        return;
      }

      // Fallback: create a plausible translation by using parts
      const words = text.split(' ');
      const translated = words
        .map((word) => {
          return translations[word] || word;
        })
        .join(' ');

      // If no translation found, create generic placeholder
      if (translated === text) {
        resolve(`[Translation: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}]`);
      } else {
        resolve(translated);
      }
    }, 500); // 500ms simulated delay
  });
}
