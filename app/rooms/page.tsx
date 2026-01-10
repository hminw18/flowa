'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const GLOBAL_ROOM_ID = 'global';

export default function RoomsPage() {
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      // Check auth
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

      // Redirect to global room
      router.push(`/room/${GLOBAL_ROOM_ID}`);
    };

    init();
  }, [router]);

  // Show loading state while redirecting
  return (
    <div style={styles.container}>
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Joining chat...</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'var(--tg-bg)',
    color: 'var(--tg-text)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(42, 125, 246, 0.2)',
    borderTop: '4px solid var(--tg-accent)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '15px',
    color: 'var(--tg-subtext)',
    margin: 0,
  },
};
