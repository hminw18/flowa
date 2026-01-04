'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');

  const handleJoinChat = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();

    if (trimmedUsername) {
      // Save username to sessionStorage
      sessionStorage.setItem('ci_messenger_username', trimmedUsername);
      router.push('/chat');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>CI Messenger</h1>
        <p style={styles.subtitle}>Real-time Group Chat with Translation</p>

        <form onSubmit={handleJoinChat} style={styles.form}>
          <label style={styles.label}>Enter your name:</label>
          <input
            type="text"
            placeholder="Your name (e.g., John)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            maxLength={20}
            autoFocus
          />
          <button
            type="submit"
            style={{
              ...styles.button,
              ...(username.trim() ? {} : styles.buttonDisabled),
            }}
            disabled={!username.trim()}
          >
            Join Chat
          </button>
        </form>

        <div style={styles.info}>
          <p style={styles.infoText}>
            Type in Korean and see English translations with highlighted expressions
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '48px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    maxWidth: '450px',
    width: '100%',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#333',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '40px',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#444',
  },
  input: {
    padding: '14px 16px',
    fontSize: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  info: {
    marginTop: '32px',
    padding: '16px',
    background: '#f5f7fa',
    borderRadius: '8px',
  },
  infoText: {
    fontSize: '13px',
    color: '#666',
    textAlign: 'center',
    margin: 0,
  },
};
