// Message model
export type Message = {
  messageId: string;         // uuid
  roomId: string;
  senderClientId: string;
  senderUsername: string;    // User's display name
  originalText: string;      // Korean
  createdAt: number;         // epoch ms

  translationStatus: "pending" | "ready" | "error";
  translatedText?: string;   // English
  highlightSpan?: { start: number; end: number };
};

// Room runtime state (server memory)
export type RoomState = {
  roomId: string;
  clients: Set<string>; // clientId
  messages: Message[];

  metrics: {
    totalMessages: number;
    openedMessageIds: Set<string>; // unique opened translation
    translationOpens: number;      // total opens
  };
  lastActivity: number; // for GC
};

// Socket.io event payloads
export interface ServerToClientEvents {
  "message:new": (message: Message) => void;
  "message:translationReady": (payload: {
    messageId: string;
    translatedText: string;
    highlightSpan: { start: number; end: number };
  }) => void;
  "message:translationError": (payload: { messageId: string }) => void;
  "room:metrics:update": (payload: {
    totalMessages: number;
    uniqueOpened: number;
    openRate: number;
  }) => void;
  "message:history": (messages: Message[]) => void;
}

export interface ClientToServerEvents {
  "room:join": (
    payload: { roomId: string; clientId: string; username: string },
    callback: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  "message:send": (
    payload: { roomId: string; clientId: string; username: string; originalText: string },
    callback: (response: { ok: true; message: Message } | { ok: false; error: string }) => void
  ) => void;
  "translation:open": (
    payload: { roomId: string; clientId: string; messageId: string },
    callback: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  "room:metrics:get": (
    payload: { roomId: string },
    callback: (response: {
      ok: true;
      metrics: { totalMessages: number; uniqueOpened: number; openRate: number };
    } | { ok: false; error: string }) => void
  ) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  clientId?: string;
  roomId?: string;
  username?: string;
}

// Global room ID
export const GLOBAL_ROOM_ID = 'global';
