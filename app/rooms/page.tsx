'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RoomSummary } from '@/lib/types';
import { GLOBAL_ROOM_NAME } from '@/lib/types';
import BottomNav from '@/components/BottomNav';

type User = { userId: string; username: string };

export default function RoomsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);

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

      const res = await fetch('/api/rooms');
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok) {
        setRooms(data.rooms);
      }
    };

    init();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Rooms</h1>
          <p style={styles.subtitle}>Welcome, {user.username}</p>
        </div>
        <button onClick={handleLogout} style={styles.logoutButton}>
          Log out
        </button>
      </header>

      <div style={styles.content}>
        {rooms.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>💬</div>
            <p style={styles.emptyText}>Loading rooms...</p>
          </div>
        )}
        <div style={styles.roomList}>
          {rooms.map((room) => {
            const title = room.name || GLOBAL_ROOM_NAME;
            const preview = room.lastMessage?.originalText || 'No messages yet. Start chatting!';

            return (
              <button
                key={room.roomId}
                style={styles.roomCard}
                onClick={() => router.push(`/room/${room.roomId}`)}
              >
                <div style={styles.roomIcon}>🌐</div>
                <div style={styles.roomInfo}>
                  <div style={styles.roomTitle}>{title}</div>
                  <div style={styles.roomPreview}>{preview}</div>
                </div>
                {room.unreadCount > 0 && (
                  <span style={styles.unreadBadge}>{room.unreadCount}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--tg-bg)',
    borderBottom: 'none',
    boxShadow: 'none',
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
  logoutButton: {
    padding: '8px 14px',
    borderRadius: '999px',
    border: '1px solid rgba(42, 125, 246, 0.35)',
    background: 'white',
    color: 'var(--tg-accent)',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'pointer',
  },
  content: {
    padding: 0,
    maxWidth: '100%',
    margin: 0,
  },
  roomList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  roomCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '18px 20px',
    borderRadius: '14px',
    border: '1px solid rgba(216, 225, 238, 0.8)',
    background: 'var(--tg-panel-soft)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  roomIcon: {
    fontSize: '32px',
    flexShrink: 0,
  },
  roomInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: 0,
  },
  roomTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--tg-text)',
  },
  roomPreview: {
    fontSize: '13px',
    color: 'var(--tg-subtext)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  unreadBadge: {
    minWidth: '24px',
    height: '24px',
    borderRadius: '999px',
    background: 'var(--tg-accent)',
    color: 'white',
    fontSize: '12px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 8px',
    flexShrink: 0,
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
    opacity: 0.6,
  },
  emptyText: {
    fontSize: '14px',
    color: 'var(--tg-subtext)',
    margin: 0,
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
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
