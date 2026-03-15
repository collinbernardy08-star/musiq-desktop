import React, { useState, useEffect, useRef } from 'react';

const styles = {
  page: {
    height: '100%',
    overflowY: 'auto',
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 12,
  },
  nowPlaying: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: 20,
  },
  albumArt: {
    width: 88,
    height: 88,
    borderRadius: 8,
    objectFit: 'cover',
    flexShrink: 0,
    background: 'var(--bg-hover)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 32,
    color: 'var(--text-muted)',
  },
  badge: (color) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 100,
    fontSize: 11,
    fontWeight: 600,
    background: color === 'green' ? 'var(--accent-dim)' : 'rgba(255,255,255,0.06)',
    color: color === 'green' ? 'var(--accent)' : 'var(--text-muted)',
  }),
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
  },
  statCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  statusRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  statusCard: (active) => ({
    flex: 1,
    minWidth: 120,
    background: 'var(--bg-card)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 'var(--radius)',
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  }),
  dot: (active) => ({
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: active ? 'var(--accent)' : 'var(--text-muted)',
    display: 'inline-block',
    marginRight: 6,
    flexShrink: 0,
    ...(active && { animation: 'pulse 2s ease infinite' }),
  }),
  eqBar: (delay) => ({
    width: 3,
    borderRadius: 2,
    background: 'var(--accent)',
    animation: `equalizer 0.8s ease-in-out ${delay}s infinite alternate`,
  }),
};

function formatDuration(ms) {
  if (!ms && ms !== 0) return '0:00';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function EqualizerIcon() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16 }}>
      <div style={{ ...styles.eqBar(0), height: '60%' }} />
      <div style={{ ...styles.eqBar(0.2), height: '100%' }} />
      <div style={{ ...styles.eqBar(0.1), height: '40%' }} />
      <div style={{ ...styles.eqBar(0.3), height: '80%' }} />
    </div>
  );
}

function NowPlayingCard({ track }) {
  const [localProgress, setLocalProgress] = useState(track?.progress || 0);
  const tickRef = useRef(null);
  const lastSyncRef = useRef({ progress: track?.progress || 0, time: Date.now() });

  useEffect(() => {
    const p = track?.progress || 0;
    setLocalProgress(p);
    lastSyncRef.current = { progress: p, time: Date.now() };
  }, [track?.id, track?.progress]);

  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);

    if (track?.isPlaying) {
      tickRef.current = setInterval(() => {
        const elapsed = Date.now() - lastSyncRef.current.time;
        const estimated = lastSyncRef.current.progress + elapsed;
        const clamped = Math.min(estimated, track.duration || estimated);
        setLocalProgress(clamped);
      }, 500);
    }

    return () => clearInterval(tickRef.current);
  }, [track?.isPlaying, track?.id, track?.duration]);

  if (!track) {
    return (
      <div style={styles.nowPlaying}>
        <div style={styles.sectionTitle}>Jetzt läuft</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={styles.albumArt}>♪</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Nichts läuft gerade
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Öffne Spotify und spiele einen Song ab
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pct = track.duration ? Math.min((localProgress / track.duration) * 100, 100) : 0;

  return (
    <div style={styles.nowPlaying}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={styles.sectionTitle}>Jetzt läuft</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {track.isPlaying && <EqualizerIcon />}
          <span style={styles.badge(track.isPlaying ? 'green' : 'default')}>
            {track.isPlaying ? 'Spielt' : 'Pausiert'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        {track.albumArt ? (
          <img
            src={track.albumArt}
            alt={track.album}
            style={{
              ...styles.albumArt,
              background: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}
          />
        ) : (
          <div style={styles.albumArt}>♪</div>
        )}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{
            fontSize: 17,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: 5,
          }}>
            {track.name}
          </div>
          <div style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: 3,
          }}>
            {track.artist}
          </div>
          <div style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {track.album}
          </div>
        </div>
        {track.spotifyUrl && (
          <button
            style={{
              background: 'var(--accent-dim)',
              border: '1px solid rgba(29,185,84,0.3)',
              borderRadius: 8,
              padding: '8px 10px',
              color: 'var(--accent)',
              fontSize: 16,
              cursor: 'pointer',
              flexShrink: 0,
            }}
            onClick={() => window.electronAPI.openExternal(track.spotifyUrl)}
            title="Auf Spotify öffnen"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent)';
              e.currentTarget.style.color = '#000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent-dim)';
              e.currentTarget.style.color = 'var(--accent)';
            }}
          >
            ↗
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          minWidth: 36,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {formatDuration(localProgress)}
        </span>
        <div style={{
          flex: 1,
          position: 'relative',
          height: 4,
          background: 'var(--border)',
          borderRadius: 2,
          overflow: 'hidden',
          cursor: 'pointer',
        }}>
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${pct}%`,
            background: 'var(--accent)',
            borderRadius: 2,
            transition: 'width 0.5s linear',
          }} />
        </div>
        <span style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          minWidth: 36,
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {formatDuration(track.duration)}
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage({ session }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [stats, setStats] = useState({ tracksToday: 0, minutesToday: 0 });
  const [settings, setSettings] = useState({});

  useEffect(() => {
    window.electronAPI.getCurrentTrack().then(setCurrentTrack);
    window.electronAPI.getStats().then(setStats);
    window.electronAPI.getSettings().then(setSettings);

    const cleanup = window.electronAPI.onTrackChanged((track) => {
      setCurrentTrack(track);
      window.electronAPI.getStats().then(setStats);
    });

    return cleanup;
  }, []);

  const today = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div style={styles.page} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>Dashboard</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{today}</div>
        </div>
      </div>

      <NowPlayingCard track={currentTrack} />

      <div>
        <div style={styles.sectionTitle}>Heute</div>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.tracksToday || 0}</div>
            <div style={styles.statLabel}>Songs gehört</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.minutesToday || 0}</div>
            <div style={styles.statLabel}>Minuten Musik</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: 'var(--accent)', fontSize: 18 }}>✓</div>
            <div style={styles.statLabel}>Tracking aktiv</div>
          </div>
        </div>
      </div>

      <div>
        <div style={styles.sectionTitle}>Services</div>
        <div style={styles.statusRow}>
          <div style={styles.statusCard(true)}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={styles.dot(true)} />Spotify Tracking
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              alle {settings.trackingInterval || 30}s
            </div>
          </div>
          <div style={styles.statusCard(settings.discordRPC)}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={styles.dot(settings.discordRPC)} />Discord RPC
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              {settings.discordRPC ? 'Aktiv' : 'Deaktiviert'}
            </div>
          </div>
          <div style={styles.statusCard(true)}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={styles.dot(true)} />Supabase Sync
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Online</div>
          </div>
        </div>
      </div>

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Zur Web-App</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Vollständige Statistiken und mehr Features</div>
        </div>
        <button
          style={{
            padding: '8px 14px',
            background: 'var(--accent-dim)',
            border: '1px solid rgba(29,185,84,0.3)',
            borderRadius: 6,
            color: 'var(--accent)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onClick={() => window.electronAPI.openExternal('https://mus-iq.com')}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.color = '#000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent-dim)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
        >
          Öffnen ↗
        </button>
      </div>
    </div>
  );
}