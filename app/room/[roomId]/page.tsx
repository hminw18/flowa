'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket-client';
import { Message, Language } from '@/lib/types';
import MessageList from '@/components/MessageList';
import Composer from '@/components/Composer';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [user, setUser] = useState<{ userId: string; username: string; learningLanguage: Language } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [roomInfo, setRoomInfo] = useState<{ roomType: 'direct' | 'group'; name: string | null } | null>(null);

  // Check auth
  useEffect(() => {
    const fetchMe = async () => {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/');
        return;
      }
      const data = await response.json();
      if (data.ok) {
        setUser(data.user);
      } else {
        router.push('/');
      }
    };

    fetchMe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const fetchRoom = async () => {
      const response = await fetch(`/api/rooms/${roomId}`);
      if (!response.ok) return;
      const data = await response.json();
      if (data.ok) {
        setRoomInfo(data.room);
      }
    };
    fetchRoom();
  }, [roomId, user]);

  // Initialize socket connection and join room
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    // Connection event handlers
    const handleConnect = () => {
      console.log('[Room] Socket connected');
      setConnectionStatus('connected');

      // Join room
      socket.emit('room:join', { roomId }, (response) => {
        if (response.ok) {
          console.log('[Room] Joined successfully');
          socket.emit('room:read', { roomId }, () => {});
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
        if (prev.some((m) => m.messageId === message.messageId)) {
          return prev;
        }
        return [...prev, message].sort((a, b) => a.createdAt - b.createdAt);
      });

      if (message.senderUserId !== user.userId) {
        socket.emit('room:read', { roomId }, () => {});
      }
    };

    const handleMessageHistory = (history: Message[]) => {
      setMessages(history.sort((a, b) => a.createdAt - b.createdAt));
    };

    const handleTranslationsReady = (payload: {
      messageId: string;
      translations: Record<Language, string>;
    }) => {
      console.log('[Room] Translations ready:', payload);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.messageId === payload.messageId
            ? {
                ...msg,
                translations: {
                  ...msg.translations,
                  ...payload.translations,
                },
              }
            : msg
        )
      );
    };

    const handleReadUpdate = (payload: {
      updates: Array<{ messageId: string; unreadCount: number }>;
    }) => {
      console.log('[Room] Received read update:', payload.updates);
      const updatesMap = new Map(payload.updates.map((item) => [item.messageId, item.unreadCount]));
      setMessages((prev) =>
        prev.map((msg) => {
          const update = updatesMap.get(msg.messageId);
          return typeof update === 'number' ? { ...msg, unreadCount: update } : msg;
        })
      );
    };

    // Attach listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('message:new', handleNewMessage);
    socket.on('message:history', handleMessageHistory);
    socket.on('message:translationsReady', handleTranslationsReady);
    socket.on('message:readUpdate', handleReadUpdate);

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
      socket.off('message:translationsReady', handleTranslationsReady);
      socket.off('message:readUpdate', handleReadUpdate);
    };
  }, [roomId, user]);

  // Send message handler
  const handleSendMessage = useCallback(
    (text: string) => {
      const socket = getSocket();

      socket.emit('message:send', { roomId, originalText: text }, (response) => {
        if (response.ok) {
          console.log('[Room] Message sent:', response.message);
        } else {
          console.error('[Room] Send failed:', response.error);
          alert(`Failed to send message: ${response.error}`);
        }
      });
    },
    [roomId]
  );

  if (!user) {
    return null;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header} className="room-header">
        <button onClick={() => router.push('/rooms')} style={styles.backButton}>
          ← Back
        </button>
        <div style={styles.headerContent}>
          <h2 style={styles.roomTitle}>
            {!roomInfo
              ? `Room ${roomId}`
              : roomInfo.roomType === 'group'
                ? roomInfo.name || 'Global Chat'
                : 'Direct chat'}
          </h2>
          <div style={styles.statusBadge}>
            {connectionStatus === 'connecting' && '🟡 Connecting...'}
            {connectionStatus === 'connected' && '🟢 Connected'}
            {connectionStatus === 'disconnected' && '🔴 Disconnected'}
            {connectionStatus === 'error' && '🔴 Error'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        currentUserId={user.userId}
        userLearningLanguage={user.learningLanguage}
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
    background: 'var(--tg-bg)',
  },
  header: {
    background: 'var(--tg-panel)',
    borderBottom: '1px solid var(--tg-border)',
    padding: '14px 20px',
    boxShadow: '0 10px 20px rgba(31, 42, 58, 0.05)',
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: 'var(--tg-accent)',
    fontSize: '13px',
    padding: '4px 6px',
    marginBottom: '8px',
    cursor: 'pointer',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--tg-text)',
    margin: 0,
  },
  statusBadge: {
    fontSize: '11px',
    color: 'var(--tg-subtext)',
    background: 'var(--tg-panel-soft)',
    padding: '6px 10px',
    borderRadius: '999px',
    border: '1px solid var(--tg-border)',
  },
};
