const { createClient } = require('@supabase/supabase-js');
const Store = require('electron-store');

const store = new Store();

const SUPABASE_URL = 'https://lhhouxpwhteripljizul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoaG91eHB3aHRlcmlwbGppenVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NjQyODEsImV4cCI6MjA4MTM0MDI4MX0.JA1mmBgMq_w3e46m_9PzkePIkHCCsMh7ksLMbz4-1L4';

let trackerInterval = null;

// Per-track state
let activeTrackId = null;
let activeTrackData = null;
let lastCommittedProgress = 0;
let lastSeenProgress = 0;

// Track what we already synced to Supabase today to only send deltas
let lastSyncedMinutesToday = 0;
let lastSyncedTracksToday = 0;

function getSupabase(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function callSpotifyAPI(endpoint, accessToken) {
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await sb.functions.invoke('spotify-api', {
      headers: { Authorization: `Bearer ${accessToken}` },
      body: { endpoint },
    });
    if (error) {
      if (error.message?.includes('401') || error.message?.includes('non-2xx')) {
        const session = store.get('session');
        if (session?.refresh_token) {
          const { data: refreshData, error: refreshError } = await sb.auth.refreshSession({
            refresh_token: session.refresh_token,
          });
          if (!refreshError && refreshData.session) {
            store.set('session', refreshData.session);
            const { data: retryData, error: retryError } = await sb.functions.invoke('spotify-api', {
              headers: { Authorization: `Bearer ${refreshData.session.access_token}` },
              body: { endpoint },
            });
            if (retryError) throw retryError;
            return retryData;
          }
        }
      }
      throw error;
    }
    return data;
  } catch (err) {
    console.error(`[Tracker] Spotify API error (${endpoint}):`, err.message);
    return null;
  }
}

// ─── Local stats helpers ──────────────────────────────────────────────────────

function getTodayKey() {
  return `localStats_${new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' })}`;
}

function getTodayDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' });
}

function getLocalStats() {
  return store.get(getTodayKey(), { tracksToday: 0, minutesToday: 0 });
}

function addMinutesToLocal(deltaMs) {
  if (deltaMs <= 0) return;
  const statsKey = getTodayKey();
  const stats = store.get(statsKey, { tracksToday: 0, minutesToday: 0 });
  stats.minutesToday = (stats.minutesToday || 0) + deltaMs / 60000;
  store.set(statsKey, stats);
  store.set('localStats', {
    tracksToday: stats.tracksToday,
    minutesToday: Math.round(stats.minutesToday),
  });
}

function addTrackToLocal() {
  const statsKey = getTodayKey();
  const stats = store.get(statsKey, { tracksToday: 0, minutesToday: 0 });
  stats.tracksToday = (stats.tracksToday || 0) + 1;
  store.set(statsKey, stats);
  store.set('localStats', {
    tracksToday: stats.tracksToday,
    minutesToday: Math.round(stats.minutesToday || 0),
  });
}

// ─── Supabase sync ────────────────────────────────────────────────────────────

// FIX: Only sync the DELTA since last sync, not the full daily total each time.
// This prevents double-counting in listening_stats.total_minutes.
async function syncToSupabase(track, session) {
  if (!session?.user?.id || !track) return;

  try {
    const sb = getSupabase(session.access_token);
    const today = getTodayDate();
    const localStats = getLocalStats();

    const currentMinutes = Math.round(localStats.minutesToday || 0);
    const currentTracks = localStats.tracksToday || 0;

    // How much has changed since last sync?
    const minutesDelta = currentMinutes - lastSyncedMinutesToday;
    const tracksDelta = currentTracks - lastSyncedTracksToday;

    // 1. Log the play in background_tracked_plays
    await sb.from('background_tracked_plays').insert({
      user_id: session.user.id,
      track_id: track.id,
      track_name: track.name,
      artist_name: track.artist,
      album_name: track.album,
      album_image: track.albumArt,
      spotify_url: track.spotifyUrl,
      played_at: new Date().toISOString(),
    });

    // 2. Upsert daily stats (always write the current accurate total)
    await sb.from('daily_listening_stats').upsert({
      user_id: session.user.id,
      date: today,
      minutes_listened: currentMinutes,
      tracks_played: currentTracks,
    }, { onConflict: 'user_id,date' });

    // 3. FIX: Add only the DELTA to total stats, not the full daily total
    if (minutesDelta > 0 || tracksDelta > 0) {
      const { data: existing } = await sb
        .from('listening_stats')
        .select('total_minutes, tracks_played')
        .eq('user_id', session.user.id)
        .maybeSingle();

      await sb.from('listening_stats').upsert({
        user_id: session.user.id,
        total_minutes: (existing?.total_minutes || 0) + minutesDelta,
        tracks_played: (existing?.tracks_played || 0) + tracksDelta,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      // Remember what we synced
      lastSyncedMinutesToday = currentMinutes;
      lastSyncedTracksToday = currentTracks;
    }

    console.log(`[Tracker] Synced to Supabase: "${track.name}" (+${minutesDelta}min, +${tracksDelta} tracks)`);
  } catch (err) {
    console.error('[Tracker] Supabase sync error:', err.message);
  }
}

// ─── Progress tracking ────────────────────────────────────────────────────────

function commitRemainingProgress(track) {
  if (!track || lastCommittedProgress <= 0) return;
  const remaining = (track.duration || 0) - lastCommittedProgress;
  // Only count if song ended naturally (gap < 15s)
  if (remaining > 0 && remaining < 15000) {
    addMinutesToLocal(remaining);
    console.log(`[Tracker] +${Math.round(remaining / 1000)}s (track end)`);
  }
}

function commitProgressDelta(currentProgress) {
  const delta = currentProgress - lastCommittedProgress;
  if (delta < 5000) return; // ignore < 5s (jitter, seeks)
  addMinutesToLocal(delta);
  lastCommittedProgress = currentProgress;
  const stats = getLocalStats();
  console.log(`[Tracker] +${Math.round(delta / 1000)}s → today: ${Math.round(stats.minutesToday || 0)} min`);
}

// ─── Main poll ────────────────────────────────────────────────────────────────

async function pollCurrentTrack(session, onTrackChange) {
  try {
    const data = await callSpotifyAPI('currently-playing', session.access_token);

    // Nothing playing
    if (!data || !data.item) {
      const prevTrack = store.get('currentTrack');
      if (prevTrack !== null) {
        store.set('currentTrack', null);
        onTrackChange(null);
      }
      if (activeTrackData) {
        commitRemainingProgress(activeTrackData);
      }
      activeTrackId = null;
      activeTrackData = null;
      lastCommittedProgress = 0;
      lastSeenProgress = 0;
      return;
    }

    const item = data.item;
    const track = {
      id: item.id,
      name: item.name,
      artist: item.artists?.map((a) => a.name).join(', ') || '',
      album: item.album?.name || '',
      albumArt: item.album?.images?.[0]?.url || null,
      duration: item.duration_ms,
      progress: data.progress_ms || 0,
      isPlaying: data.is_playing,
      spotifyUrl: item.external_urls?.spotify || null,
    };

    const currentProgress = data.progress_ms || 0;
    const isNewTrack = activeTrackId !== track.id;

    if (isNewTrack) {
      // Commit remaining seconds of previous track
      if (activeTrackData) {
        commitRemainingProgress(activeTrackData);
        // Sync previous track to Supabase
        await syncToSupabase(activeTrackData, session);
      }

      // Reset state for new track
      activeTrackId = track.id;
      activeTrackData = track;
      lastCommittedProgress = currentProgress;
      lastSeenProgress = currentProgress;

      addTrackToLocal();
      store.set('currentTrack', track);
      onTrackChange(track);
      console.log(`[Tracker] New track: "${track.name}"`);
      return;
    }

    // Same track – commit progress delta if playing
    if (track.isPlaying) {
      commitProgressDelta(currentProgress);
      lastSeenProgress = currentProgress;
    }

    activeTrackData = track;

    // Notify renderer only if play/pause changed
    const prevTrack = store.get('currentTrack');
    if (prevTrack?.isPlaying !== track.isPlaying || prevTrack?.id !== track.id) {
      onTrackChange(track);
    }

    store.set('currentTrack', track);

  } catch (err) {
    console.error('[Tracker] Poll error:', err.message);
  }
}

function startTracker(session, settings, onTrackChange) {
  if (trackerInterval) clearInterval(trackerInterval);

  // Reset sync counters on start (new session)
  lastSyncedMinutesToday = 0;
  lastSyncedTracksToday = 0;

  const intervalMs = (settings.trackingInterval || 30) * 1000;
  console.log(`[Tracker] Starting with ${intervalMs / 1000}s interval`);

  pollCurrentTrack(session, onTrackChange);

  trackerInterval = setInterval(() => {
    const currentSession = store.get('session');
    if (currentSession) pollCurrentTrack(currentSession, onTrackChange);
  }, intervalMs);
}

function stopTracker() {
  if (trackerInterval) {
    clearInterval(trackerInterval);
    trackerInterval = null;
    console.log('[Tracker] Stopped');
  }
}

module.exports = { startTracker, stopTracker };
