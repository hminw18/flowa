/**
 * Message composer component
 * Input field and send button
 */

import { useState } from 'react';

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function Composer({ onSend, disabled = false }: ComposerProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.container}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        disabled={disabled}
        style={{
          ...styles.input,
          ...(disabled ? styles.inputDisabled : {}),
        }}
        maxLength={500}
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        style={{
          ...styles.button,
          ...(disabled || !text.trim() ? styles.buttonDisabled : {}),
        }}
      >
        ➤
      </button>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: '10px',
    padding: '16px 18px 20px',
    background: 'var(--tg-panel)',
    borderTop: '1px solid var(--tg-border)',
    boxShadow: '0 -8px 20px rgba(31, 42, 58, 0.04)',
  },
  input: {
    flex: 1,
    padding: '12px 18px',
    fontSize: '16px', // Prevent iOS zoom on input focus
    border: '1px solid transparent',
    borderRadius: '18px',
    background: 'var(--tg-panel-soft)',
    color: 'var(--tg-text)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: 'inset 0 0 0 1px rgba(42, 125, 246, 0.08)',
  },
  inputDisabled: {
    background: '#eef2f8',
    cursor: 'not-allowed',
  },
  button: {
    width: '44px',
    height: '44px',
    fontSize: '18px',
    fontWeight: '700',
    color: 'white',
    background: 'linear-gradient(135deg, var(--tg-accent), var(--tg-accent-strong))',
    border: 'none',
    borderRadius: '50%',
    transition: 'transform 0.2s, box-shadow 0.2s',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    boxShadow: '0 10px 18px rgba(42, 125, 246, 0.25)',
  },
  buttonDisabled: {
    background: '#c7d3e6',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
};
