'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type QuizItem = {
  prompt: string;
  answer: string;
  source: 'saved' | 'key';
};

type QuizResponse = QuizItem & {
  userAnswer: string;
  correct: boolean;
  suggestion?: string;
  firstAnswer?: string;
  finalAnswer?: string;
  correctOnFirst?: boolean;
};

type QuizData = {
  quizDate: string;
  createdAt: string;
  completedAt: string | null;
  score: number | null;
  items: QuizItem[];
  responses: QuizResponse[];
};

export default function QuizDetailPage({ params }: { params: { date: string } }) {
  const router = useRouter();
  const normalizedDate = useMemo(() => {
    const match = params.date.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const parsed = new Date(params.date);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return params.date;
  }, [params.date]);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState<
    Array<{
      attempts: number;
      firstAnswer?: string;
      firstCorrect?: boolean;
      finalAnswer?: string;
      suggestion?: string;
    }>
  >([]);

  useEffect(() => {
    const load = async () => {
      const me = await fetch('/api/auth/me');
      if (!me.ok) {
        router.push('/');
        return;
      }
      setLoading(true);
      const metaRes = await fetch('/api/quiz');
      let serverDate: string | null = null;
      if (metaRes.ok) {
        const metaData = await metaRes.json().catch(() => null);
        if (metaData?.ok) {
          serverDate = metaData.serverToday ?? null;
        }
      }
      const res = await fetch(`/api/quiz/${normalizedDate}`);
      setLoading(false);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        if (res.status === 404) {
          if (serverDate && normalizedDate === serverDate) {
            const create = await fetch('/api/quiz', { method: 'POST' });
            const createData = await create.json().catch(() => null);
            if (create.ok && createData?.ok) {
              const retry = await fetch(`/api/quiz/${normalizedDate}`);
              const retryData = await retry.json().catch(() => null);
              if (retry.ok && retryData?.ok) {
                setQuiz(retryData.quiz);
                setAnswers(new Array(retryData.quiz.items.length).fill(''));
                setCurrentIndex(0);
                setCurrentAnswer('');
                setFeedback(null);
                setSuggestion(null);
                setLastCorrect(null);
                setAttempts(
                  new Array(retryData.quiz.items.length).fill(null).map(() => ({
                    attempts: 0,
                  }))
                );
                return;
              }
            }
          }
        }
        setError(data?.error || 'Failed to load quiz.');
        return;
      }
      setQuiz(data.quiz);
      setAnswers(new Array(data.quiz.items.length).fill(''));
      setCurrentIndex(0);
      setCurrentAnswer('');
      setFeedback(null);
      setSuggestion(null);
      setLastCorrect(null);
      setAttempts(
        new Array(data.quiz.items.length).fill(null).map(() => ({
          attempts: 0,
        }))
      );
    };
    load();
  }, [normalizedDate, router]);

  useEffect(() => {
    setCurrentAnswer(answers[currentIndex] ?? '');
  }, [answers, currentIndex]);

  const title = useMemo(() => {
    const date = new Date(`${normalizedDate}T00:00:00`);
    const label = date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
    });
    return `${label} Quiz`;
  }, [normalizedDate]);

  const handleCheck = async () => {
    if (!quiz) return;
    if (!currentAnswer.trim()) return;
    setChecking(true);
    setFeedback(null);
    setSuggestion(null);
    setLastCorrect(null);

    const res = await fetch(`/api/quiz/${normalizedDate}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        index: currentIndex,
        userAnswer: currentAnswer.trim(),
      }),
    });
    setChecking(false);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setError(data?.error || 'Failed to check answer.');
      return;
    }

    setFeedback(data.feedback || null);
    setSuggestion(data.suggestion || null);
    setLastCorrect(Boolean(data.correct));

    setAttempts((prev) =>
      prev.map((entry, idx) => {
        if (idx !== currentIndex) return entry;
        const nextAttempts = entry.attempts + 1;
        const firstAnswer =
          entry.attempts === 0 ? currentAnswer.trim() : entry.firstAnswer;
        const firstCorrect =
          entry.attempts === 0 ? Boolean(data.correct) : entry.firstCorrect;
        const finalAnswer = data.correct ? currentAnswer.trim() : entry.finalAnswer;
        const suggestionText =
          data.correct && data.suggestion ? data.suggestion : entry.suggestion;
        return {
          attempts: nextAttempts,
          firstAnswer,
          firstCorrect,
          finalAnswer,
          suggestion: suggestionText,
        };
      })
    );

    if (data.correct) {
      const nextAnswers = [...answers];
      nextAnswers[currentIndex] = currentAnswer.trim();
      setAnswers(nextAnswers);
    }
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    setError(null);
    setSubmitting(true);
    const responses = quiz.items.map((item, idx) => ({
      ...item,
      userAnswer: answers[idx] || '',
      correct: Boolean(attempts[idx]?.firstCorrect),
      suggestion: attempts[idx]?.suggestion,
      firstAnswer: attempts[idx]?.firstAnswer,
      finalAnswer: attempts[idx]?.finalAnswer,
      correctOnFirst: attempts[idx]?.firstCorrect,
    }));
    const res = await fetch(`/api/quiz/${normalizedDate}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses }),
    });
    setSubmitting(false);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setError(data?.error || 'Failed to submit.');
      return;
    }
    setQuiz((prev) =>
      prev
        ? {
            ...prev,
            completedAt: new Date().toISOString(),
            score: data.score,
            responses: data.responses,
          }
        : prev
    );
  };

  const handleDelete = async () => {
    setError(null);
    const res = await fetch(`/api/quiz/${normalizedDate}`, { method: 'DELETE' });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setError(data?.error || 'Failed to delete quiz.');
      return;
    }
    router.push('/quiz');
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Quiz not found.</div>
      </div>
    );
  }

  const completed = Boolean(quiz.completedAt);
  const totalCount = quiz.items.length;
  const score = quiz.score ?? 0;
  const wrongResponses = completed
    ? quiz.responses.filter((res) =>
        typeof res.correctOnFirst === 'boolean' ? res.correctOnFirst === false : !res.correct
      )
    : [];
  const suggestionResponses = completed
    ? quiz.responses.filter((res) => res.suggestion && res.suggestion.trim().length > 0)
    : [];
  const canFinish = answers.every((answer) => answer.trim().length > 0);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={() => router.push('/quiz')} style={styles.backButton}>
          ←
        </button>
        <h1 style={styles.title}>{title}</h1>
        <button onClick={handleDelete} style={styles.deleteButton}>
          Delete
        </button>
      </header>

      <main style={styles.content}>
        {error && <div style={styles.error}>{error}</div>}

        {completed ? (
          <div style={styles.results}>
            <div style={styles.scoreCard}>
              <div style={styles.scoreLabel}>Score</div>
              <div style={styles.scoreValue}>
                {score}/{totalCount}
              </div>
            </div>
            <div style={styles.sectionTitle}>Native-sounding suggestions</div>
            {suggestionResponses.length === 0 ? (
              <div style={styles.placeholder}>No suggestions this time.</div>
            ) : (
              <div style={styles.list}>
                {suggestionResponses.map((res, idx) => (
                  <div key={`${res.prompt}-suggest-${idx}`} style={styles.card}>
                    <div style={styles.prompt}>{res.prompt}</div>
                    <div style={styles.answerRow}>
                      <span style={styles.answerLabel}>You wrote</span>
                      <span style={styles.answerText}>{res.finalAnswer || res.userAnswer || '—'}</span>
                    </div>
                    <div style={styles.answerRow}>
                      <span style={styles.answerLabel}>More natural</span>
                      <span style={styles.answerText}>{res.suggestion}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={styles.sectionTitle}>Wrong answers</div>
            {wrongResponses.length === 0 ? (
              <div style={styles.placeholder}>Perfect score. Nice work!</div>
            ) : (
              <div style={styles.list}>
                {wrongResponses.map((res, idx) => (
                  <div key={`${res.prompt}-${idx}`} style={styles.card}>
                    <div style={styles.prompt}>{res.prompt}</div>
                    <div style={styles.answerRow}>
                      <span style={styles.answerLabel}>You wrote</span>
                      <span style={styles.answerText}>{res.firstAnswer || res.userAnswer || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={styles.quizCard}>
            <div style={styles.progress}>
              Question {currentIndex + 1} of {totalCount}
            </div>
            <div style={styles.prompt}>{quiz.items[currentIndex]?.prompt}</div>
            <input
              type="text"
              value={currentAnswer}
              onChange={(event) => {
                setCurrentAnswer(event.target.value);
                if (lastCorrect !== null) {
                  setLastCorrect(null);
                  setFeedback(null);
                  setSuggestion(null);
                }
              }}
              placeholder="Type your answer..."
              style={styles.input}
              disabled={submitting || checking}
            />
            {feedback && (
              <div style={styles.feedback}>
                {feedback}
              </div>
            )}
            {lastCorrect && suggestion && (
              <div style={styles.suggestion}>
                More natural: {suggestion}
              </div>
            )}
            <div style={styles.actionRow}>
              {lastCorrect ? (
                <button
                  style={styles.nextButton}
                  onClick={() => {
                    if (currentIndex < totalCount - 1) {
                      setCurrentIndex((prev) => prev + 1);
                      setCurrentAnswer(answers[currentIndex + 1] ?? '');
                      setFeedback(null);
                      setSuggestion(null);
                      setLastCorrect(null);
                      return;
                    }
                    handleSubmit();
                  }}
                  disabled={submitting}
                >
                  {currentIndex === totalCount - 1 ? 'Finish' : 'Next'}
                </button>
              ) : (
                <button
                  style={styles.nextButton}
                  onClick={handleCheck}
                  disabled={submitting || checking}
                >
                  {checking ? 'Checking...' : 'Check'}
                </button>
              )}
              {currentIndex === totalCount - 1 && lastCorrect && !submitting && (
                <button
                  style={styles.secondaryButton}
                  onClick={handleSubmit}
                  disabled={!canFinish}
                >
                  Finish quiz
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'var(--tg-bg)',
    color: 'var(--tg-text)',
  },
  header: {
    padding: '12px 18px',
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
  },
  backButton: {
    justifySelf: 'start',
    background: 'none',
    border: 'none',
    color: 'var(--tg-text)',
    fontSize: '18px',
    cursor: 'pointer',
  },
  deleteButton: {
    justifySelf: 'end',
    background: 'none',
    border: 'none',
    color: '#d64545',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  title: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '700',
    textAlign: 'center',
  },
  content: {
    padding: '0 18px 24px',
  },
  loading: {
    padding: '30px',
    textAlign: 'center',
    color: 'var(--tg-subtext)',
  },
  quizCard: {
    background: 'var(--tg-panel)',
    border: '1px solid var(--tg-border)',
    borderRadius: '14px',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  feedback: {
    fontSize: '12px',
    color: 'var(--tg-subtext)',
  },
  suggestion: {
    fontSize: '12px',
    color: 'var(--tg-text)',
    fontStyle: 'italic',
  },
  progress: {
    fontSize: '12px',
    color: 'var(--tg-subtext)',
  },
  prompt: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--tg-text)',
  },
  input: {
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid var(--tg-border)',
    fontSize: '16px',
    outline: 'none',
    background: 'white',
    color: 'var(--tg-text)',
  },
  nextButton: {
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(42, 125, 246, 0.35)',
    background: 'white',
    color: 'var(--tg-accent)',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(216, 225, 238, 0.9)',
    background: 'var(--tg-panel-soft)',
    color: 'var(--tg-subtext)',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
  },
  results: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  scoreCard: {
    background: 'var(--tg-panel)',
    border: '1px solid var(--tg-border)',
    borderRadius: '14px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreLabel: {
    fontSize: '12px',
    color: 'var(--tg-subtext)',
  },
  scoreValue: {
    fontSize: '18px',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  card: {
    background: 'var(--tg-panel)',
    border: '1px solid var(--tg-border)',
    borderRadius: '12px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  answerRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  answerLabel: {
    fontSize: '11px',
    color: 'var(--tg-subtext)',
  },
  answerText: {
    fontSize: '13px',
    color: 'var(--tg-text)',
  },
  placeholder: {
    background: 'var(--tg-panel)',
    border: '1px solid var(--tg-border)',
    borderRadius: '12px',
    padding: '12px',
    fontSize: '12px',
    color: 'var(--tg-subtext)',
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
