import React from 'react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'stats', label: 'Statistiken', icon: '◎' },
  { id: 'settings', label: 'Einstellungen', icon: '◉' },
];

const styles = {
  sidebar: {
    width: 200,
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '12px 8px',
    flexShrink: 0,
    overflow: 'hidden',
  },
  navItem: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    background: active ? 'var(--accent-dim)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    fontWeight: active ? 600 : 400,
    fontSize: 13,
    marginBottom: 2,
    transition: 'all 0.15s',
    border: 'none',
    width: '100%',
    textAlign: 'left',
  }),
  icon: {
    fontSize: 16,
    width: 20,
    textAlign: 'center',
    flexShrink: 0,
  },
  bottomSection: {
    marginTop: 'auto',
    borderTop: '1px solid var(--border)',
    paddingTop: 12,
  },
  userInfo: {
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    marginBottom: 4,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0,
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: 13,
    width: '100%',
    textAlign: 'left',
    border: 'none',
    transition: 'all 0.15s',
  },
  versionTag: {
    padding: '4px 12px',
    fontSize: 11,
    color: 'var(--text-muted)',
  },
};

export default function Sidebar({ currentPage, onNavigate, onLogout, session }) {
  const email = session?.user?.email || '';
  const initials = email ? email[0].toUpperCase() : '?';
  const displayName = session?.user?.user_metadata?.full_name || email.split('@')[0] || 'User';

  const hoverStyle = (e, enter) => {
    if (currentPage !== e.currentTarget.dataset.id) {
      e.currentTarget.style.background = enter ? 'var(--bg-hover)' : 'transparent';
      e.currentTarget.style.color = enter ? 'var(--text-primary)' : 'var(--text-secondary)';
    }
  };

  return (
    <aside style={styles.sidebar}>
      {/* Navigation */}
      <nav style={{ flex: 1 }}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            data-id={item.id}
            style={styles.navItem(currentPage === item.id)}
            onClick={() => onNavigate(item.id)}
            onMouseEnter={(e) => hoverStyle(e, true)}
            onMouseLeave={(e) => hoverStyle(e, false)}
          >
            <span style={styles.icon}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* User + Logout */}
      <div style={styles.bottomSection}>
        <div style={{ ...styles.userInfo, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={styles.avatar}>{initials}</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Verbunden</div>
          </div>
        </div>

        <button
          style={styles.logoutBtn}
          onClick={onLogout}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,68,68,0.1)'; e.currentTarget.style.color = 'var(--red)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <span style={styles.icon}>⏏</span>
          Abmelden
        </button>

        <div style={styles.versionTag}>v1.0.0</div>
      </div>
    </aside>
  );
}
