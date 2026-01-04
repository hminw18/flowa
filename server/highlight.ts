/**
 * Highlight algorithm
 * Selects one expression from English translated text to highlight
 */

/**
 * Selects a highlight span from translated English text
 * Priority:
 * 1. 2-4 word consecutive phrase
 * 2. Single word of length 4-12
 * 3. First 10 chars alphabetic sequence
 *
 * @param translatedText English text
 * @returns Highlight span with start/end indices (UTF-16 code units)
 */
export function selectHighlight(translatedText: string): { start: number; end: number } {
  if (!translatedText.trim()) {
    return { start: 0, end: 0 };
  }

  // Tokenize by whitespace
  const tokens = translatedText.split(/\s+/).filter(t => t.length > 0);

  if (tokens.length === 0) {
    return { start: 0, end: Math.min(10, translatedText.length) };
  }

  // Priority 1: Find 2-4 word phrase
  if (tokens.length >= 2) {
    const phraseLength = tokens.length >= 6 ? 3 : Math.min(tokens.length, 4);
    const startTokenIndex = tokens.length >= 6
      ? Math.floor((tokens.length - phraseLength) / 2) // middle
      : 0; // from start

    const selectedTokens = tokens.slice(startTokenIndex, startTokenIndex + phraseLength);
    const phrase = selectedTokens.join(' ');

    // Find phrase position in original text
    const phraseStart = translatedText.indexOf(phrase);
    if (phraseStart !== -1) {
      return {
        start: phraseStart,
        end: phraseStart + phrase.length,
      };
    }
  }

  // Priority 2: Single word of length 4-12
  const goodWords = tokens.filter(t => {
    const cleaned = t.replace(/[^a-zA-Z]/g, '');
    return cleaned.length >= 4 && cleaned.length <= 12;
  });

  if (goodWords.length > 0) {
    // Pick middle word or first
    const targetWord = goodWords[Math.floor(goodWords.length / 2)];
    const wordStart = translatedText.indexOf(targetWord);
    if (wordStart !== -1) {
      return {
        start: wordStart,
        end: wordStart + targetWord.length,
      };
    }
  }

  // Priority 3: First alphabetic sequence in first 10 chars
  const first10 = translatedText.substring(0, Math.min(10, translatedText.length));
  const alphaMatch = first10.match(/[a-zA-Z]+/);

  if (alphaMatch && alphaMatch.index !== undefined) {
    const matchStart = alphaMatch.index;
    const matchText = alphaMatch[0];
    return {
      start: matchStart,
      end: matchStart + matchText.length,
    };
  }

  // Fallback: highlight first word
  const firstWord = tokens[0];
  const firstWordStart = translatedText.indexOf(firstWord);
  if (firstWordStart !== -1) {
    return {
      start: firstWordStart,
      end: firstWordStart + firstWord.length,
    };
  }

  // Last resort: first 5 characters
  return { start: 0, end: Math.min(5, translatedText.length) };
}
