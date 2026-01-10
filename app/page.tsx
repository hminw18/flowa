'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { reconnectSocket } from '@/lib/socket-client';
import { Language, LANGUAGE_NAMES, LANGUAGE_FLAGS } from '@/lib/types';

const NATIVE_LANGUAGES: Language[] = ['ko', 'en'];
const LEARNING_LANGUAGES: Language[] = ['ko', 'en', 'es'];

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState<Language | null>(null);
  const [learningLanguage, setLearningLanguage] = useState<Language | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        router.replace('/rooms');
      }
    };
    checkSession();
  }, [router]);

  const handleJoin = async () => {
    setError(null);
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setError('Please enter a username');
      return;
    }

    // Admin can skip language selection
    if (trimmedUsername.toLowerCase() === 'admin') {
      setLoading(true);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: trimmedUsername,
          nativeLanguage: 'ko',
          learningLanguage: 'en',
        }),
      });
      setLoading(false);

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setError(data?.error || 'Failed to join');
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
      reconnectSocket();
      router.push('/rooms');
      return;
    }

    // Regular users need to select languages
    if (!nativeLanguage) {
      setError('Please select your native language');
      return;
    }

    if (!learningLanguage) {
      setError('Please select the language you want to learn');
      return;
    }

    setLoading(true);
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: trimmedUsername,
        nativeLanguage,
        learningLanguage,
      }),
    });
    setLoading(false);

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      setError(data?.error || 'Failed to join');
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
    reconnectSocket();
    router.push('/rooms');
  };

  const availableLearningLanguages = learningLanguage ? LEARNING_LANGUAGES : LEARNING_LANGUAGES.filter((lang) => lang !== nativeLanguage);

  return (
    <div style={styles.container}>
      <div style={styles.card} className="login-card">
        <h1 style={styles.title}>Language Exchange Chat</h1>
        <p style={styles.subtitle}>Connect and learn together</p>

        <div style={styles.form}>
          <label style={styles.label}>Your Name</label>
          <input
            type="text"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (error) setError(null);
            }}
            style={styles.input}
            maxLength={20}
            autoFocus
          />

          <label style={styles.label}>Native Language</label>
          <div style={styles.buttonGroup}>
            {NATIVE_LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => {
                  setNativeLanguage(lang);
                  if (learningLanguage === lang) {
                    setLearningLanguage(null);
                  }
                  if (error) setError(null);
                }}
                style={{
                  ...styles.langButton,
                  ...(nativeLanguage === lang ? styles.langButtonActive : {}),
                }}
              >
                <span style={styles.langFlag}>{LANGUAGE_FLAGS[lang]}</span>
                <span style={styles.langName}>{LANGUAGE_NAMES[lang]}</span>
              </button>
            ))}
          </div>

          <label style={styles.label}>Learning Language</label>
          <div style={styles.buttonGroup}>
            {LEARNING_LANGUAGES.map((lang) => {
              const disabled = lang === nativeLanguage;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    if (!disabled) {
                      setLearningLanguage(lang);
                      if (error) setError(null);
                    }
                  }}
                  disabled={disabled}
                  style={{
                    ...styles.langButton,
                    ...(learningLanguage === lang ? styles.langButtonActive : {}),
                    ...(disabled ? styles.langButtonDisabled : {}),
                  }}
                >
                  <span style={styles.langFlag}>{LANGUAGE_FLAGS[lang]}</span>
                  <span style={styles.langName}>{LANGUAGE_NAMES[lang]}</span>
                </button>
              );
            })}
          </div>

          {error && <div style={styles.errorText}>{error}</div>}

          <button
            type="button"
            onClick={handleJoin}
            style={styles.primaryButton}
            disabled={loading}
          >
            {loading ? 'Joining...' : 'Join Chat'}
          </button>
        </div>

        <div style={styles.info}>
          <p style={styles.infoText}>
            Select your native language and the language you want to practice.
          </p>
          <p style={styles.infoText}>
            Admin? Just type "admin" and join.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '20px',
    background: 'linear-gradient(140deg, #c7d9ff 0%, #edf2ff 45%, #e7f0ff 100%)',
  },
  card: {
    background: 'var(--tg-panel)',
    borderRadius: '18px',
    padding: '44px 32px',
    boxShadow: '0 24px 60px rgba(31, 42, 58, 0.18)',
    maxWidth: '460px',
    width: '100%',
    border: '1px solid rgba(216, 225, 238, 0.7)',
  },
  title: {
    fontSize: '26px',
    fontWeight: '700',
    marginBottom: '8px',
    color: 'var(--tg-text)',
    textAlign: 'center',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--tg-subtext)',
    marginBottom: '32px',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--tg-text)',
    marginTop: '8px',
  },
  input: {
    padding: '14px 16px',
    fontSize: '15px',
    border: '1px solid var(--tg-border)',
    borderRadius: '12px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    background: 'var(--tg-panel-soft)',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  langButton: {
    flex: 1,
    minWidth: '120px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    border: '2px solid var(--tg-border)',
    borderRadius: '12px',
    background: 'var(--tg-panel-soft)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  langButtonActive: {
    background: 'var(--tg-accent)',
    borderColor: 'var(--tg-accent)',
    color: 'white',
  },
  langButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  langFlag: {
    fontSize: '20px',
  },
  langName: {
    fontSize: '14px',
    fontWeight: '600',
  },
  primaryButton: {
    width: '100%',
    padding: '14px 20px',
    fontSize: '15px',
    fontWeight: '700',
    color: 'white',
    background: 'linear-gradient(135deg, var(--tg-accent), var(--tg-accent-strong))',
    border: 'none',
    borderRadius: '999px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 14px 26px rgba(42, 125, 246, 0.25)',
    marginTop: '8px',
  },
  info: {
    marginTop: '28px',
    padding: '14px 16px',
    background: 'var(--tg-panel-soft)',
    borderRadius: '12px',
    border: '1px solid rgba(216, 225, 238, 0.6)',
  },
  infoText: {
    fontSize: '12px',
    color: 'var(--tg-subtext)',
    textAlign: 'center',
    margin: '4px 0',
  },
  errorText: {
    fontSize: '12px',
    color: '#d64545',
    background: 'rgba(214, 69, 69, 0.08)',
    padding: '8px 10px',
    borderRadius: '10px',
    border: '1px solid rgba(214, 69, 69, 0.2)',
  },
};
