import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lhhouxpwhteripljizul.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoaG91eHB3aHRlcmlwbGppenVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NjQyODEsImV4cCI6MjA4MTM0MDI4MX0.JA1mmBgMq_w3e46m_9PzkePIkHCCsMh7ksLMbz4-1L4'
);

const styles = {
  container: {
    display: 'flex',
    height: 'calc(100vh - var(--titlebar-height))',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: 36,
    animation: 'fadeIn 0.3s ease',
  },
  logo: {
    width: 52,
    height: 52,
    background: 'var(--accent)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    margin: '0 auto 20px',
  },
  title: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 6,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 13,
    color: 'var(--text-secondary)',
    marginBottom: 28,
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: 14,
    marginBottom: 10,
    transition: 'border-color 0.15s',
  },
  btn: {
    width: '100%',
    padding: '12px',
    background: 'var(--accent)',
    color: '#000',
    fontWeight: 700,
    fontSize: 14,
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    cursor: 'pointer',
    marginTop: 4,
    transition: 'background 0.15s',
  },
  error: {
    background: 'rgba(255,68,68,0.1)',
    border: '1px solid rgba(255,68,68,0.3)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    color: 'var(--red)',
    fontSize: 13,
    marginBottom: 14,
  },
  success: {
    background: 'rgba(29,185,84,0.1)',
    border: '1px solid rgba(29,185,84,0.3)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    color: 'var(--accent)',
    fontSize: 13,
    marginBottom: 14,
  },
  link: {
    background: 'none',
    border: 'none',
    color: 'var(--accent)',
    cursor: 'pointer',
    fontSize: 13,
    textDecoration: 'underline',
    padding: 0,
  },
  divider: {
    textAlign: 'center',
    margin: '16px 0',
    color: 'var(--text-muted)',
    fontSize: 12,
    position: 'relative',
  },
};

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session) {
          onLogin(data.session);
        }
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess('Bestätigungs-Email gesendet! Bitte überprüfe dein Postfach.');
        setMode('login');
      }
    } catch (err) {
      setError(err.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const inputFocus = (e) => { e.target.style.borderColor = 'var(--accent)'; };
  const inputBlur = (e) => { e.target.style.borderColor = 'var(--border)'; };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>♪</div>
        <h1 style={styles.title}>Spotify Tracker</h1>
        <p style={styles.subtitle}>
          {mode === 'login'
            ? 'Melde dich mit deinem Account an'
            : 'Erstelle einen neuen Account'}
        </p>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            onFocus={inputFocus}
            onBlur={inputBlur}
            required
          />
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            onFocus={inputFocus}
            onBlur={inputBlur}
            required
          />
          <button
            type="submit"
            style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
            onMouseEnter={(e) => { if (!loading) e.target.style.background = 'var(--accent-hover)'; }}
            onMouseLeave={(e) => { e.target.style.background = 'var(--accent)'; }}
          >
            {loading ? 'Laden...' : mode === 'login' ? 'Anmelden' : 'Registrieren'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
          {mode === 'login' ? (
            <>
              Kein Account?{' '}
              <button style={styles.link} onClick={() => { setMode('register'); setError(''); }}>
                Registrieren
              </button>
            </>
          ) : (
            <>
              Schon ein Account?{' '}
              <button style={styles.link} onClick={() => { setMode('login'); setError(''); }}>
                Anmelden
              </button>
            </>
          )}
        </div>

        <div style={{ marginTop: 20, padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          💡 Verwende die gleichen Anmeldedaten wie auf{' '}
          <button
            style={{ ...styles.link, fontSize: 12 }}
            onClick={() => window.electronAPI.openExternal('https://mus-iq.com')}
          >
            mus-iq.com
          </button>
        </div>
      </div>
    </div>
  );
}
