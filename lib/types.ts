// Supported languages
export type Language = 'ko' | 'en' | 'es';

export const LANGUAGE_NAMES: Record<Language, string> = {
  ko: 'Korean',
  en: 'English',
  es: 'Spanish',
};

export const LANGUAGE_FLAGS: Record<Language, string> = {
  ko: '🇰🇷',
  en: '🇺🇸',
  es: '🇪🇸',
};

// Message model
export type Message = {
  messageId: string;         // uuid
  roomId: string;
  senderUserId: string;
  senderUsername: string;    // User's display name
  originalText: string;      // Original message text
  originalLanguage: Language; // Language of original text
  createdAt: number;         // epoch ms

  translations?: Record<Language, string>; // All available translations
  unreadCount?: number;
};

export type RoomSummary = {
  roomId: string;
  roomType: 'direct' | 'group';
  name?: string | null;
  directUser?: { userId: string; username: string } | null;
  lastMessage?: Message | null;
  unreadCount: number;
};

// Socket.io event payloads
export interface ServerToClientEvents {
  "message:new": (message: Message) => void;
  "message:translationsReady": (payload: {
    messageId: string;
    translations: Record<Language, string>;
  }) => void;
  "message:readUpdate": (payload: { updates: Array<{ messageId: string; unreadCount: number }> }) => void;
  "message:history": (messages: Message[]) => void;
}

export interface ClientToServerEvents {
  "room:join": (
    payload: { roomId: string },
    callback: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  "message:send": (
    payload: { roomId: string; originalText: string },
    callback: (response: { ok: true; message: Message } | { ok: false; error: string }) => void
  ) => void;
  "room:read": (
    payload: { roomId: string },
    callback: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  roomId?: string;
  userId?: string;
  username?: string;
  sessionId?: string;
  nativeLanguage?: Language;
  learningLanguage?: Language;
}

// Global room ID
export const GLOBAL_ROOM_ID = 'global';
