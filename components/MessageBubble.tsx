/**
 * Message bubble component
 * Displays message with translation toggle
 */

import { Message, Language, LANGUAGE_NAMES } from '@/lib/types';
import { useState } from 'react';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  userLearningLanguage: Language;
}

export default function MessageBubble({
  message,
  isOwn,
  userLearningLanguage,
}: MessageBubbleProps) {
  const [showTranslation, setShowTranslation] = useState(false);

  // Determine which translation to show
  // If message is in user's learning language, show it in another available language
  // Otherwise, show it in user's learning language
  let translationLanguage: Language | null = null;
  let translationText: string | null = null;

  if (message.translations) {
    if (message.originalLanguage !== userLearningLanguage && message.translations[userLearningLanguage]) {
      // Message is NOT in learning language, show learning language translation
      translationLanguage = userLearningLanguage;
      translationText = message.translations[userLearningLanguage];
    } else {
      // Message IS in learning language, find another translation
      const availableLanguages: Language[] = ['ko', 'en', 'es'];
      for (const lang of availableLanguages) {
        if (lang !== message.originalLanguage && message.translations[lang]) {
          translationLanguage = lang;
          translationText = message.translations[lang];
          break;
        }
      }
    }
  }

  const hasTranslation = translationLanguage !== null && translationText !== null;

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
        <div style={styles.messageGroupOwn}>
          <div style={styles.metaOwn}>
            <span style={styles.timeOwn}>
              {new Date(message.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            {typeof message.unreadCount === 'number' && message.unreadCount > 0 && (
              <span style={styles.unreadBadge}>{message.unreadCount}</span>
            )}
          </div>
          <div style={styles.bubbleOwn}>
            <div style={styles.messageText}>{message.originalText}</div>

            {/* Translation toggle */}
            {hasTranslation && (
              <div style={styles.translationSectionOwn}>
                <button onClick={() => setShowTranslation(!showTranslation)} style={styles.toggleButtonOwn}>
                  {showTranslation ? 'Hide' : `View in ${LANGUAGE_NAMES[translationLanguage!]}`}
                </button>

                {showTranslation && (
                  <div style={styles.translationTextOwn}>
                    {translationText}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Other user's message (left side, with avatar)
  return (
    <div style={styles.containerOther} className="message-bubble-container">
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
          {typeof message.unreadCount === 'number' && message.unreadCount > 0 && (
            <span style={styles.unreadBadgeOther}>{message.unreadCount}</span>
          )}
        </div>

        <div style={styles.bubbleOther}>
          <div style={styles.messageText}>{message.originalText}</div>

          {/* Translation toggle */}
          {hasTranslation && (
            <div style={styles.translationSectionOther}>
              <button onClick={() => setShowTranslation(!showTranslation)} style={styles.toggleButtonOther}>
                {showTranslation ? 'Hide' : `View in ${LANGUAGE_NAMES[translationLanguage!]}`}
              </button>

              {showTranslation && (
                <div style={styles.translationTextOther}>
                  {translationText}
                </div>
              )}
            </div>
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
    marginBottom: '10px',
    padding: '0 18px',
  },
  messageGroupOwn: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    maxWidth: '72%',
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
    padding: '10px 14px',
    borderRadius: '18px',
    borderBottomRightRadius: '6px',
    wordBreak: 'break-word',
    boxShadow: '0 8px 16px rgba(42, 125, 246, 0.25)',
  },

  // Other user's message (left)
  containerOther: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    padding: '0 18px',
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
    maxWidth: 'calc(72% - 48px)',
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
    padding: '10px 14px',
    borderRadius: '18px',
    borderTopLeftRadius: '6px',
    boxShadow: '0 8px 16px rgba(31, 42, 58, 0.08)',
    wordBreak: 'break-word',
    border: '1px solid rgba(216, 225, 238, 0.8)',
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
    borderTop: '1px solid rgba(31, 42, 58, 0.08)',
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
    color: 'var(--tg-subtext)',
    fontSize: '11px',
    padding: '2px 0',
    cursor: 'pointer',
    fontWeight: '600',
  },
  translationTextOwn: {
    fontSize: '13px',
    lineHeight: '1.4',
    opacity: 0.95,
    color: 'white',
    marginTop: '6px',
  },
  translationTextOther: {
    fontSize: '13px',
    lineHeight: '1.4',
    color: 'var(--tg-subtext)',
    marginTop: '6px',
  },
};
