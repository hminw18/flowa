/**
 * Message bubble component
 * Displays a single message with translation toggle
 */

import { Message } from '@/lib/types';
import { useState } from 'react';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onTranslationOpen: () => void;
}

export default function MessageBubble({
  message,
  isOwn,
  onTranslationOpen,
}: MessageBubbleProps) {
  const [isTranslationVisible, setIsTranslationVisible] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);

  const handleToggleTranslation = () => {
    const newVisible = !isTranslationVisible;
    setIsTranslationVisible(newVisible);

    if (newVisible && !hasOpenedOnce) {
      setHasOpenedOnce(true);
      onTranslationOpen();
    }
  };

  const renderHighlightedText = (text: string, highlight?: { start: number; end: number }) => {
    if (!highlight) return text;

    const before = text.substring(0, highlight.start);
    const highlighted = text.substring(highlight.start, highlight.end);
    const after = text.substring(highlight.end);

    return (
      <>
        {before}
        <span style={styles.highlight}>{highlighted}</span>
        {after}
      </>
    );
  };

  // Generate avatar color based on username
  const getAvatarColor = (username: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Get initials from username
  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  if (isOwn) {
    // Own message (right side, no avatar)
    return (
      <div style={styles.containerOwn}>
        <div style={styles.messageGroupOwn}>
          <div style={styles.metaOwn}>
            <span style={styles.timeOwn}>
              {new Date(message.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          <div style={styles.bubbleOwn}>
            <div style={styles.messageText}>{message.originalText}</div>

            {/* Translation section */}
            {message.translationStatus !== 'pending' && (
              <div style={styles.translationSectionOwn}>
                <button onClick={handleToggleTranslation} style={styles.toggleButtonOwn}>
                  {isTranslationVisible ? '▲ Hide' : '▼ Translation'}
                </button>

                {isTranslationVisible && (
                  <div style={styles.translationContent}>
                    {message.translationStatus === 'ready' && message.translatedText && (
                      <div style={styles.translationTextOwn}>
                        {renderHighlightedText(message.translatedText, message.highlightSpan)}
                      </div>
                    )}
                    {message.translationStatus === 'error' && (
                      <div style={styles.errorText}>Failed</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {message.translationStatus === 'pending' && (
              <div style={styles.pendingTextOwn}>Translating...</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Other user's message (left side, with avatar)
  return (
    <div style={styles.containerOther}>
      {/* Avatar */}
      <div style={{
        ...styles.avatar,
        background: getAvatarColor(message.senderUsername),
      }}>
        {getInitials(message.senderUsername)}
      </div>

      {/* Message content */}
      <div style={styles.messageGroupOther}>
        <div style={styles.usernameRow}>
          <span style={styles.username}>{message.senderUsername}</span>
          <span style={styles.timeOther}>
            {new Date(message.createdAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>

        <div style={styles.bubbleOther}>
          <div style={styles.messageText}>{message.originalText}</div>

          {/* Translation section */}
          {message.translationStatus !== 'pending' && (
            <div style={styles.translationSectionOther}>
              <button onClick={handleToggleTranslation} style={styles.toggleButtonOther}>
                {isTranslationVisible ? '▲ Hide' : '▼ Translation'}
              </button>

              {isTranslationVisible && (
                <div style={styles.translationContent}>
                  {message.translationStatus === 'ready' && message.translatedText && (
                    <div style={styles.translationTextOther}>
                      {renderHighlightedText(message.translatedText, message.highlightSpan)}
                    </div>
                  )}
                  {message.translationStatus === 'error' && (
                    <div style={styles.errorText}>Failed</div>
                  )}
                </div>
              )}
            </div>
          )}

          {message.translationStatus === 'pending' && (
            <div style={styles.pendingTextOther}>Translating...</div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  // Own message (right)
  containerOwn: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '8px',
    padding: '0 16px',
  },
  messageGroupOwn: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    maxWidth: '70%',
  },
  metaOwn: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    paddingBottom: '4px',
  },
  timeOwn: {
    fontSize: '11px',
    color: '#999',
  },
  bubbleOwn: {
    background: '#4A90E2',
    color: 'white',
    padding: '10px 14px',
    borderRadius: '18px',
    borderBottomRightRadius: '4px',
    wordBreak: 'break-word',
  },

  // Other user's message (left)
  containerOther: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    padding: '0 16px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'white',
    flexShrink: 0,
    marginTop: '20px',
  },
  messageGroupOther: {
    flex: 1,
    maxWidth: 'calc(70% - 52px)',
  },
  usernameRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    marginBottom: '4px',
  },
  username: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#333',
  },
  timeOther: {
    fontSize: '11px',
    color: '#999',
  },
  bubbleOther: {
    background: 'white',
    color: '#333',
    padding: '10px 14px',
    borderRadius: '18px',
    borderTopLeftRadius: '4px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    wordBreak: 'break-word',
  },

  // Common
  messageText: {
    fontSize: '15px',
    lineHeight: '1.4',
  },

  // Translation sections
  translationSectionOwn: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(255, 255, 255, 0.3)',
  },
  translationSectionOther: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(0, 0, 0, 0.1)',
  },
  toggleButtonOwn: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '11px',
    opacity: 0.9,
    padding: '2px 0',
    cursor: 'pointer',
    fontWeight: '500',
  },
  toggleButtonOther: {
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: '11px',
    padding: '2px 0',
    cursor: 'pointer',
    fontWeight: '500',
  },
  translationContent: {
    marginTop: '6px',
  },
  translationTextOwn: {
    fontSize: '13px',
    lineHeight: '1.4',
    opacity: 0.95,
    color: 'white',
  },
  translationTextOther: {
    fontSize: '13px',
    lineHeight: '1.4',
    color: '#555',
  },
  highlight: {
    background: 'rgba(255, 235, 59, 0.5)',
    fontWeight: 'bold',
    padding: '2px 4px',
    borderRadius: '3px',
  },
  errorText: {
    fontSize: '11px',
    opacity: 0.7,
    fontStyle: 'italic',
  },
  pendingTextOwn: {
    fontSize: '11px',
    opacity: 0.8,
    fontStyle: 'italic',
    marginTop: '4px',
  },
  pendingTextOther: {
    fontSize: '11px',
    opacity: 0.6,
    fontStyle: 'italic',
    marginTop: '4px',
    color: '#999',
  },
};
