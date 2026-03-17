import React, { useState, useEffect } from 'react';

const styles = {
  page: {
    height: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    boxSizing: 'border-box',
    width: '100%',
  },
  section: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    width: '100%',
    boxSizing: 'border-box',
  },
  sectionHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderRadius: 'var(--radius) var(--radius) 0 0',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    gap: 16,
    minHeight: 56,
    boxSizing: 'border-box',
    width: '100%',
  },
  rowLast: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    gap: 16,
    minHeight: 56,
    boxSizing: 'border-box',
    width: '100%',
  },
  rowLeft: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-primary)',
    marginBottom: 2,
  },
  rowDesc: {
    fontSize: 11,
    color: 'var(--text-muted)',
    lineHeight: 1.4,
  },
  toggle: (active) => ({
    width: 40,
    height: 22,
    borderRadius: 11,
    background: active ? 'var(--accent)' : 'var(--border-light)',
    position: 'relative',
    cursor: 'pointer',
    border: 'none',
    transition: 'background 0.2s',
    flexShrink: 0,
    display: 'inline-block',
  }),
  toggleKnob: (active) => ({
    position: 'absolute',
    top: 3,
    left: active ? 19 : 3,
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: '#fff',
    transition: 'left 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  }),
  select: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    padding: '6px 10px',
    fontSize: 12,
    cursor: 'pointer',
    outline: 'none',
    flexShrink: 0,
  },
  input: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    padding: '7px 10px',
    fontSize: 12,
    outline: 'none',
    width: '100%',
    marginTop: 8,
    fontFamily: 'monospace',
    boxSizing: 'border-box',
  },
  dangerBtn: {
    padding: '7px 12px',
    background: 'rgba(255,68,68,0.1)',
    border: '1px solid rgba(255,68,68,0.3)',
    borderRadius: 6,
    color: 'var(--red)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  saveBtn: {
    padding: '7px 12px',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 6,
    color: '#000',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    marginTop: 8,
  },
  savedBadge: {
    padding: '5px 10px',
    background: 'var(--accent-dim)',
    border: '1px solid rgba(29,185,84,0.3)',
    borderRadius: 6,
    color: 'var(--accent)',
    fontSize: 12,
    flexShrink: 0,
  },
  infoBox: {
    padding: '10px 16px',
    background: 'var(--bg-secondary)',
    fontSize: 11,
    color: 'var(--text-muted)',
    lineHeight: 1.6,
    borderTop: '1px solid var(--border)',
    borderRadius: '0 0 var(--radius) var(--radius)',
  },
  statusDot: (ok) => ({
    display: 'inline-block',
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: ok ? 'var(--accent)' : 'var(--red)',
    marginRight: 5,
    flexShrink: 0,
  }),
  updateBtn: (variant) => ({
    padding: '7px 14px',
    background: variant === 'primary' ? 'var(--accent)' : 'var(--bg-secondary)',
    border: variant === 'primary' ? 'none' : '1px solid var(--border)',
    borderRadius: 6,
    color: variant === 'primary' ? '#000' : 'var(--text-primary)',
    fontSize: 12,
    fontWeight: variant === 'primary' ? 700 : 400,
    cursor: 'pointer',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  }),
  progressBar: {
    height: 4,
    background: 'var(--border)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: (pct) => ({
    height: '100%',
    width: `${pct}%`,
    background: 'var(--accent)',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  }),
};

function Toggle({ value, onChange }) {
  return (
    <button style={styles.toggle(value)} onClick={() => onChange(!value)}>
      <div style={styles.toggleKnob(value)} />
    </button>
  );
}

// ─── Update Section ───────────────────────────────────────────────────────────
function UpdateSection({ appVersion }) {
  const [updateState, setUpdateState] = useState({ status: 'idle' });

  useEffect(() => {
    const cleanup = window.electronAPI.onUpdateStatus((data) => {
      setUpdateState(data);
    });
    return cleanup;
  }, []);

  const handleCheck = () => {
    setUpdateState({ status: 'checking' });
    window.electronAPI.checkForUpdates();
  };

  const handleDownload = () => {
    setUpdateState({ status: 'downloading', percent: 0 });
    window.electronAPI.downloadUpdate();
  };

  const handleInstall = () => window.electronAPI.installUpdate();

  const renderRight = () => {
    switch (updateState.status) {
      case 'checking':
        return (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Suche…
          </span>
        );
      case 'not-available':
        return <span style={{ fontSize: 12, color: 'var(--accent)', flexShrink: 0 }}>✓ Aktuell</span>;
      case 'available':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: 'var(--yellow)' }}>⬆ v{updateState.version} verfügbar</span>
            <button style={styles.updateBtn('primary')} onClick={handleDownload}>Herunterladen</button>
          </div>
        );
      case 'downloading':
        return (
          <div style={{ minWidth: 140, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {updateState.percent || 0}% …
            </span>
            <div style={styles.progressBar}>
              <div style={styles.progressFill(updateState.percent || 0)} />
            </div>
          </div>
        );
      case 'downloaded':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: 'var(--accent)' }}>✓ Bereit</span>
            <button style={styles.updateBtn('primary')} onClick={handleInstall}>Neu starten & installieren</button>
          </div>
        );
      case 'error':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: 'var(--red)' }}>✕ Fehler</span>
            <button style={styles.updateBtn('default')} onClick={handleCheck}>Erneut versuchen</button>
          </div>
        );
      default:
        return (
          <button
            style={styles.updateBtn('default')}
            onClick={handleCheck}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          >
            Nach Updates suchen
          </button>
        );
    }
  };

  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>⬆ Updates</div>
      <div style={styles.rowLast}>
        <div style={styles.rowLeft}>
          <div style={styles.rowLabel}>Mus-IQ Desktop</div>
          <div style={styles.rowDesc}>Aktuelle Version: {appVersion || '1.0.0'}</div>
        </div>
        {renderRight()}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsPage({ session, onLogout }) {
  const [settings, setSettings] = useState(null);
  const [savedMsg, setSavedMsg] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientIdSaved, setClientIdSaved] = useState(false);
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    window.electronAPI.getSettings().then((s) => {
      setSettings(s);
      setClientId(s.discordClientId || '');
    });
    window.electronAPI.getAppVersion().then(setAppVersion);
  }, []);

  const updateSetting = async (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await window.electronAPI.setSettings({ [key]: value });
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const saveClientId = async () => {
    const trimmed = clientId.trim();
    await window.electronAPI.setSettings({ discordClientId: trimmed });
    setSettings((s) => ({ ...s, discordClientId: trimmed }));
    setClientIdSaved(true);
    setTimeout(() => setClientIdSaved(false), 2000);
    if (settings.discordRPC) {
      await window.electronAPI.setSettings({ discordRPC: false });
      setTimeout(async () => { await window.electronAPI.setSettings({ discordRPC: true }); }, 500);
    }
  };

  if (!settings) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const hasClientId = !!(settings.discordClientId || '').trim();

  return (
    <div style={styles.page} className="fade-in">

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>Einstellungen</h1>
        {savedMsg && <div style={styles.savedBadge}>✓ Gespeichert</div>}
      </div>

      {/* Allgemein */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>⚙ Allgemein</div>
        <div style={styles.row}>
          <div style={styles.rowLeft}>
            <div style={styles.rowLabel}>Autostart</div>
            <div style={styles.rowDesc}>App beim Systemstart automatisch starten</div>
          </div>
          <Toggle value={settings.autostart} onChange={(v) => updateSetting('autostart', v)} />
        </div>
        <div style={styles.rowLast}>
          <div style={styles.rowLeft}>
            <div style={styles.rowLabel}>Im Tray minimieren</div>
            <div style={styles.rowDesc}>Beim Schließen in den Systembereich minimieren</div>
          </div>
          <Toggle value={settings.minimizeToTray} onChange={(v) => updateSetting('minimizeToTray', v)} />
        </div>
      </div>

      {/* Tracking */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>◎ Tracking</div>
        <div style={styles.row}>
          <div style={styles.rowLeft}>
            <div style={styles.rowLabel}>Tracking-Interval</div>
            <div style={styles.rowDesc}>Wie oft Spotify abgefragt wird</div>
          </div>
          <select
            style={styles.select}
            value={settings.trackingInterval}
            onChange={(e) => updateSetting('trackingInterval', Number(e.target.value))}
          >
            <option value={10}>10 Sek</option>
            <option value={15}>15 Sek</option>
            <option value={30}>30 Sek</option>
            <option value={60}>1 Min</option>
          </select>
        </div>
        <div style={styles.rowLast}>
          <div style={styles.rowLeft}>
            <div style={styles.rowLabel}>Benachrichtigungen</div>
            <div style={styles.rowDesc}>Systembenachrichtigung bei neuem Song</div>
          </div>
          <Toggle value={settings.notifications} onChange={(v) => updateSetting('notifications', v)} />
        </div>
      </div>

      {/* Discord */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>◈ Discord Rich Presence</div>
        <div style={styles.row}>
          <div style={styles.rowLeft}>
            <div style={styles.rowLabel}>Discord RPC aktivieren</div>
            <div style={styles.rowDesc}>Aktuellen Song im Discord-Status anzeigen</div>
          </div>
          <Toggle value={settings.discordRPC} onChange={(v) => updateSetting('discordRPC', v)} />
        </div>
        <div style={{ ...styles.row, opacity: settings.discordRPC ? 1 : 0.4, pointerEvents: settings.discordRPC ? 'auto' : 'none' }}>
          <div style={styles.rowLeft}>
            <div style={styles.rowLabel}>Fortschritt anzeigen</div>
            <div style={styles.rowDesc}>Restzeit des Songs in Discord zeigen</div>
          </div>
          <Toggle value={settings.discordShowProgress} onChange={(v) => updateSetting('discordShowProgress', v)} />
        </div>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={styles.rowLabel}>Discord Application ID</div>
            <div style={{ fontSize: 11, flexShrink: 0 }}>
              <span style={styles.statusDot(hasClientId)} />
              {hasClientId ? 'Eingetragen' : 'Fehlt'}
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
            Erstelle eine App auf{' '}
            <span style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => window.electronAPI.openExternal('https://discord.com/developers/applications')}>
              discord.com/developers
            </span>{' '}und füge die Application ID hier ein.
          </div>
          <input
            style={styles.input}
            placeholder="z.B. 1234567890123456789"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <button style={styles.saveBtn} onClick={saveClientId}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}>
              Speichern & Verbinden
            </button>
            {clientIdSaved && <span style={{ fontSize: 12, color: 'var(--accent)' }}>✓ Gespeichert!</span>}
          </div>
        </div>
        <div style={styles.infoBox}>
          💡 Schritte: 1. discord.com/developers öffnen → 2. "New Application" → 3. Namen eingeben → 4. Application ID kopieren → 5. Hier einfügen → 6. Speichern & Verbinden
        </div>
      </div>

      {/* Account */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>◉ Account</div>
        <div style={styles.row}>
          <div style={styles.rowLeft}>
            <div style={styles.rowLabel}>Angemeldet als</div>
            <div style={styles.rowDesc}>{session?.user?.email || 'Unbekannt'}</div>
          </div>
          <button style={styles.select} onClick={() => window.electronAPI.openExternal('https://mus-iq.lovable.app/settings')}>
            Web ↗
          </button>
        </div>
        <div style={styles.rowLast}>
          <div style={styles.rowLeft}>
            <div style={styles.rowLabel}>Abmelden</div>
            <div style={styles.rowDesc}>Session beenden und App zurücksetzen</div>
          </div>
          <button style={styles.dangerBtn} onClick={onLogout}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,68,68,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,68,68,0.1)'; }}>
            Abmelden
          </button>
        </div>
      </div>

      {/* Updates */}
      <UpdateSection appVersion={appVersion} />

    </div>
  );
}
