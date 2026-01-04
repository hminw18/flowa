'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket, getOrCreateClientId } from '@/lib/socket-client';
import { Message, GLOBAL_ROOM_ID } from '@/lib/types';
import MessageList from '@/components/MessageList';
import Composer from '@/components/Composer';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export default function ChatPage() {
  const router = useRouter();
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
      console.log('[Chat] Socket connected');
      setConnectionStatus('connected');

      // Join global room
      socket.emit('room:join', { roomId: GLOBAL_ROOM_ID, clientId, username }, (response) => {
        if (response.ok) {
          console.log('[Chat] Joined global chat');
        } else {
          console.error('[Chat] Join failed:', response.error);
          setConnectionStatus('error');
        }
      });
    };

    const handleDisconnect = () => {
      console.log('[Chat] Socket disconnected');
      setConnectionStatus('disconnected');
    };

    const handleConnectError = () => {
      console.error('[Chat] Connection error');
      setConnectionStatus('error');
    };

    // Message event handlers
    const handleNewMessage = (message: Message) => {
      console.log('[Chat] New message:', message);
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some(m => m.messageId === message.messageId)) {
          return prev;
        }
        return [...prev, message].sort((a, b) => a.createdAt - b.createdAt);
      });
    };

    const handleMessageHistory = (history: Message[]) => {
      console.log('[Chat] Received message history:', history.length);
      setMessages(history.sort((a, b) => a.createdAt - b.createdAt));
    };

    const handleTranslationReady = (payload: {
      messageId: string;
      translatedText: string;
      highlightSpan: { start: number; end: number };
    }) => {
      console.log('[Chat] Translation ready:', payload);
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
      console.log('[Chat] Translation error:', payload);
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
      console.log('[Chat] Metrics update:', payload);
      setMetrics(payload);
    };

    // Attach listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('message:new', handleNewMessage);
    socket.on('message:history', handleMessageHistory);
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
      socket.off('message:history', handleMessageHistory);
      socket.off('message:translationReady', handleTranslationReady);
      socket.off('message:translationError', handleTranslationError);
      socket.off('room:metrics:update', handleMetricsUpdate);
    };
  }, [clientId, username, router]);

  // Send message handler
  const handleSendMessage = useCallback(
    (text: string) => {
      const socket = getSocket();

      socket.emit(
        'message:send',
        { roomId: GLOBAL_ROOM_ID, clientId, username, originalText: text },
        (response) => {
          if (response.ok) {
            console.log('[Chat] Message sent:', response.message);
          } else {
            console.error('[Chat] Send failed:', response.error);
            alert(`Failed to send message: ${response.error}`);
          }
        }
      );
    },
    [clientId, username]
  );

  // Translation open handler
  const handleTranslationOpen = useCallback(
    (messageId: string) => {
      const socket = getSocket();

      socket.emit(
        'translation:open',
        { roomId: GLOBAL_ROOM_ID, clientId, messageId },
        (response) => {
          if (!response.ok) {
            console.error('[Chat] Translation open event failed:', response.error);
          }
        }
      );
    },
    [clientId]
  );

  // Fetch metrics on mount
  useEffect(() => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('room:metrics:get', { roomId: GLOBAL_ROOM_ID }, (response) => {
        if (response.ok) {
          setMetrics(response.metrics);
        }
      });
    }
  }, []);

  const handleLeave = () => {
    sessionStorage.removeItem('ci_messenger_username');
    router.push('/');
  };

  if (!username) {
    return null; // Will redirect
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h2 style={styles.title}>Global Chat</h2>
          <div style={styles.username}>Logged in as: {username}</div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.statusBadge}>
            {connectionStatus === 'connecting' && '🟡 Connecting...'}
            {connectionStatus === 'connected' && '🟢 Connected'}
            {connectionStatus === 'disconnected' && '🔴 Disconnected'}
            {connectionStatus === 'error' && '🔴 Error'}
          </div>
          <button onClick={handleLeave} style={styles.leaveButton}>
            Leave
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div style={styles.metrics}>
        <span>Messages: {metrics.totalMessages}</span>
        <span>Translations viewed: {metrics.uniqueOpened}</span>
        <span>View rate: {(metrics.openRate * 100).toFixed(1)}%</span>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        currentClientId={clientId}
        onTranslationOpen={handleTranslationOpen}
      />

      {/* Composer */}
      <Composer onSend={handleSendMessage} disabled={connectionStatus !== 'connected'} />
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
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
    margin: 0,
  },
  username: {
    fontSize: '13px',
    color: '#666',
  },
  statusBadge: {
    fontSize: '12px',
    color: '#666',
  },
  leaveButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#666',
    background: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  metrics: {
    background: '#fff9e6',
    padding: '8px 20px',
    display: 'flex',
    gap: '24px',
    fontSize: '12px',
    color: '#666',
    borderBottom: '1px solid #e0e0e0',
  },
};
