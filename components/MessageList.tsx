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
        <p>No messages yet. Start the conversation!</p>
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
    padding: '16px 0',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999',
    fontSize: '14px',
  },
};
