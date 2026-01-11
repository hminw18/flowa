'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

type SavedExpression = {
  messageId: string;
  originalText: string;
  translatedText: string | null;
  targetLanguage: string;
  createdAt: string;
};

type Suggestion = {
  messageId: string;
  text: string;
  senderUsername: string | null;
};

export default function ReportsPage() {
  const router = useRouter();
  const [saved, setSaved] = useState<SavedExpression[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const check = async () => {
      const me = await fetch('/api/auth/me');
      if (!me.ok) {
        router.push('/');
        return;
      }
      setLoading(true);
      const [savedRes, idsRes] = await Promise.all([
        fetch('/api/saved/expressions'),
        fetch('/api/saved'),
      ]);
      setLoading(false);
      if (savedRes.ok) {
        const data = await savedRes.json();
        if (data.ok) setSaved(data.items || []);
      }
      if (idsRes.ok) {
        const data = await idsRes.json();
        if (data.ok && Array.isArray(data.savedMessageIds)) {
          setSavedIds(new Set(data.savedMessageIds));
        }
      }
    };
    check();
  }, [router]);

  const refreshSaved = async () => {
    const [savedRes, idsRes] = await Promise.all([
      fetch('/api/saved/expressions'),
      fetch('/api/saved'),
    ]);
    if (savedRes.ok) {
      const data = await savedRes.json();
      if (data.ok) setSaved(data.items || []);
    }
    if (idsRes.ok) {
      const data = await idsRes.json();
      if (data.ok && Array.isArray(data.savedMessageIds)) {
        setSavedIds(new Set(data.savedMessageIds));
      }
    }
  };

  const handleGenerateSuggestions = async () => {
    setError(null);
    setSuggestLoading(true);
    const res = await fetch('/api/saved/suggestions', { method: 'POST' });
    setSuggestLoading(false);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setError(data?.error || 'Failed to generate suggestions.');
      return;
    }
    setSuggestions(data.items || []);
  };

  const handleSaveSuggestion = async (messageId: string) => {
    setError(null);
    const res = await fetch('/api/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, action: 'save' }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setError(data?.error || 'Failed to save.');
      return;
    }
    await refreshSaved();
  };

  const suggestionItems = useMemo(
    () =>
      suggestions.map((item) => ({
        ...item,
        saved: savedIds.has(item.messageId),
      })),
    [suggestions, savedIds]
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Saved Expressions</h1>
        <p style={styles.subtitle}>Keep the phrases you want to remember.</p>
      </header>
      <main style={styles.content}>
        {error && <div style={styles.error}>{error}</div>}

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
          </div>
          {loading && <div style={styles.placeholder}>Loading...</div>}
          {!loading && saved.length === 0 && (
            <div style={styles.placeholder}>No saved expressions yet.</div>
          )}
          {!loading && saved.length > 0 && (
            <div style={styles.listPlain}>
              {saved.map((item) => (
                <div key={item.messageId} style={styles.row}>
                  <div style={styles.rowMain}>{item.originalText}</div>
                  {item.translatedText && (
                    <div style={styles.rowSub}>{item.translatedText}</div>
                  )}
                  <div style={styles.rowMeta}>
                    {item.targetLanguage.toUpperCase()} · {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Today’s key expressions</h2>
            </div>
            <button
              onClick={() => setShowSuggestions((prev) => !prev)}
              style={styles.ghostButton}
            >
              {showSuggestions ? 'Hide' : 'Show'}
            </button>
          </div>
          {showSuggestions && (
            <div style={styles.suggestionPanel}>
              <button
                onClick={handleGenerateSuggestions}
                style={styles.button}
                disabled={suggestLoading}
              >
                {suggestLoading ? 'Generating...' : 'Generate 3'}
              </button>
              {suggestionItems.length === 0 && (
                <div style={styles.placeholder}>No suggestions yet. Generate to see 3 picks.</div>
              )}
              {suggestionItems.length > 0 && (
                <div style={styles.listPlain}>
                  {suggestionItems.map((item) => (
                    <div key={item.messageId} style={styles.row}>
                      <div style={styles.rowMain}>{item.text}</div>
                      {item.senderUsername && (
                        <div style={styles.rowMeta}>From {item.senderUsername}</div>
                      )}
                      <button
                        style={item.saved ? styles.buttonSaved : styles.button}
                        onClick={() => handleSaveSuggestion(item.messageId)}
                        disabled={item.saved}
                      >
                        {item.saved ? 'Saved' : 'Save'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
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
    marginBottom: '18px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '10px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '700',
    margin: 0,
  },
  sectionSubtitle: {
    fontSize: '12px',
    color: 'var(--tg-subtext)',
    marginTop: '4px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  listPlain: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  row: {
    padding: '8px 2px',
    borderBottom: '1px solid var(--tg-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  rowMain: {
    fontSize: '14px',
    color: 'var(--tg-text)',
  },
  rowSub: {
    fontSize: '13px',
    color: 'var(--tg-subtext)',
  },
  rowMeta: {
    fontSize: '11px',
    color: 'var(--tg-subtext)',
  },
  placeholder: {
    background: 'var(--tg-panel)',
    border: '1px solid var(--tg-border)',
    borderRadius: '12px',
    padding: '12px',
    fontSize: '12px',
    color: 'var(--tg-subtext)',
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
    whiteSpace: 'nowrap',
  },
  ghostButton: {
    padding: '6px 10px',
    borderRadius: '10px',
    border: '1px solid rgba(216, 225, 238, 0.9)',
    background: 'transparent',
    color: 'var(--tg-subtext)',
    fontWeight: '600',
    fontSize: '11px',
    cursor: 'pointer',
  },
  buttonSaved: {
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(216, 225, 238, 0.9)',
    background: 'var(--tg-panel-soft)',
    color: 'var(--tg-subtext)',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'not-allowed',
    whiteSpace: 'nowrap',
  },
  suggestionPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '12px',
    border: '1px dashed var(--tg-border)',
    background: 'var(--tg-panel-soft)',
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
