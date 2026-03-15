import React from 'react';

const styles = {
  titlebar: {
    height: 'var(--titlebar-height)',
    background: 'var(--bg-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 8,
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
    WebkitAppRegion: 'drag',
    position: 'relative',
    zIndex: 100,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    WebkitAppRegion: 'no-drag',
  },
  logo: {
    width: 18,
    height: 18,
    background: 'var(--accent)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    letterSpacing: '0.02em',
  },
  controls: {
    display: 'flex',
    gap: 6,
    WebkitAppRegion: 'no-drag',
  },
  btn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: 16,
    transition: 'background 0.15s, color 0.15s',
    cursor: 'pointer',
    border: 'none',
  },
};

export default function TitleBar({ showControls }) {
  const handleBtnHover = (e, active) => {
    e.currentTarget.style.background = active ? 'var(--bg-hover)' : 'transparent';
    e.currentTarget.style.color = active ? 'var(--text-primary)' : 'var(--text-muted)';
  };
  const handleCloseHover = (e, active) => {
    e.currentTarget.style.background = active ? 'var(--red)' : 'transparent';
    e.currentTarget.style.color = active ? '#fff' : 'var(--text-muted)';
  };

  return (
    <div style={styles.titlebar}>
      <div style={styles.left}>
        <div style={styles.logo}>♪</div>
        <span style={styles.title}>MusIQ</span>
      </div>

      {showControls && (
        <div style={styles.controls}>
          <button
            style={styles.btn}
            onMouseEnter={(e) => handleBtnHover(e, true)}
            onMouseLeave={(e) => handleBtnHover(e, false)}
            onClick={() => window.electronAPI.minimizeWindow()}
            title="Minimieren"
          >
            ─
          </button>
          <button
            style={styles.btn}
            onMouseEnter={(e) => handleBtnHover(e, true)}
            onMouseLeave={(e) => handleBtnHover(e, false)}
            onClick={() => window.electronAPI.maximizeWindow()}
            title="Maximieren"
          >
            ▭
          </button>
          <button
            style={styles.btn}
            onMouseEnter={(e) => handleCloseHover(e, true)}
            onMouseLeave={(e) => handleCloseHover(e, false)}
            onClick={() => window.electronAPI.closeWindow()}
            title="Schließen"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
