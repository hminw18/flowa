'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

type QuizSummary = {
  quizDate: string;
  createdAt: string;
  completedAt: string | null;
  score: number | null;
  totalCount: number;
};

export default function QuizPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [serverToday, setServerToday] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const me = await fetch('/api/auth/me');
      if (!me.ok) {
        router.push('/');
        return;
      }
      const res = await fetch('/api/quiz');
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok) {
        setQuizzes(data.quizzes ?? []);
        setServerToday(data.serverToday ?? null);
      }
    };
    load();
  }, [router]);

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    const res = await fetch('/api/quiz', { method: 'POST' });
    setLoading(false);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setError(data?.error || 'Failed to generate');
      return;
    }
    if (data.quizDate) {
      router.push(`/quiz/${data.quizDate}`);
      return;
    }
    const refresh = await fetch('/api/quiz');
    const refreshData = await refresh.json().catch(() => null);
    if (refresh.ok && refreshData?.ok) {
      setQuizzes(refreshData.quizzes ?? []);
      setServerToday(refreshData.serverToday ?? null);
    }
  };

  const handleDelete = async (quizDate: string) => {
    setError(null);
    const res = await fetch(`/api/quiz/${quizDate}`, { method: 'DELETE' });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setError(data?.error || 'Failed to delete quiz.');
      return;
    }
    const refresh = await fetch('/api/quiz');
    const refreshData = await refresh.json().catch(() => null);
    if (refresh.ok && refreshData?.ok) {
      setQuizzes(refreshData.quizzes ?? []);
      setServerToday(refreshData.serverToday ?? null);
    }
  };

  const sortedQuizzes = useMemo(
    () =>
      [...quizzes].sort((a, b) => (a.quizDate < b.quizDate ? 1 : -1)),
    [quizzes]
  );

  const formatTitle = (quizDate: string) => {
    const date = new Date(`${quizDate}T00:00:00`);
    const label = date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
    });
    return `${label} Quiz`;
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Daily Quiz</h1>
          <p style={styles.subtitle}>Generated from today's chat.</p>
        </div>
        <button onClick={handleGenerate} style={styles.button} disabled={loading}>
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </header>
      <main style={styles.content}>
        {error && <div style={styles.error}>{error}</div>}
        {sortedQuizzes.length === 0 && !error && (
          <div style={styles.placeholder}>Generate your first quiz for today.</div>
        )}
        {sortedQuizzes.length > 0 && (
          <div style={styles.list}>
            {sortedQuizzes.map((quiz) => {
              const completed = Boolean(quiz.completedAt);
              return (
                <div key={quiz.quizDate} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <span style={styles.cardTitle}>{formatTitle(quiz.quizDate)}</span>
                    <span style={completed ? styles.statusDone : styles.statusPending}>
                      {completed
                        ? `${quiz.score ?? 0}/${quiz.totalCount} correct`
                        : 'Not started'}
                    </span>
                  </div>
                  <div style={styles.cardMeta}>
                    {quiz.totalCount} questions
                  </div>
                  <div style={styles.cardActions}>
                    <button
                      type="button"
                      style={styles.openButton}
                      onClick={() => router.push(`/quiz/${quiz.quizDate}`)}
                    >
                      {completed ? 'View results' : 'Start'}
                    </button>
                    <button
                      type="button"
                      style={styles.deleteButton}
                      onClick={() => handleDelete(quiz.quizDate)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!loading &&
          serverToday &&
          sortedQuizzes.every((quiz) => quiz.quizDate !== serverToday) && (
            <div style={styles.placeholder}>
              No quiz for today yet. Generate to create {formatTitle(serverToday)}.
            </div>
          )}
      </main>
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
    fontSize: '20px',
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
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: '700',
  },
  statusDone: {
    fontSize: '11px',
    color: 'var(--tg-accent)',
    background: 'rgba(31, 106, 224, 0.08)',
    padding: '4px 8px',
    borderRadius: '999px',
  },
  statusPending: {
    fontSize: '11px',
    color: 'var(--tg-subtext)',
    background: 'var(--tg-panel-soft)',
    padding: '4px 8px',
    borderRadius: '999px',
  },
  cardMeta: {
    fontSize: '12px',
    color: 'var(--tg-subtext)',
  },
  openButton: {
    alignSelf: 'flex-start',
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(42, 125, 246, 0.35)',
    background: 'white',
    color: 'var(--tg-accent)',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'pointer',
  },
  cardActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  deleteButton: {
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(214, 69, 69, 0.3)',
    background: 'white',
    color: '#d64545',
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
