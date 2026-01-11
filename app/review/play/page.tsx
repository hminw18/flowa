'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Message, Language } from '@/lib/types';
import MessageList from '@/components/MessageList';
import Composer from '@/components/Composer';

type ReviewTurn = {
  cue: string;
  expectedText?: string | null;
  expectedEnglish?: string | null;
  partnerMessages?: Array<{
    text: string;
    username: string | null;
  }>;
  partnerEnglish?: string | null;
  partnerUsername?: string | null;
};

type ReviewSession = {
  title: string;
  description: string;
  keyExpressions: string[];
  openingLine: string;
  turns?: ReviewTurn[];
};

type RoleplayMessage = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: number;
  feedback?: string;
  feedbackStatus?: 'pass' | 'fail';
  suggestion?: string;
};

export default function ReviewPlayPage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    userId: string;
    username: string;
    nativeLanguage: Language;
    learningLanguage: Language;
  } | null>(null);
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [messages, setMessages] = useState<RoleplayMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [turnIndex, setTurnIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const init = async () => {
      const me = await fetch('/api/auth/me');
      if (!me.ok) {
        router.push('/');
        return;
      }
      const meData = await me.json();
      if (!meData.ok) {
        router.push('/');
        return;
      }
      setUser(meData.user);

      const res = await fetch('/api/review');
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok && data.sessions && data.sessions[0]) {
        const first = data.sessions[0] as ReviewSession;
        setSession(first);
        setMessages([]);
        setTurnIndex(0);
        setCompleted(false);
      }
    };
    init();
  }, [router]);

  useEffect(() => {
    document.body.classList.add('room-page');
    return () => {
      document.body.classList.remove('room-page');
    };
  }, []);

  const mappedMessages: Message[] = useMemo(() => {
    if (!user) return [];
    return messages.map((msg) => ({
      messageId: msg.id,
      roomId: 'roleplay',
      senderUserId: msg.senderId,
      senderUsername: msg.senderName,
      originalText: msg.content,
      originalLanguage: user.learningLanguage,
      createdAt: msg.createdAt,
      feedback: msg.feedback,
      feedbackStatus: msg.feedbackStatus,
      suggestion: msg.suggestion,
    }));
  }, [messages, user]);

  const handleSend = async (text: string) => {
    if (!session || !user || completed) return;
    const turns = session.turns ?? [];
    const currentTurn = turns[turnIndex];
    if (!currentTurn) return;

    const userMessageId = `user-${Date.now()}`;
    const userMessage: RoleplayMessage = {
      id: userMessageId,
      senderId: user.userId,
      senderName: user.username,
      content: text,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    const lastPartnerLine =
      [...messages]
        .reverse()
        .find((msg) => msg.senderId !== user.userId && msg.senderId !== 'roleplay-coach')
        ?.content ?? null;

    const applyFeedback = (
      prev: RoleplayMessage[],
      status: 'pass' | 'fail',
      feedbackText: string,
      suggestionText?: string
    ) =>
      prev.map((msg) =>
        msg.id === userMessageId
          ? {
              ...msg,
              feedback: feedbackText,
              feedbackStatus: status,
              suggestion: suggestionText,
            }
          : msg
      );

    let res: Response;
    let data: any = null;
    try {
      res = await fetch('/api/review/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cue: currentTurn.cue,
          expectedText: currentTurn.expectedText ?? currentTurn.expectedEnglish ?? null,
          userResponse: text,
          contextText: lastPartnerLine,
          targetLanguage: user.learningLanguage,
          nativeLanguage: user.nativeLanguage,
        }),
      });
      data = await res.json().catch(() => null);
    } catch {
      setLoading(false);
      setMessages((prev) =>
        applyFeedback(prev, 'fail', 'Failed to reach the server.')
      );
      return;
    }
    setLoading(false);
    if (!res.ok || !data?.ok) {
      setMessages((prev) =>
        applyFeedback(prev, 'fail', data?.error || 'Failed to reply.')
      );
      return;
    }

    const feedback = (data.feedback as string) || (data.pass ? 'Nice.' : 'Try again.');
    const rawSuggestion =
      typeof data.suggestion === 'string' && data.suggestion.trim().length > 0
        ? data.suggestion.trim()
        : undefined;
    const normalizedUser = text.trim().toLowerCase();
    const normalizedSuggestion = rawSuggestion?.toLowerCase();
    const suggestion =
      rawSuggestion && normalizedSuggestion !== normalizedUser ? rawSuggestion : undefined;

    const partnerMessages =
      currentTurn.partnerMessages ??
      (currentTurn.partnerEnglish
        ? [
            {
              text: currentTurn.partnerEnglish,
              username: currentTurn.partnerUsername ?? null,
            },
          ]
        : []);
    const partnerChat =
      data.pass && partnerMessages.length > 0
        ? (() => {
            const timestamp = Date.now();
            return partnerMessages.map((msg, idx) => ({
              id: `partner-${timestamp}-${idx}`,
              senderId: `partner-${idx}`,
              senderName: msg.username || 'Partner',
              content: msg.text,
              createdAt: timestamp + idx,
            }));
          })()
        : [];

    setMessages((prev) => {
      const updated = applyFeedback(prev, data.pass ? 'pass' : 'fail', feedback, suggestion);
      if (!data.pass) return updated;
      return partnerChat.length > 0 ? [...updated, ...partnerChat] : updated;
    });

    if (!data.pass) {
      return;
    }

    const nextIndex = turnIndex + 1;
    setTurnIndex(nextIndex);
    if (nextIndex >= turns.length) {
      setCompleted(true);
    }
  };

  if (!user || !session) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingText}>Generate a session first in Review.</div>
        <button style={styles.backButton} onClick={() => router.push('/review')}>
          Back to Review
        </button>
      </div>
    );
  }

  const turns = session.turns ?? [];
  if (turns.length === 0) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingText}>No role-play turns available for today.</div>
        <button style={styles.backButton} onClick={() => router.push('/review')}>
          Back to Review
        </button>
      </div>
    );
  }

  const currentTurn = turns[turnIndex];
  const cueText = completed ? 'Replay complete.' : currentTurn?.cue || '—';

  return (
    <div style={styles.container}>
      <div style={styles.header} className="room-header">
        <div style={styles.headerContent}>
          <button onClick={() => router.push('/review')} style={styles.backButton}>
            ←
          </button>
          <h2 style={styles.headerTitle}>Role-Play</h2>
          <div style={styles.headerRight} />
        </div>
        <div style={styles.nativeHint}>
          {completed ? cueText : `Native cue: ${cueText}`}
        </div>
        {turns.length > 0 && !completed && (
          <div style={styles.progress}>
            Turn {Math.min(turnIndex + 1, turns.length)} of {turns.length}
          </div>
        )}
      </div>

      <MessageList
        messages={mappedMessages}
        currentUserId={user.userId}
        userLearningLanguage={user.learningLanguage}
        savedMessageIds={new Set()}
        onToggleSave={() => {}}
        enableSaveSwipe={false}
      />
      {loading && (
        <div style={styles.typing}>
          Role-Play is typing...
        </div>
      )}
      {completed ? (
        <div style={styles.completedNotice}>Completed. Great job!</div>
      ) : (
        <Composer onSend={handleSend} disabled={loading} />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100dvh',
    background: 'var(--chat-bg)',
    overflow: 'hidden',
  },
  header: {
    background: 'var(--chat-bg)',
    borderBottom: 'none',
    padding: '4px 10px',
    paddingTop: 'calc(4px + env(safe-area-inset-top))',
    boxShadow: 'none',
    zIndex: 10,
  },
  headerContent: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
  },
  headerTitle: {
    textAlign: 'center',
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--tg-text)',
    margin: 0,
  },
  headerRight: {
    justifySelf: 'end',
    width: '10px',
    height: '10px',
  },
  nativeHint: {
    marginTop: '6px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--tg-subtext)',
  },
  progress: {
    marginTop: '2px',
    fontSize: '11px',
    color: 'var(--tg-subtext)',
  },
  typing: {
    fontSize: '11px',
    color: 'var(--tg-subtext)',
    padding: '4px 16px',
  },
  completedNotice: {
    padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
    fontSize: '12px',
    color: 'var(--tg-subtext)',
    textAlign: 'center',
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  loadingText: {
    fontSize: '13px',
    color: 'var(--tg-subtext)',
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
};
