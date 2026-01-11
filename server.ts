/**
 * Custom Next.js server with Socket.io integration
 */

// Load environment variables from .env.local before other imports
import './server/env';

console.log('[Server] Environment variables loaded');
console.log('[Server] OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initSocketServer } from './server/socket-server';
import { enforceGlobalRoomOnly } from './server/room-store';

const dev = process.env.NODE_ENV !== 'production';
const hostname = dev ? 'localhost' : '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // Ensure only the global room exists on server start
  try {
    await enforceGlobalRoomOnly();
    console.log('[Server] Global room ready');
  } catch (error) {
    console.error('[Server] Failed to enforce global room:', error);
  }

  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Initialize Socket.io server
  initSocketServer(httpServer);
  console.log('[Server] Socket.io initialized');

  httpServer.listen(port, hostname, () => {
    console.log(`[Server] Ready on http://${hostname}:${port}`);
  });
});
