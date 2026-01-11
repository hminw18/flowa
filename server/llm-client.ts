import OpenAI from 'openai';

let openai: OpenAI | null = null;
let configLogged = false;

export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY || '';

  if (!configLogged) {
    console.log('[LLM] OpenAI key exists:', !!apiKey);
    configLogged = true;
  }

  if (!apiKey) {
    return null;
  }

  if (!openai) {
    openai = new OpenAI({ apiKey });
  }

  return openai;
}

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o-mini';
}
