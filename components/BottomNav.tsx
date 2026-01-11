'use client';

import { usePathname, useRouter } from 'next/navigation';

type NavItem = {
  label: string;
  path: string;
  icon: (active: boolean) => React.ReactNode;
};

const iconColor = (active: boolean) => (active ? 'white' : 'var(--tg-subtext)');

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Chat',
    path: '/rooms',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconColor(active)} strokeWidth="2">
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      </svg>
    ),
  },
  {
    label: 'Review',
    path: '/review',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconColor(active)} strokeWidth="2">
        <path d="M3 5h18v14H3z" />
        <path d="M8 9l4 3-4 3z" />
      </svg>
    ),
  },
  {
    label: 'Saved',
    path: '/reports',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconColor(active)} strokeWidth="2">
        <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: 'Quiz',
    path: '/quiz',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconColor(active)} strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1.5 1.1-1.5 2.2" />
        <circle cx="12" cy="17" r="1" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav style={styles.nav}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
        return (
          <button
            key={item.path}
            type="button"
            onClick={() => router.push(item.path)}
            style={{
              ...styles.item,
              ...(isActive ? styles.itemActive : {}),
            }}
          >
            <span style={styles.icon}>{item.icon(isActive)}</span>
            <span style={styles.label}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
    padding: '8px 12px calc(8px + env(safe-area-inset-bottom))',
    background: 'var(--chat-bg)',
    borderTop: '1px solid var(--tg-border)',
    zIndex: 20,
  },
  item: {
    background: 'var(--tg-panel)',
    border: '1px solid rgba(216, 225, 238, 0.8)',
    borderRadius: '999px',
    padding: '8px 10px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--tg-subtext)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    justifyContent: 'center',
  },
  itemActive: {
    color: 'white',
    background: 'var(--tg-accent)',
    border: '1px solid var(--tg-accent)',
  },
  icon: {
    display: 'flex',
    alignItems: 'center',
  },
  label: {
    lineHeight: '1',
  },
};
