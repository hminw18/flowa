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

  return (
    <div
      style={{
        ...styles.container,
        ...(isOwn ? styles.containerOwn : styles.containerOther),
      }}
    >
      {/* Username label for other users */}
      {!isOwn && (
        <div style={styles.usernameLabel}>{message.senderUsername}</div>
      )}

      <div
        style={{
          ...styles.bubble,
          ...(isOwn ? styles.bubbleOwn : styles.bubbleOther),
        }}
      >
        {/* Original text */}
        <div style={styles.originalText}>{message.originalText}</div>

        {/* Translation section */}
        {message.translationStatus !== 'pending' && (
          <div style={styles.translationSection}>
            <button onClick={handleToggleTranslation} style={styles.toggleButton}>
              {isTranslationVisible ? '▲ Hide translation' : '▼ View translation'}
            </button>

            {isTranslationVisible && (
              <div style={styles.translationContent}>
                {message.translationStatus === 'ready' && message.translatedText && (
                  <>
                    <div style={styles.translationLabel}>Translation:</div>
                    <div style={styles.translationText}>
                      {renderHighlightedText(message.translatedText, message.highlightSpan)}
                    </div>
                  </>
                )}
                {message.translationStatus === 'error' && (
                  <div style={styles.errorText}>Translation failed</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pending state */}
        {message.translationStatus === 'pending' && (
          <div style={styles.pendingText}>Translating...</div>
        )}

        {/* Timestamp */}
        <div style={styles.timestamp}>
          {new Date(message.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '12px',
    padding: '0 16px',
  },
  containerOwn: {
    alignItems: 'flex-end',
  },
  containerOther: {
    alignItems: 'flex-start',
  },
  usernameLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#666',
    marginBottom: '4px',
    marginLeft: '4px',
  },
  bubble: {
    maxWidth: '70%',
    padding: '12px 16px',
    borderRadius: '16px',
    position: 'relative',
  },
  bubbleOwn: {
    background: '#007bff',
    color: 'white',
    borderBottomRightRadius: '4px',
  },
  bubbleOther: {
    background: 'white',
    color: '#333',
    border: '1px solid #e0e0e0',
    borderBottomLeftRadius: '4px',
  },
  originalText: {
    fontSize: '16px',
    lineHeight: '1.4',
    marginBottom: '4px',
  },
  translationSection: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(255, 255, 255, 0.2)',
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    fontSize: '12px',
    opacity: 0.8,
    padding: '4px 0',
    textAlign: 'left',
    width: '100%',
    cursor: 'pointer',
  },
  translationContent: {
    marginTop: '8px',
  },
  translationLabel: {
    fontSize: '11px',
    opacity: 0.7,
    marginBottom: '4px',
  },
  translationText: {
    fontSize: '14px',
    lineHeight: '1.4',
    opacity: 0.9,
  },
  highlight: {
    background: 'rgba(255, 255, 0, 0.3)',
    fontWeight: 'bold',
    padding: '2px 4px',
    borderRadius: '4px',
  },
  errorText: {
    fontSize: '12px',
    opacity: 0.7,
    fontStyle: 'italic',
  },
  pendingText: {
    fontSize: '12px',
    opacity: 0.7,
    fontStyle: 'italic',
    marginTop: '4px',
  },
  timestamp: {
    fontSize: '10px',
    opacity: 0.6,
    marginTop: '4px',
  },
};
