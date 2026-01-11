'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket-client';
import { Message, Language, GLOBAL_ROOM_ID, GLOBAL_ROOM_NAME } from '@/lib/types';
import MessageList from '@/components/MessageList';
import Composer from '@/components/Composer';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const requestedRoomId = params.roomId as string;
  const roomId = GLOBAL_ROOM_ID;

  const [user, setUser] = useState<{ userId: string; username: string; learningLanguage: Language } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [savedMessageIds, setSavedMessageIds] = useState<string[]>([]);

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
    document.body.classList.add('room-page');
    return () => {
      document.body.classList.remove('room-page');
    };
  }, []);

  useEffect(() => {
    if (requestedRoomId && requestedRoomId !== GLOBAL_ROOM_ID) {
      router.replace(`/room/${GLOBAL_ROOM_ID}`);
    }
  }, [requestedRoomId, router]);

  useEffect(() => {
    if (!user) return;
    const loadSaved = async () => {
      const res = await fetch('/api/saved');
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok && Array.isArray(data.savedMessageIds)) {
        setSavedMessageIds(data.savedMessageIds);
      }
    };
    loadSaved();
  }, [user]);

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

  const handleToggleSave = useCallback(async (messageId: string, nextSaved: boolean) => {
    setSavedMessageIds((prev) => {
      const set = new Set(prev);
      if (nextSaved) {
        set.add(messageId);
      } else {
        set.delete(messageId);
      }
      return Array.from(set);
    });

    const res = await fetch('/api/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, action: nextSaved ? 'save' : 'unsave' }),
    });

    if (!res.ok) {
      const rollback = await fetch('/api/saved');
      if (rollback.ok) {
        const data = await rollback.json();
        if (data.ok && Array.isArray(data.savedMessageIds)) {
          setSavedMessageIds(data.savedMessageIds);
        }
      }
    }
  }, []);

  const savedSet = useMemo(() => new Set(savedMessageIds), [savedMessageIds]);

  if (!user) {
    return null;
  }

  const statusColor =
    connectionStatus === 'connected'
      ? '#34a853'
      : connectionStatus === 'disconnected' || connectionStatus === 'error'
        ? '#ea4335'
        : '#f4b400';
  const statusShadow =
    connectionStatus === 'connected'
      ? '0 0 0 4px rgba(52, 168, 83, 0.15)'
      : connectionStatus === 'disconnected' || connectionStatus === 'error'
        ? '0 0 0 4px rgba(234, 67, 53, 0.18)'
        : '0 0 0 4px rgba(244, 180, 0, 0.18)';

  return (
    <div style={styles.container} className="room-container">
      {/* Header */}
      <div style={styles.header} className="room-header">
        <div style={styles.headerContent}>
          <button onClick={() => router.push('/rooms')} style={styles.backButton}>
            ←
          </button>
          <h2 style={styles.roomTitle}>{GLOBAL_ROOM_NAME}</h2>
          <div style={{ ...styles.statusDot, background: statusColor, boxShadow: statusShadow }} />
        </div>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        currentUserId={user.userId}
        userLearningLanguage={user.learningLanguage}
        savedMessageIds={savedSet}
        onToggleSave={handleToggleSave}
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
    height: '100dvh',
    background: 'var(--chat-bg)',
    backgroundImage: 'var(--chat-bg-image)',
    overflow: 'hidden',
    position: 'relative',
  },
  header: {
    background: 'var(--chat-bg)',
    backgroundImage: 'var(--chat-bg-image)',
    borderBottom: 'none',
    padding: '4px 10px',
    paddingTop: 'calc(4px + env(safe-area-inset-top))',
    boxShadow: 'none',
    flexShrink: 0,
    zIndex: 10,
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
  },
  headerContent: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
  },
  backButton: {
    justifySelf: 'start',
    background: 'none',
    border: 'none',
    color: 'var(--tg-text)',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 6px',
  },
  roomTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--tg-text)',
    margin: 0,
    textAlign: 'center',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '999px',
    justifySelf: 'end',
  },
};
