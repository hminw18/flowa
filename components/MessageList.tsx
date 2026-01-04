/**
 * Message list component
 * Displays all messages with auto-scroll
 */

import { Message } from '@/lib/types';
import MessageBubble from './MessageBubble';
import { useEffect, useRef } from 'react';

interface MessageListProps {
  messages: Message[];
  currentClientId: string;
  onTranslationOpen: (messageId: string) => void;
}

export default function MessageList({
  messages,
  currentClientId,
  onTranslationOpen,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>💬</div>
        <p style={styles.emptyText}>No messages yet</p>
        <p style={styles.emptySubtext}>Start the conversation in Korean!</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.messageList}>
        {messages.map((message) => (
          <MessageBubble
            key={message.messageId}
            message={message}
            isOwn={message.senderClientId === currentClientId}
            onTranslationOpen={() => onTranslationOpen(message.messageId)}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 0 16px 0',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  emptyIcon: {
    fontSize: '48px',
    opacity: 0.5,
  },
  emptyText: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#666',
    margin: 0,
  },
  emptySubtext: {
    fontSize: '13px',
    color: '#999',
    margin: 0,
  },
};
