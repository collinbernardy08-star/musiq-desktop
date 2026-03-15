import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lhhouxpwhteripljizul.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoaG91eHB3aHRlcmlwbGppenVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NjQyODEsImV4cCI6MjA4MTM0MDI4MX0.JA1mmBgMq_w3e46m_9PzkePIkHCCsMh7ksLMbz4-1L4'
);

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
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: 20,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  statItem: {
    padding: 16,
    background: 'var(--bg-secondary)',
    borderRadius: 8,
    border: '1px solid var(--border)',
  },
  bigNum: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--accent)',
    lineHeight: 1,
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  artistRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 0',
    borderBottom: '1px solid var(--border)',
  },
  rank: {
    fontSize: 12,
    color: 'var(--text-muted)',
    width: 20,
    textAlign: 'center',
    flexShrink: 0,
  },
  artistImg: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    objectFit: 'cover',
    background: 'var(--bg-hover)',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    color: 'var(--text-muted)',
  },
  skeleton: {
    background: 'var(--bg-hover)',
    borderRadius: 6,
    animation: 'pulse 1.5s ease infinite',
  },
};

function formatMinutes(mins) {
  if (!mins) return '0 Min';
  if (mins < 60) return `${mins} Min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function Skeleton({ width, height }) {
  return <div style={{ ...styles.skeleton, width, height: height || 16 }} />;
}

export default function StatsPage({ session }) {
  const [loading, setLoading] = useState(true);
  const [totalStats, setTotalStats] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [topTracks, setTopTracks] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [recentPlays, setRecentPlays] = useState([]);

  useEffect(() => {
    if (session?.user?.id) loadStats(session);
  }, [session]);

  async function loadStats(session) {
    setLoading(true);
    const userId = session.user.id;

    try {
      // Gesamt-Stats
      const { data: stats } = await supabase
        .from('listening_stats')
        .select('total_minutes, tracks_played')
        .eq('user_id', userId)
        .maybeSingle();
      setTotalStats(stats);

      // Letzte 7 Tage
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const { data: daily } = await supabase
        .from('daily_listening_stats')
        .select('date, minutes_listened, tracks_played')
        .eq('user_id', userId)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });
      setDailyStats(daily || []);

      // Top Tracks (letzte 50 plays)
      const { data: plays } = await supabase
        .from('background_tracked_plays')
        .select('track_id, track_name, artist_name, album_image')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .limit(200);

      if (plays) {
        // Count by track
        const trackCounts = {};
        plays.forEach((p) => {
          const key = p.track_id;
          if (!trackCounts[key]) {
            trackCounts[key] = { ...p, count: 0 };
          }
          trackCounts[key].count++;
        });
        const sorted = Object.values(trackCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setTopTracks(sorted);

        // Top Artists
        const artistCounts = {};
        plays.forEach((p) => {
          const key = p.artist_name;
          if (!artistCounts[key]) {
            artistCounts[key] = { name: key, image: p.album_image, count: 0 };
          }
          artistCounts[key].count++;
        });
        const sortedArtists = Object.values(artistCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setTopArtists(sortedArtists);

        // Recent plays
        setRecentPlays(plays.slice(0, 8));
      }
    } catch (err) {
      console.error('Stats load error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Build 7-day chart data (fill missing days with 0)
  const weekChart = (() => {
    const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const found = dailyStats.find((s) => s.date === dateStr);
      result.push({
        day: days[d.getDay() === 0 ? 6 : d.getDay() - 1],
        minutes: found?.minutes_listened || 0,
        tracks: found?.tracks_played || 0,
        isToday: i === 0,
      });
    }
    return result;
  })();

  const maxMinutes = Math.max(...weekChart.map((d) => d.minutes), 1);
  const weekTotal = weekChart.reduce((s, d) => s + d.minutes, 0);

  return (
    <div style={styles.page} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>Statistiken</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Synchronisiert von mus-iq.com</div>
        </div>
        <button
          style={{ padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}
          onClick={() => loadStats(session)}
        >
          ↻ Aktualisieren
        </button>
      </div>

      {/* Gesamt Stats */}
      <div>
        <div style={styles.sectionTitle}>Gesamt</div>
        <div style={styles.statsGrid}>
          <div style={styles.statItem}>
            {loading ? <Skeleton width={80} height={28} /> : (
              <div style={styles.bigNum}>{formatMinutes(totalStats?.total_minutes)}</div>
            )}
            <div style={styles.label}>Gesamte Hörzeit</div>
          </div>
          <div style={styles.statItem}>
            {loading ? <Skeleton width={60} height={28} /> : (
              <div style={styles.bigNum}>{(totalStats?.tracks_played || 0).toLocaleString()}</div>
            )}
            <div style={styles.label}>Songs insgesamt</div>
          </div>
        </div>
      </div>

      {/* Wochenübersicht */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={styles.sectionTitle}>Diese Woche</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{formatMinutes(weekTotal)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>7 Tage</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 90 }}>
          {weekChart.map((d) => {
            const pct = (d.minutes / maxMinutes) * 100;
            return (
              <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                {d.minutes > 0 && (
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{d.minutes}m</div>
                )}
                <div style={{
                  width: '100%',
                  height: `${Math.max(pct, 4)}%`,
                  background: d.isToday ? 'var(--accent)' : 'var(--border-light)',
                  borderRadius: '3px 3px 0 0',
                  minHeight: 4,
                  transition: 'height 0.4s ease',
                }} />
                <div style={{ fontSize: 11, color: d.isToday ? 'var(--accent)' : 'var(--text-muted)', fontWeight: d.isToday ? 600 : 400 }}>
                  {d.day}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Tracks */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Top Tracks (letzte 200 Plays)</div>
        {loading ? (
          [1,2,3].map(i => <div key={i} style={{ ...styles.artistRow }}><Skeleton width="100%" height={14} /></div>)
        ) : topTracks.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>Noch keine Daten</div>
        ) : topTracks.map((t, i) => (
          <div key={t.track_id} style={{ ...styles.artistRow, borderBottom: i === topTracks.length - 1 ? 'none' : '1px solid var(--border)' }}>
            <span style={styles.rank}>{i + 1}</span>
            {t.album_image ? (
              <img src={t.album_image} alt="" style={{ ...styles.artistImg, borderRadius: 4 }} />
            ) : (
              <div style={{ ...styles.artistImg, borderRadius: 4 }}>♪</div>
            )}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.track_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.artist_name}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{t.count}×</div>
          </div>
        ))}
      </div>

      {/* Top Artists */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Top Artists (letzte 200 Plays)</div>
        {loading ? (
          [1,2,3].map(i => <div key={i} style={styles.artistRow}><Skeleton width="100%" height={14} /></div>)
        ) : topArtists.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>Noch keine Daten</div>
        ) : topArtists.map((a, i) => (
          <div key={a.name} style={{ ...styles.artistRow, borderBottom: i === topArtists.length - 1 ? 'none' : '1px solid var(--border)' }}>
            <span style={styles.rank}>{i + 1}</span>
            <div style={styles.artistImg}>🎤</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{a.count} Plays</div>
          </div>
        ))}
      </div>

      {/* Zuletzt gehört */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Zuletzt gehört</div>
        {loading ? (
          [1,2,3].map(i => <div key={i} style={styles.artistRow}><Skeleton width="100%" height={14} /></div>)
        ) : recentPlays.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>Noch keine Daten</div>
        ) : recentPlays.map((p, i) => (
          <div key={`${p.track_id}-${i}`} style={{ ...styles.artistRow, borderBottom: i === recentPlays.length - 1 ? 'none' : '1px solid var(--border)' }}>
            {p.album_image ? (
              <img src={p.album_image} alt="" style={{ ...styles.artistImg, borderRadius: 4 }} />
            ) : (
              <div style={{ ...styles.artistImg, borderRadius: 4 }}>♪</div>
            )}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.track_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.artist_name}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}