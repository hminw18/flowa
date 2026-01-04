'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket, getOrCreateClientId } from '@/lib/socket-client';
import { Message } from '@/lib/types';
import MessageList from '@/components/MessageList';
import Composer from '@/components/Composer';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [clientId] = useState(() => getOrCreateClientId());
  const [username, setUsername] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [metrics, setMetrics] = useState({ totalMessages: 0, uniqueOpened: 0, openRate: 0 });

  // Check if username exists
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedUsername = sessionStorage.getItem('ci_messenger_username');
    if (!savedUsername) {
      router.push('/');
      return;
    }

    setUsername(savedUsername);
  }, [router]);

  // Initialize socket connection and join room
  useEffect(() => {
    if (!username) return;
    const socket = getSocket();

    // Connection event handlers
    const handleConnect = () => {
      console.log('[Room] Socket connected');
      setConnectionStatus('connected');

      // Join room
      socket.emit('room:join', { roomId, clientId, username }, (response) => {
        if (response.ok) {
          console.log('[Room] Joined successfully');
        } else {
          console.error('[Room] Join failed:', response.error);
          setConnectionStatus('error');
        }
      });
    };

    const handleDisconnect = () => {
      console.log('[Room] Socket disconnected');
      setConnectionStatus('disconnected');
    };

    const handleConnectError = () => {
      console.error('[Room] Connection error');
      setConnectionStatus('error');
    };

    // Message event handlers
    const handleNewMessage = (message: Message) => {
      console.log('[Room] New message:', message);
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some(m => m.messageId === message.messageId)) {
          return prev;
        }
        return [...prev, message].sort((a, b) => a.createdAt - b.createdAt);
      });
    };

    const handleTranslationReady = (payload: {
      messageId: string;
      translatedText: string;
      highlightSpan: { start: number; end: number };
    }) => {
      console.log('[Room] Translation ready:', payload);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.messageId === payload.messageId
            ? {
                ...msg,
                translationStatus: 'ready' as const,
                translatedText: payload.translatedText,
                highlightSpan: payload.highlightSpan,
              }
            : msg
        )
      );
    };

    const handleTranslationError = (payload: { messageId: string }) => {
      console.log('[Room] Translation error:', payload);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.messageId === payload.messageId
            ? { ...msg, translationStatus: 'error' as const }
            : msg
        )
      );
    };

    const handleMetricsUpdate = (payload: {
      totalMessages: number;
      uniqueOpened: number;
      openRate: number;
    }) => {
      console.log('[Room] Metrics update:', payload);
      setMetrics(payload);
    };

    // Attach listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('message:new', handleNewMessage);
    socket.on('message:translationReady', handleTranslationReady);
    socket.on('message:translationError', handleTranslationError);
    socket.on('room:metrics:update', handleMetricsUpdate);

    // If already connected, join immediately
    if (socket.connected) {
      handleConnect();
    }

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('message:new', handleNewMessage);
      socket.off('message:translationReady', handleTranslationReady);
      socket.off('message:translationError', handleTranslationError);
      socket.off('room:metrics:update', handleMetricsUpdate);
    };
  }, [roomId, clientId, username]);

  // Send message handler
  const handleSendMessage = useCallback(
    (text: string) => {
      const socket = getSocket();

      socket.emit('message:send', { roomId, clientId, username, originalText: text }, (response) => {
        if (response.ok) {
          console.log('[Room] Message sent:', response.message);
        } else {
          console.error('[Room] Send failed:', response.error);
          alert(`Failed to send message: ${response.error}`);
        }
      });
    },
    [roomId, clientId]
  );

  // Translation open handler
  const handleTranslationOpen = useCallback(
    (messageId: string) => {
      const socket = getSocket();

      socket.emit('translation:open', { roomId, clientId, messageId }, (response) => {
        if (!response.ok) {
          console.error('[Room] Translation open event failed:', response.error);
        }
      });
    },
    [roomId, clientId]
  );

  // Fetch metrics on mount
  useEffect(() => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('room:metrics:get', { roomId }, (response) => {
        if (response.ok) {
          setMetrics(response.metrics);
        }
      });
    }
  }, [roomId]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => router.push('/')} style={styles.backButton}>
          ← Back
        </button>
        <div style={styles.headerContent}>
          <h2 style={styles.roomTitle}>Room: {roomId}</h2>
          <div style={styles.statusBadge}>
            {connectionStatus === 'connecting' && '🟡 Connecting...'}
            {connectionStatus === 'connected' && '🟢 Connected'}
            {connectionStatus === 'disconnected' && '🔴 Disconnected'}
            {connectionStatus === 'error' && '🔴 Error'}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div style={styles.metrics}>
        <span>Total: {metrics.totalMessages}</span>
        <span>Opened: {metrics.uniqueOpened}</span>
        <span>Rate: {(metrics.openRate * 100).toFixed(1)}%</span>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        currentClientId={clientId}
        onTranslationOpen={handleTranslationOpen}
      />

      {/* Composer */}
      <Composer
        onSend={handleSendMessage}
        disabled={connectionStatus !== 'connected'}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#f5f5f5',
  },
  header: {
    background: 'white',
    borderBottom: '1px solid #e0e0e0',
    padding: '12px 16px',
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#007bff',
    fontSize: '14px',
    padding: '4px 8px',
    marginBottom: '8px',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    fontSize: '12px',
    color: '#666',
  },
  metrics: {
    background: '#fff9e6',
    padding: '8px 16px',
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#666',
    borderBottom: '1px solid #e0e0e0',
  },
};
