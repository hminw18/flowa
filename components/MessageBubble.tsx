/**
 * Message bubble component
 * Displays message with translation toggle
 */

import { Message, Language, LANGUAGE_NAMES } from '@/lib/types';
import { useState, useRef } from 'react';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  userLearningLanguage: Language;
  isSaved: boolean;
  onToggleSave: (messageId: string, nextSaved: boolean) => void;
  enableSaveSwipe?: boolean;
  highlight?: boolean;
  onSelect?: (messageId: string) => void;
}

export default function MessageBubble({
  message,
  isOwn,
  userLearningLanguage,
  isSaved,
  onToggleSave,
  enableSaveSwipe = true,
  highlight = false,
  onSelect,
}: MessageBubbleProps) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const startXRef = useRef<number | null>(null);
  const startOffsetRef = useRef(0);
  const maxReveal = 72;
  const direction = isOwn ? -1 : 1;
  const revealProgress = Math.min(1, Math.abs(offsetX) / maxReveal);
  const actionVisible = enableSaveSwipe && (isOpen || revealProgress > 0.05);
  const showSavedTag = enableSaveSwipe && isSaved;
  const feedback = message.feedback?.trim();
  const suggestion = message.suggestion?.trim();
  const feedbackStatus = message.feedbackStatus;
  const showFeedback = isOwn && (!!feedback || !!suggestion);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    startXRef.current = event.clientX;
    startOffsetRef.current = isOpen ? direction * maxReveal : 0;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (startXRef.current === null) return;
    const delta = event.clientX - startXRef.current;
    let next = startOffsetRef.current + delta;
    if (direction > 0) {
      next = Math.max(0, Math.min(maxReveal, next));
    } else {
      next = Math.min(0, Math.max(-maxReveal, next));
    }
    setOffsetX(next);
  };

  const handlePointerUp = () => {
    if (startXRef.current === null) return;
    const shouldOpen = Math.abs(offsetX) > maxReveal * 0.5;
    setIsOpen(shouldOpen);
    setOffsetX(shouldOpen ? direction * maxReveal : 0);
    startXRef.current = null;
  };

  // Always show translation in user's learning language ONLY
  // Only show if message is NOT already in user's learning language
  const hasTranslation =
    message.originalLanguage !== userLearningLanguage &&
    message.translations &&
    message.translations[userLearningLanguage];

  const translationText = hasTranslation ? message.translations?.[userLearningLanguage] : null;

  // Generate avatar color based on username
  const getAvatarColor = (username: string) => {
    const colors = [
      '#4A90E2',
      '#2ECC71',
      '#FF6B6B',
      '#F5A623',
      '#9B59B6',
      '#1ABC9C',
      '#E67E22',
      '#34495E',
    ];
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Get initials from username
  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  if (isOwn) {
    // Own message (right side)
    return (
      <div style={styles.containerOwn} className="message-bubble-container">
        <div style={{ ...styles.swipeWrap, ...styles.swipeWrapOwn }}>
          {enableSaveSwipe && (
            <div
              style={{
                ...styles.actionAreaOwn,
                opacity: actionVisible ? 1 : 0,
                pointerEvents: actionVisible ? 'auto' : 'none',
              }}
            >
              <button
                type="button"
                style={styles.actionButton}
                onClick={() => {
                  onToggleSave(message.messageId, !isSaved);
                  setIsOpen(false);
                  setOffsetX(0);
                }}
              >
                {isSaved ? 'Unsave' : 'Save'}
              </button>
            </div>
          )}
          <div
            style={{
              ...styles.messageGroupOwn,
              transform: enableSaveSwipe ? `translateX(${offsetX}px)` : 'translateX(0)',
            }}
            onPointerDown={enableSaveSwipe ? handlePointerDown : undefined}
            onPointerMove={enableSaveSwipe ? handlePointerMove : undefined}
            onPointerUp={enableSaveSwipe ? handlePointerUp : undefined}
            onPointerCancel={enableSaveSwipe ? handlePointerUp : undefined}
          >
            <div style={styles.metaOwn}>
              <span style={styles.timeOwn}>
                {new Date(message.createdAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {showSavedTag && <span style={styles.savedTag}>Saved</span>}
              {typeof message.unreadCount === 'number' && message.unreadCount > 0 && (
                <span style={styles.unreadBadge}>{message.unreadCount}</span>
              )}
            </div>
            <div style={styles.bubbleStackOwn}>
              <div
                style={{
                  ...styles.bubbleOwn,
                  ...(highlight ? styles.bubbleHighlight : {}),
                }}
                onClick={onSelect ? () => onSelect(message.messageId) : undefined}
              >
                <div style={styles.messageText}>{message.originalText}</div>

                {/* Translation toggle */}
                {hasTranslation && (
                  <div style={styles.translationSectionOwn}>
                    <button onClick={() => setShowTranslation(!showTranslation)} style={styles.toggleButtonOwn}>
                      {showTranslation ? 'Hide' : `View in ${LANGUAGE_NAMES[userLearningLanguage]}`}
                    </button>

                    {showTranslation && (
                      <div style={styles.translationTextOwn}>{translationText}</div>
                    )}
                  </div>
                )}
              </div>
              {showFeedback && (
                <div style={styles.feedbackWrapOwn}>
                  {feedback && (
                    <div
                      style={
                        feedbackStatus === 'fail'
                          ? styles.feedbackTextFail
                          : styles.feedbackTextPass
                      }
                    >
                      {feedback}
                    </div>
                  )}
                  {suggestion && (
                    <div style={styles.suggestionText}>
                      More natural: {suggestion}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Other user's message (left side, with avatar)
  return (
    <div style={styles.containerOther} className="message-bubble-container">
      {/* Avatar */}
      <div
        style={{
          ...styles.avatar,
          background: getAvatarColor(message.senderUsername),
        }}
      >
        {getInitials(message.senderUsername)}
      </div>

      {/* Message content */}
      <div style={{ ...styles.swipeWrap, ...styles.swipeWrapOther }}>
        {enableSaveSwipe && (
          <div
            style={{
              ...styles.actionAreaOther,
              opacity: actionVisible ? 1 : 0,
              pointerEvents: actionVisible ? 'auto' : 'none',
            }}
          >
            <button
              type="button"
              style={styles.actionButton}
              onClick={() => {
                onToggleSave(message.messageId, !isSaved);
                setIsOpen(false);
                setOffsetX(0);
              }}
            >
              {isSaved ? 'Unsave' : 'Save'}
            </button>
          </div>
        )}
        <div
          style={{
            ...styles.messageGroupOther,
            transform: enableSaveSwipe ? `translateX(${offsetX}px)` : 'translateX(0)',
          }}
          onPointerDown={enableSaveSwipe ? handlePointerDown : undefined}
          onPointerMove={enableSaveSwipe ? handlePointerMove : undefined}
          onPointerUp={enableSaveSwipe ? handlePointerUp : undefined}
          onPointerCancel={enableSaveSwipe ? handlePointerUp : undefined}
        >
          <div style={styles.usernameRow}>
            <span style={styles.username}>{message.senderUsername}</span>
            <span style={styles.timeOther}>
              {new Date(message.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {showSavedTag && <span style={styles.savedTag}>Saved</span>}
            {typeof message.unreadCount === 'number' && message.unreadCount > 0 && (
              <span style={styles.unreadBadgeOther}>{message.unreadCount}</span>
            )}
          </div>

          <div
            style={{
              ...styles.bubbleOther,
              ...(highlight ? styles.bubbleHighlight : {}),
            }}
            onClick={onSelect ? () => onSelect(message.messageId) : undefined}
          >
            <div style={styles.messageText}>{message.originalText}</div>

            {/* Translation toggle */}
            {hasTranslation && (
              <div style={styles.translationSectionOther}>
                <button onClick={() => setShowTranslation(!showTranslation)} style={styles.toggleButtonOther}>
                  {showTranslation ? 'Hide' : `View in ${LANGUAGE_NAMES[userLearningLanguage]}`}
                </button>

                {showTranslation && (
                  <div style={styles.translationTextOther}>{translationText}</div>
                )}
              </div>
            )}
          </div>
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
    marginBottom: '10px',
    padding: '0 18px',
  },
  messageGroupOwn: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    maxWidth: '85%',
    transition: 'transform 0.15s ease-out',
    touchAction: 'pan-y',
  },
  bubbleStackOwn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
  },
  metaOwn: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    paddingBottom: '4px',
    alignItems: 'flex-end',
    gap: '4px',
  },
  timeOwn: {
    fontSize: '10px',
    color: 'var(--tg-subtext)',
  },
  savedTag: {
    fontSize: '10px',
    color: 'var(--tg-subtext)',
  },
  unreadBadge: {
    minWidth: '18px',
    height: '18px',
    borderRadius: '999px',
    background: 'rgba(31, 106, 224, 0.15)',
    color: 'var(--tg-accent-strong)',
    fontSize: '10px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6px',
  },
  bubbleOwn: {
    background: 'linear-gradient(135deg, var(--tg-bubble-own), var(--tg-bubble-own-dark))',
    color: 'white',
    padding: '8px 14px',
    borderRadius: '18px',
    borderBottomRightRadius: '6px',
    wordBreak: 'break-word',
    boxShadow: '0 8px 16px rgba(42, 125, 246, 0.25)',
    display: 'inline-block',
    width: 'fit-content',
    maxWidth: '100%',
  },

  // Other user's message (left)
  containerOther: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    padding: '0 18px',
  },
  swipeWrap: {
    position: 'relative',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
  },
  swipeWrapOwn: {
    justifyContent: 'flex-end',
  },
  swipeWrapOther: {
    justifyContent: 'flex-start',
  },
  actionAreaOwn: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '72px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.15s ease-out',
  },
  actionAreaOther: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '72px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.15s ease-out',
  },
  actionButton: {
    pointerEvents: 'auto',
    background: 'var(--tg-panel)',
    border: '1px solid var(--tg-border)',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--tg-text)',
    cursor: 'pointer',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '700',
    color: 'white',
    flexShrink: 0,
    marginTop: '22px',
    boxShadow: '0 6px 12px rgba(31, 42, 58, 0.12)',
  },
  messageGroupOther: {
    flex: 1,
    maxWidth: 'calc(85% - 48px)',
    transition: 'transform 0.15s ease-out',
    touchAction: 'pan-y',
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
    color: 'var(--tg-text)',
  },
  timeOther: {
    fontSize: '10px',
    color: 'var(--tg-subtext)',
  },
  unreadBadgeOther: {
    minWidth: '18px',
    height: '18px',
    borderRadius: '999px',
    background: 'rgba(31, 106, 224, 0.12)',
    color: 'var(--tg-accent)',
    fontSize: '10px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6px',
  },
  bubbleOther: {
    background: 'var(--tg-bubble-other)',
    color: 'var(--tg-text)',
    padding: '8px 14px',
    borderRadius: '18px',
    borderTopLeftRadius: '6px',
    boxShadow: '0 8px 16px rgba(31, 42, 58, 0.08)',
    wordBreak: 'break-word',
    border: '1px solid rgba(216, 225, 238, 0.8)',
    display: 'inline-block',
    width: 'fit-content',
    maxWidth: '100%',
  },
  bubbleHighlight: {
    boxShadow: '0 0 0 2px rgba(42, 125, 246, 0.2)',
  },

  // Common
  messageText: {
    fontSize: '15px',
    lineHeight: '1.4',
  },

  // Translation sections
  translationSectionOwn: {
    marginTop: '0',
    paddingTop: '3px',
    borderTop: '1px solid rgba(255, 255, 255, 0.3)',
  },
  translationSectionOther: {
    marginTop: '0',
    paddingTop: '3px',
    borderTop: '1px solid rgba(31, 42, 58, 0.08)',
  },
  toggleButtonOwn: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '11px',
    opacity: 0.9,
    padding: '1px 0',
    margin: 0,
    lineHeight: '1.1',
    minHeight: 0,
    height: 'auto',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontWeight: '500',
  },
  toggleButtonOther: {
    background: 'none',
    border: 'none',
    color: 'var(--tg-subtext)',
    fontSize: '11px',
    padding: '1px 0',
    margin: 0,
    lineHeight: '1.1',
    minHeight: 0,
    height: 'auto',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontWeight: '600',
  },
  translationTextOwn: {
    fontSize: '13px',
    lineHeight: '1.4',
    opacity: 0.95,
    color: 'white',
    marginTop: '2px',
  },
  translationTextOther: {
    fontSize: '13px',
    lineHeight: '1.4',
    color: 'var(--tg-subtext)',
    marginTop: '2px',
  },
  feedbackWrapOwn: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    paddingRight: '4px',
  },
  feedbackTextPass: {
    fontSize: '11px',
    color: 'var(--tg-subtext)',
    background: 'transparent',
    borderRadius: 0,
    padding: 0,
  },
  feedbackTextFail: {
    fontSize: '11px',
    color: '#c53b3b',
    background: 'transparent',
    borderRadius: 0,
    padding: 0,
  },
  suggestionText: {
    fontSize: '11px',
    color: 'var(--tg-text)',
    background: 'transparent',
    borderRadius: 0,
    padding: 0,
    fontStyle: 'italic',
  },
};
