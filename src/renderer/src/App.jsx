import React, { useState, useEffect } from 'react';
import TitleBar from './components/TitleBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import StatsPage from './pages/StatsPage.jsx';

// Apply theme CSS variables to :root
function applyTheme(vars) {
  if (!vars || typeof vars !== 'object') return;
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('dark');

  useEffect(() => {
    const init = async () => {
      try {
        const s = await window.electronAPI.getSession();
        setSession(s);
      } catch (e) {
        console.error('Session load error:', e);
      } finally {
        setLoading(false);
      }
    };
    init();

    // Session restore after update restart
    const cleanupRestored = window.electronAPI.onSessionRestored((restoredSession) => {
      setSession(restoredSession);
      setLoading(false);
    });

    // Session expired
    const cleanupExpired = window.electronAPI.onSessionExpired(() => {
      setSession(null);
      setPage('dashboard');
      setSessionExpiredMsg(true);
    });

    // Theme sync from website – applied instantly when user changes theme on mus-iq.com
    const cleanupTheme = window.electronAPI.onThemeChanged((theme) => {
      console.log('[App] Theme synced from website:', theme.themeId);
      applyTheme(theme.vars);
      setCurrentTheme(theme.themeId);
    });

    return () => {
      cleanupRestored?.();
      cleanupExpired?.();
      cleanupTheme?.();
    };
  }, []);

  const handleLogin = async (newSession) => {
    await window.electronAPI.setSession(newSession);
    setSession(newSession);
    setSessionExpiredMsg(false);
  };

  const handleLogout = async () => {
    await window.electronAPI.logout();
    setSession(null);
    setPage('dashboard');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <TitleBar showControls />
        {sessionExpiredMsg && (
          <div style={{
            background: 'rgba(251,191,36,0.1)',
            border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: 8,
            padding: '10px 16px',
            margin: '12px 24px 0',
            fontSize: 13,
            color: '#fbbf24',
          }}>
            ⚠ Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.
          </div>
        )}
        <LoginPage onLogin={handleLogin} />
      </>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TitleBar showControls />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar currentPage={page} onNavigate={setPage} onLogout={handleLogout} session={session} />
        <main style={{ flex: 1, overflow: 'hidden' }}>
          {page === 'dashboard' && <DashboardPage session={session} />}
          {page === 'stats' && <StatsPage session={session} />}
          {page === 'settings' && <SettingsPage session={session} onLogout={handleLogout} currentTheme={currentTheme} />}
        </main>
      </div>
    </div>
  );
}
