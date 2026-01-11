'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import MessageList from '@/components/MessageList';
import { Message } from '@/lib/types';

type ReviewSession = {
  title: string;
  description: string;
  keyExpressions: string[];
  openingLine: string;
};

type ReviewMessage = {
  messageId: string;
  senderUsername: string;
  senderUserId: string;
  originalText: string;
  originalLanguage: 'ko' | 'en' | 'es';
  createdAt: number;
};

export default function ReviewPage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    userId: string;
    learningLanguage: 'ko' | 'en' | 'es';
  } | null>(null);
  const [sessions, setSessions] = useState<ReviewSession[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ReviewMessage[]>([]);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const me = await fetch('/api/auth/me');
      if (!me.ok) {
        router.push('/');
        return;
      }
      const meData = await me.json().catch(() => null);
      if (meData?.ok) {
        setUser({
          userId: meData.user.userId,
          learningLanguage: meData.user.learningLanguage,
        });
      }
      const res = await fetch('/api/review');
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok) {
        setSessions(data.sessions ?? null);
      }
      const msgRes = await fetch('/api/review/messages');
      if (msgRes.ok) {
        const msgData = await msgRes.json().catch(() => null);
        if (msgData?.ok) {
          setMessages(msgData.messages ?? []);
        }
      }
    };
    load();
  }, [router]);

  useEffect(() => {
    if (pickerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [pickerOpen]);

  const handleSelect = (messageId: string) => {
    if (messageId === rangeStart && !rangeEnd) {
      setRangeStart(null);
      return;
    }
    if (messageId === rangeEnd) {
      setRangeEnd(null);
      return;
    }
    if (rangeStart && rangeEnd) {
      setRangeStart(messageId);
      setRangeEnd(null);
      return;
    }
    if (!rangeStart) {
      setRangeStart(messageId);
      return;
    }
    setRangeEnd(messageId);
  };

  const rangeInfo = useMemo(() => {
    if (!rangeStart || !rangeEnd) return null;
    const startIdx = messages.findIndex((msg) => msg.messageId === rangeStart);
    const endIdx = messages.findIndex((msg) => msg.messageId === rangeEnd);
    if (startIdx === -1 || endIdx === -1) return null;
    const from = Math.min(startIdx, endIdx);
    const to = Math.max(startIdx, endIdx);
    return {
      count: to - from + 1,
      from,
      to,
    };
  }, [messages, rangeStart, rangeEnd]);

  const selectedRangeIds = useMemo(() => {
    if (!rangeInfo) return new Set<string>();
    return new Set(messages.slice(rangeInfo.from, rangeInfo.to + 1).map((msg) => msg.messageId));
  }, [messages, rangeInfo]);

  const mappedMessages: Message[] = useMemo(
    () =>
      messages.map((msg) => ({
        messageId: msg.messageId,
        roomId: 'review-range',
        senderUserId: msg.senderUserId,
        senderUsername: msg.senderUsername,
        originalText: msg.originalText,
        originalLanguage: msg.originalLanguage,
        createdAt: msg.createdAt,
      })),
    [messages]
  );

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startMessageId: rangeStart,
        endMessageId: rangeEnd,
      }),
    });
    setLoading(false);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setError(data?.error || 'Failed to generate');
      return;
    }
    setSessions(data.sessions ?? null);
    setPickerOpen(false);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Role-Play Review</h1>
          <p style={styles.subtitle}>One key session based on today's chat.</p>
        </div>
        <button
          onClick={() => setPickerOpen(true)}
          style={styles.button}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </header>
      <main style={styles.content}>
        {error && <div style={styles.error}>{error}</div>}
        {!sessions && !error && (
          <div style={styles.placeholder}>Generate role-play sessions from today's chat.</div>
        )}
        {sessions && sessions[0] && (
          <div style={styles.list}>
            <div style={styles.card}>
              <div style={styles.cardTitle}>{sessions[0].title}</div>
              <div style={styles.cardDescription}>{sessions[0].description}</div>
              <div style={styles.tagRow}>
                {sessions[0].keyExpressions.map((expr) => (
                  <span key={expr} style={styles.tag}>
                    {expr}
                  </span>
                ))}
              </div>
              <div style={styles.openingLine}>Opening line: {sessions[0].openingLine}</div>
              <button
                style={styles.startButton}
                onClick={() => router.push('/review/play')}
              >
                Start Role-Play
              </button>
            </div>
          </div>
        )}
      </main>
      {pickerOpen && (
        <div style={styles.pickerOverlay}>
          <div style={styles.pickerPanel}>
            <div style={styles.pickerHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Pick a range</h2>
                <p style={styles.sectionSubtitle}>Tap a start and end message from today.</p>
              </div>
              <button
                style={styles.closeButton}
                onClick={() => setPickerOpen(false)}
              >
                Close
              </button>
            </div>
            {rangeInfo && (
              <div style={styles.rangeInfo}>
                Selected {rangeInfo.count} messages
              </div>
            )}
            {messages.length === 0 ? (
              <div style={styles.placeholder}>No messages today.</div>
            ) : (
              <div style={styles.chatPreview}>
                <MessageList
                  messages={mappedMessages}
                  currentUserId={user?.userId || 'unknown'}
                  userLearningLanguage={user?.learningLanguage || 'en'}
                  savedMessageIds={new Set()}
                  onToggleSave={() => {}}
                  enableSaveSwipe={false}
                  autoScroll={false}
                  selectedMessageIds={
                    rangeInfo
                      ? selectedRangeIds
                      : new Set(
                          [rangeStart, rangeEnd].filter(Boolean) as string[]
                        )
                  }
                  onMessageSelect={handleSelect}
                  rangeStartId={rangeStart}
                  rangeEndId={rangeEnd}
                />
              </div>
            )}
            <div style={styles.pickerFooter}>
              <button
                style={styles.clearButton}
                onClick={() => {
                  setRangeStart(null);
                  setRangeEnd(null);
                }}
                disabled={!rangeStart && !rangeEnd}
              >
                Clear
              </button>
              <button
                style={styles.button}
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate role-play'}
              </button>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'var(--tg-bg)',
    color: 'var(--tg-text)',
    paddingBottom: '72px',
  },
  header: {
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    margin: 0,
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--tg-subtext)',
    marginTop: '4px',
  },
  content: {
    padding: '0 20px 20px',
  },
  section: {
    marginBottom: '16px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '10px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '700',
    margin: 0,
  },
  sectionSubtitle: {
    fontSize: '12px',
    color: 'var(--tg-subtext)',
    marginTop: '4px',
  },
  rangeInfo: {
    fontSize: '12px',
    color: 'var(--tg-subtext)',
    marginBottom: '8px',
  },
  chatPreview: {
    borderRadius: '12px',
    border: '1px solid var(--tg-border)',
    overflow: 'hidden',
    flex: 1,
    minHeight: 0,
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch',
    display: 'flex',
    flexDirection: 'column',
  },
  selectionHints: {
    padding: '8px 12px',
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    borderTop: '1px solid var(--tg-border)',
    background: 'var(--tg-panel)',
  },
  badge: {
    alignSelf: 'flex-start',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '999px',
    background: 'rgba(42, 125, 246, 0.12)',
    color: 'var(--tg-accent)',
  },
  pickerOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.4)',
    display: 'flex',
    alignItems: 'flex-end',
    zIndex: 30,
    overscrollBehavior: 'contain',
  },
  pickerPanel: {
    width: '100%',
    maxHeight: '80vh',
    background: 'var(--tg-bg)',
    borderTopLeftRadius: '18px',
    borderTopRightRadius: '18px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    height: '80vh',
    overflow: 'hidden',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'var(--tg-text)',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  pickerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  pickerFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
  },
  clearButton: {
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(216, 225, 238, 0.9)',
    background: 'var(--tg-panel-soft)',
    color: 'var(--tg-subtext)',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'pointer',
  },
  placeholder: {
    background: 'var(--tg-panel)',
    border: '1px solid var(--tg-border)',
    borderRadius: '12px',
    padding: '16px',
    fontSize: '13px',
    color: 'var(--tg-subtext)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  card: {
    background: 'var(--tg-panel)',
    border: '1px solid var(--tg-border)',
    borderRadius: '12px',
    padding: '14px',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: '700',
    marginBottom: '6px',
  },
  cardDescription: {
    fontSize: '13px',
    color: 'var(--tg-subtext)',
  },
  tagRow: {
    marginTop: '10px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  tag: {
    fontSize: '11px',
    padding: '4px 8px',
    borderRadius: '999px',
    background: 'var(--tg-panel-soft)',
    border: '1px solid var(--tg-border)',
  },
  openingLine: {
    marginTop: '10px',
    fontSize: '12px',
    color: 'var(--tg-text)',
  },
  startButton: {
    marginTop: '12px',
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(42, 125, 246, 0.35)',
    background: 'white',
    color: 'var(--tg-accent)',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'pointer',
  },
  button: {
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(42, 125, 246, 0.35)',
    background: 'white',
    color: 'var(--tg-accent)',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '6px 10px',
    borderRadius: '10px',
    border: '1px solid rgba(216, 225, 238, 0.9)',
    background: 'var(--tg-panel-soft)',
    color: 'var(--tg-subtext)',
    fontWeight: '600',
    fontSize: '11px',
    cursor: 'pointer',
  },
  error: {
    background: 'rgba(214, 69, 69, 0.08)',
    border: '1px solid rgba(214, 69, 69, 0.2)',
    color: '#d64545',
    padding: '10px 12px',
    borderRadius: '10px',
    fontSize: '12px',
    marginBottom: '12px',
  },
};
