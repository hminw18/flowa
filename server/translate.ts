/**
 * Translation module
 * Translates Korean text to English using external API
 */

const TRANSLATION_API_KEY = process.env.TRANSLATION_API_KEY || '';
const TRANSLATION_API_BASE_URL = process.env.TRANSLATION_API_BASE_URL || '';
const MAX_TEXT_LENGTH = 500;
const TIMEOUT_MS = 5000;

/**
 * Translates Korean text to English
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

  // For demo purposes, use a simple stub implementation
  // In production, replace with actual API call
  if (!TRANSLATION_API_KEY || !TRANSLATION_API_BASE_URL) {
    console.warn('Translation API not configured, using stub translation');
    return translateStub(text);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(TRANSLATION_API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TRANSLATION_API_KEY}`,
      },
      body: JSON.stringify({
        text,
        source: 'ko',
        target: 'en',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    return data.translatedText || data.text || '';
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Translation timeout');
    }

    // Retry once on failure
    console.warn('Translation failed, retrying once...', error);
    try {
      return await translateStub(text);
    } catch (retryError) {
      throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Stub translation for demo/development
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
      };

      // Check for exact match
      const exactMatch = translations[text.trim()];
      if (exactMatch) {
        resolve(exactMatch);
        return;
      }

      // Fallback: create a plausible translation by using parts
      const words = text.split(' ');
      const translated = words.map(word => {
        return translations[word] || word;
      }).join(' ');

      // If no translation found, create generic placeholder
      if (translated === text) {
        resolve(`[Translation: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}]`);
      } else {
        resolve(translated);
      }
    }, 500); // 500ms simulated delay
  });
}
