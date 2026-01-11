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
  savedMessageIds: Set<string>;
  onToggleSave: (messageId: string, nextSaved: boolean) => void;
  enableSaveSwipe?: boolean;
  selectedMessageIds?: Set<string>;
  onMessageSelect?: (messageId: string) => void;
  autoScroll?: boolean;
  rangeStartId?: string | null;
  rangeEndId?: string | null;
}

export default function MessageList({
  messages,
  currentUserId,
  userLearningLanguage,
  savedMessageIds,
  onToggleSave,
  enableSaveSwipe = true,
  selectedMessageIds,
  onMessageSelect,
  autoScroll = true,
  rangeStartId,
  rangeEndId,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasRange = Boolean(rangeStartId);
  const rangeStartIndex = hasRange
    ? messages.findIndex((msg) => msg.messageId === rangeStartId)
    : -1;
  const rangeEndIndex = rangeEndId
    ? messages.findIndex((msg) => msg.messageId === rangeEndId)
    : rangeStartIndex;
  const rangeFrom =
    rangeStartIndex >= 0 && rangeEndIndex >= 0 ? Math.min(rangeStartIndex, rangeEndIndex) : -1;
  const rangeTo =
    rangeStartIndex >= 0 && rangeEndIndex >= 0 ? Math.max(rangeStartIndex, rangeEndIndex) : -1;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!autoScroll) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, autoScroll]);

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
      <div style={styles.messageList} className="message-list-scroll">
        {messages.map((message, index) => {
          const selected = hasRange && rangeFrom >= 0 && index >= rangeFrom && index <= rangeTo;
          const isStart = selected && index === rangeFrom;
          const isEnd = selected && index === rangeTo;
          const dim = rangeFrom >= 0 && rangeTo >= 0 && !selected;
          return (
            <div
              key={message.messageId}
              style={{
                ...styles.rangeItem,
                ...(selected ? styles.rangeItemSelected : {}),
                ...(isStart ? styles.rangeItemStart : {}),
                ...(isEnd ? styles.rangeItemEnd : {}),
                ...(dim ? styles.rangeItemDim : {}),
              }}
            >
              <MessageBubble
                message={message}
                isOwn={message.senderUserId === currentUserId}
                userLearningLanguage={userLearningLanguage}
                isSaved={savedMessageIds.has(message.messageId)}
                onToggleSave={onToggleSave}
                enableSaveSwipe={enableSaveSwipe}
                highlight={selectedMessageIds?.has(message.messageId)}
                onSelect={onMessageSelect}
              />
            </div>
          );
        })}
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
    background: 'var(--chat-bg)',
    backgroundImage: 'var(--chat-bg-image)',
    position: 'relative',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '24px 0 20px 0',
    width: '100%',
    maxWidth: '1280px',
    margin: '0 auto',
    WebkitOverflowScrolling: 'touch',
  },
  rangeItem: {
    padding: '0 8px',
  },
  rangeItemSelected: {
    borderLeft: '2px dashed rgba(42, 125, 246, 0.6)',
    borderRight: '2px dashed rgba(42, 125, 246, 0.6)',
    background: 'rgba(42, 125, 246, 0.04)',
  },
  rangeItemStart: {
    borderTop: '2px dashed rgba(42, 125, 246, 0.6)',
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
    paddingTop: '6px',
  },
  rangeItemEnd: {
    borderBottom: '2px dashed rgba(42, 125, 246, 0.6)',
    borderBottomLeftRadius: '12px',
    borderBottomRightRadius: '12px',
    paddingBottom: '6px',
  },
  rangeItemDim: {
    opacity: 0.45,
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
