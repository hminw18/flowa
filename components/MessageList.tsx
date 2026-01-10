/**
 * Message list component
 * Displays all messages with auto-scroll
 */

import { Message, Language } from '@/lib/types';
import MessageBubble from './MessageBubble';
import { useEffect, useRef } from 'react';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  userLearningLanguage: Language;
}

export default function MessageList({
  messages,
  currentUserId,
  userLearningLanguage,
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
        <p style={styles.emptySubtext}>Start the conversation!</p>
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
            isOwn={message.senderUserId === currentUserId}
            userLearningLanguage={userLearningLanguage}
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
    background: 'var(--tg-bg)',
    backgroundImage:
      'radial-gradient(circle at 18% 12%, rgba(42, 125, 246, 0.08), transparent 40%), radial-gradient(circle at 82% 0%, rgba(42, 125, 246, 0.06), transparent 45%)',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 0 20px 0',
    width: '100%',
    maxWidth: '1280px',
    margin: '0 auto',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    color: 'var(--tg-subtext)',
  },
  emptyIcon: {
    fontSize: '42px',
    opacity: 0.6,
  },
  emptyText: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--tg-text)',
    margin: 0,
  },
  emptySubtext: {
    fontSize: '13px',
    color: 'var(--tg-subtext)',
    margin: 0,
  },
};
