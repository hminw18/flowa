# CI Messenger Demo

Real-time 1:1 chat application with translation features for language learning.

## Features

- Real-time messaging using Socket.io
- Automatic Korean to English translation
- Translation toggle (show/hide)
- Auto-highlight of key expressions in translations
- Translation view metrics (KPI tracking)
- Guest sessions (no login required)

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend**: Node.js, Socket.io
- **Real-time**: WebSocket (Socket.io)
- **Translation**: OpenAI API (gpt-4o-mini)
- **Storage**: In-memory (server RAM)

## Project Structure

```
/app
  /room/[roomId]/page.tsx    # Chat room page
  page.tsx                   # Home page (room selection)
  layout.tsx                 # Root layout
  globals.css                # Global styles

/components
  ChatShell.tsx              # Main chat container
  MessageList.tsx            # Message list with auto-scroll
  MessageBubble.tsx          # Individual message bubble
  Composer.tsx               # Message input field

/lib
  socket-client.ts           # Socket.io client utility
  types.ts                   # TypeScript type definitions

/server
  socket-server.ts           # Socket.io server implementation
  room-store.ts              # In-memory room state management
  translate.ts               # Translation module
  highlight.ts               # Expression highlighting algorithm

server.js                    # Custom Next.js server entry point
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API Key (권장) - [발급 방법](./OPENAI_SETUP.md)

### Installation

1. Clone the repository

2. Install dependencies:

```bash
npm install
```

3. Configure OpenAI API (권장):

```bash
# 환경 변수 파일 생성
cp .env.local.example .env.local

# .env.local 파일을 열고 OpenAI API 키 입력
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
```

**OpenAI API 키 발급 방법**: [상세 가이드 보기](./OPENAI_SETUP.md)

**Note**: OpenAI API가 설정되지 않으면 자동으로 stub 번역(25개 문구 하드코딩)을 사용합니다. 실제 사용을 위해서는 API 설정을 권장합니다.

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Usage

1. **Create or Join Room**
   - Enter a room ID or click "Create New Room"
   - Share the room ID with others to chat

2. **Send Messages**
   - Type Korean text in the input field
   - Press Send or Enter

3. **View Translations**
   - Click "View translation" below any message
   - Translation appears with one expression highlighted
   - Click again to hide translation

4. **View Metrics**
   - Check the yellow bar at the top of the chat
   - See total messages, opened translations, and view rate

## Socket.io Events

### Client → Server

- `room:join` - Join a chat room
- `message:send` - Send a new message
- `translation:open` - Log translation view event
- `room:metrics:get` - Get room metrics

### Server → Client

- `message:new` - New message broadcast
- `message:translationReady` - Translation completed
- `message:translationError` - Translation failed
- `room:metrics:update` - Metrics updated

## Technical Requirements

### Message Model

```typescript
type Message = {
  messageId: string;         // uuid
  roomId: string;
  senderClientId: string;
  originalText: string;      // Korean
  createdAt: number;         // epoch ms
  translationStatus: "pending" | "ready" | "error";
  translatedText?: string;   // English
  highlightSpan?: { start: number; end: number };
};
```

### Highlight Algorithm

Priority order for selecting expressions to highlight:
1. 2-4 word consecutive phrase
2. Single word of length 4-12 characters
3. First 10 characters alphabetic sequence

### Rate Limiting

- 2 messages per second per client
- Excess messages are dropped

### Room Garbage Collection

- Rooms inactive for 30 minutes are automatically deleted
- GC runs every 10 minutes

## Deployment

### Recommended Platforms

Since this app uses Socket.io with long-lived connections, we recommend:

- **Railway** (가장 추천) - [배포 가이드 보기](./DEPLOYMENT.md)
- Fly.io
- Render
- DigitalOcean App Platform
- Any Node.js hosting with WebSocket support

**Note**: Vercel serverless functions have limitations with WebSocket connections. For stable Socket.io operation, use a traditional Node.js hosting platform.

### Quick Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/new)

또는 [상세 Railway 배포 가이드](./DEPLOYMENT.md)를 참고하세요.

### Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (production/development)
- `OPENAI_API_KEY` - OpenAI API key for translation (권장)
- `OPENAI_MODEL` - OpenAI model (default: gpt-4o-mini)
- `ALLOWED_ORIGIN` - CORS allowed origin (production only)

## Translation

이 앱은 **OpenAI API**를 사용하여 한국어를 영어로 번역합니다.

- **기본 모델**: gpt-4o-mini (빠르고 저렴)
- **예상 비용**: 메시지 1,000개당 약 $0.03
- **Fallback**: API 실패 시 stub 번역 자동 전환

자세한 설정 방법: [OpenAI 설정 가이드](./OPENAI_SETUP.md)

## Known Limitations (Demo Scope)

- No persistent storage - messages lost on server restart
- No authentication or user accounts
- No chat history
- No mobile native app
- Single room sessions only

## QA Acceptance Criteria

- [x] AC-1: Two browsers can join same room and chat in real-time
- [x] AC-2: Each message has collapsible translation toggle
- [x] AC-3: Translations show highlighted expression
- [x] AC-4: Metrics track unique translation views and calculate open rate

## License

This is a demo project for educational purposes.
