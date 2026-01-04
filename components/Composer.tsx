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
        placeholder="Type a message in Korean..."
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
        Send
      </button>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: '8px',
    padding: '16px',
    background: 'white',
    borderTop: '1px solid #e0e0e0',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '24px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  inputDisabled: {
    background: '#f5f5f5',
    cursor: 'not-allowed',
  },
  button: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    background: '#007bff',
    border: 'none',
    borderRadius: '24px',
    transition: 'background 0.2s',
    whiteSpace: 'nowrap',
  },
  buttonDisabled: {
    background: '#cccccc',
    cursor: 'not-allowed',
  },
};
