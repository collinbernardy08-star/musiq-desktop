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

// Sync state
let lastSyncedMinutesToday = 0;
let lastSyncedTracksToday = 0;
let lastSyncedDate = null;

// ─── Logging ──────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[Tracker] ${new Date().toISOString()} ${msg}`);
}
function logError(ctx, err) {
  console.error(`[Tracker][ERROR][${ctx}] ${err?.message || JSON.stringify(err)}`);
}

// ─── Token management ─────────────────────────────────────────────────────────

// ROOT CAUSE FIX: Central function that always returns a fresh, valid session.
// Previously, syncToSupabase used a potentially expired token – now ALL
// operations go through this function which refreshes automatically.
async function getFreshSession() {
  const session = store.get('session');
  if (!session) return null;

  // Check if token is about to expire (within 5 minutes)
  const expiresAt = session.expires_at; // unix timestamp in seconds
  const nowSec = Math.floor(Date.now() / 1000);
  const needsRefresh = !expiresAt || expiresAt - nowSec < 300;

  if (needsRefresh) {
    if (!session.refresh_token) {
      logError('getFreshSession', 'Token expired and no refresh_token available');
      return null;
    }
    try {
      log('Access token expiring soon, refreshing...');
      const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await sb.auth.refreshSession({
        refresh_token: session.refresh_token,
      });
      if (error || !data?.session) {
        logError('getFreshSession refresh', error);
        return null;
      }
      store.set('session', data.session);
      log('Token refreshed successfully');
      return data.session;
    } catch (err) {
      logError('getFreshSession refresh', err);
      return null;
    }
  }

  return session;
}

function getSupabase(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// ─── Spotify API ──────────────────────────────────────────────────────────────

async function callSpotifyAPI(endpoint, session) {
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await sb.functions.invoke('spotify-api', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { endpoint },
    });
    if (error) throw error;
    return data;
  } catch (err) {
    logError(`callSpotifyAPI(${endpoint})`, err);
    return null;
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function isValidTrack(track) {
  if (!track?.id || !track?.name || !track?.artist) {
    log(`Validation failed for track: ${JSON.stringify(track)}`);
    return false;
  }
  return true;
}

function sanitizeNumber(value, fallback = 0) {
  const n = Number(value);
  if (isNaN(n) || !isFinite(n) || n < 0) return fallback;
  return n;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getTodayDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' });
}

function getTodayKey() {
  return `localStats_${getTodayDate()}`;
}

function getLocalStats() {
  const raw = store.get(getTodayKey(), { tracksToday: 0, minutesToday: 0 });
  return {
    tracksToday: sanitizeNumber(raw.tracksToday),
    minutesToday: sanitizeNumber(raw.minutesToday),
  };
}

function checkDateRollover() {
  const today = getTodayDate();
  if (lastSyncedDate !== null && lastSyncedDate !== today) {
    log(`Date rollover: ${lastSyncedDate} → ${today} – resetting sync counters`);
    lastSyncedMinutesToday = 0;
    lastSyncedTracksToday = 0;
  }
  lastSyncedDate = today;
}

// ─── Local stats ──────────────────────────────────────────────────────────────

function addMinutesToLocal(deltaMs) {
  if (!deltaMs || deltaMs <= 0) return;
  const statsKey = getTodayKey();
  const stats = store.get(statsKey, { tracksToday: 0, minutesToday: 0 });
  stats.minutesToday = sanitizeNumber(stats.minutesToday) + deltaMs / 60000;
  store.set(statsKey, stats);
  store.set('localStats', {
    tracksToday: sanitizeNumber(stats.tracksToday),
    minutesToday: Math.round(sanitizeNumber(stats.minutesToday)),
  });
}

function addTrackToLocal() {
  const statsKey = getTodayKey();
  const stats = store.get(statsKey, { tracksToday: 0, minutesToday: 0 });
  stats.tracksToday = sanitizeNumber(stats.tracksToday) + 1;
  store.set(statsKey, stats);
  store.set('localStats', {
    tracksToday: sanitizeNumber(stats.tracksToday),
    minutesToday: Math.round(sanitizeNumber(stats.minutesToday)),
  });
}

// ─── Supabase sync ────────────────────────────────────────────────────────────

async function syncToSupabase(track, sessionArg) {
  if (!isValidTrack(track)) return;

  // ROOT CAUSE FIX: Always get a fresh session for Supabase writes,
  // not the potentially-expired session that was passed in
  const session = await getFreshSession();
  if (!session?.user?.id || !session?.access_token) {
    logError('syncToSupabase', 'No valid session available for sync');
    return;
  }

  checkDateRollover();

  const sb = getSupabase(session.access_token);
  const today = getTodayDate();
  const localStats = getLocalStats();

  const currentMinutes = Math.round(sanitizeNumber(localStats.minutesToday));
  const currentTracks = sanitizeNumber(localStats.tracksToday);

  const minutesDelta = Math.max(0, currentMinutes - lastSyncedMinutesToday);
  const tracksDelta = Math.max(0, currentTracks - lastSyncedTracksToday);

  log(`Syncing "${track.name}" | today: ${currentMinutes}min / ${currentTracks} tracks | delta: +${minutesDelta}min / +${tracksDelta} tracks`);

  // Step 1: Log play
  try {
    const { error } = await sb.from('background_tracked_plays').insert({
      user_id: session.user.id,
      track_id: track.id,
      track_name: track.name,
      artist_name: track.artist,
      album_name: track.album || '',
      album_image: track.albumArt || null,
      spotify_url: track.spotifyUrl || null,
      played_at: new Date().toISOString(),
    });
    if (error) logError('insert background_tracked_plays', error);
    else log(`Play logged: "${track.name}"`);
  } catch (err) {
    logError('insert background_tracked_plays', err);
  }

  // Step 2: Upsert daily stats
  try {
    if (currentMinutes > 0 || currentTracks > 0) {
      const { error } = await sb.from('daily_listening_stats').upsert({
        user_id: session.user.id,
        date: today,
        minutes_listened: currentMinutes,
        tracks_played: currentTracks,
      }, { onConflict: 'user_id,date' });
      if (error) logError('upsert daily_listening_stats', error);
      else log(`Daily stats: ${currentMinutes}min, ${currentTracks} tracks`);
    }
  } catch (err) {
    logError('upsert daily_listening_stats', err);
  }

  // Step 3: Update total stats (delta only)
  try {
    if (minutesDelta > 0 || tracksDelta > 0) {
      const { data: existing, error: fetchError } = await sb
        .from('listening_stats')
        .select('total_minutes, tracks_played')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (fetchError) {
        logError('fetch listening_stats', fetchError);
        return; // Don't write if we can't read
      }

      const existingMinutes = sanitizeNumber(existing?.total_minutes);
      const existingTracks = sanitizeNumber(existing?.tracks_played);
      const newMinutes = existingMinutes + minutesDelta;
      const newTracks = existingTracks + tracksDelta;

      if (newMinutes < existingMinutes || newTracks < existingTracks) {
        logError('listening_stats safety', `Refusing lower values: ${existingMinutes}→${newMinutes}, ${existingTracks}→${newTracks}`);
        return;
      }

      const { error: upsertError } = await sb.from('listening_stats').upsert({
        user_id: session.user.id,
        total_minutes: newMinutes,
        tracks_played: newTracks,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (upsertError) {
        logError('upsert listening_stats', upsertError);
      } else {
        lastSyncedMinutesToday = currentMinutes;
        lastSyncedTracksToday = currentTracks;
        log(`Total stats: ${existingMinutes}→${newMinutes}min, ${existingTracks}→${newTracks} tracks`);
      }
    }
  } catch (err) {
    logError('upsert listening_stats', err);
  }
}

// ─── Progress tracking ────────────────────────────────────────────────────────

function commitRemainingProgress(track) {
  if (!track || lastCommittedProgress <= 0) return;
  const remaining = sanitizeNumber((track.duration || 0) - lastCommittedProgress);
  if (remaining > 0 && remaining < 15000) {
    addMinutesToLocal(remaining);
    log(`+${Math.round(remaining / 1000)}s (end of track)`);
  }
}

function commitProgressDelta(currentProgress) {
  const delta = sanitizeNumber(currentProgress - lastCommittedProgress);
  if (delta < 5000) return;
  addMinutesToLocal(delta);
  lastCommittedProgress = currentProgress;
  const stats = getLocalStats();
  log(`+${Math.round(delta / 1000)}s → today: ${Math.round(stats.minutesToday)} min`);
}

// ─── Main poll ────────────────────────────────────────────────────────────────

async function pollCurrentTrack(onTrackChange) {
  try {
    checkDateRollover();

    // ROOT CAUSE FIX: Always use a fresh session for every poll
    const session = await getFreshSession();
    if (!session) {
      log('No valid session, skipping poll');
      return;
    }

    const data = await callSpotifyAPI('currently-playing', session);
    const isNothingPlaying = !data || Object.keys(data).length === 0 || !data.item;

    if (isNothingPlaying) {
      const prevTrack = store.get('currentTrack');
      if (prevTrack !== null) {
        store.set('currentTrack', null);
        onTrackChange(null);
      }
      if (activeTrackData) commitRemainingProgress(activeTrackData);
      activeTrackId = null;
      activeTrackData = null;
      lastCommittedProgress = 0;
      lastSeenProgress = 0;
      return;
    }

    const item = data.item;
    if (!item?.id || !item?.name) {
      log('Incomplete track data, skipping');
      return;
    }

    const track = {
      id: item.id,
      name: item.name,
      artist: item.artists?.map((a) => a.name).join(', ') || 'Unknown',
      album: item.album?.name || '',
      albumArt: item.album?.images?.[0]?.url || null,
      duration: sanitizeNumber(item.duration_ms),
      progress: sanitizeNumber(data.progress_ms),
      isPlaying: !!data.is_playing,
      spotifyUrl: item.external_urls?.spotify || null,
    };

    const currentProgress = sanitizeNumber(data.progress_ms);
    const isNewTrack = activeTrackId !== track.id;

    if (isNewTrack) {
      if (activeTrackData) {
        commitRemainingProgress(activeTrackData);
        await syncToSupabase(activeTrackData, session);
      }

      activeTrackId = track.id;
      activeTrackData = track;
      lastCommittedProgress = currentProgress;
      lastSeenProgress = currentProgress;

      addTrackToLocal();
      store.set('currentTrack', track);
      onTrackChange(track);
      log(`New track: "${track.name}" by ${track.artist}`);
      return;
    }

    if (track.isPlaying) {
      commitProgressDelta(currentProgress);
      lastSeenProgress = currentProgress;
    }

    activeTrackData = track;

    const prevTrack = store.get('currentTrack');
    if (prevTrack?.isPlaying !== track.isPlaying || prevTrack?.id !== track.id) {
      onTrackChange(track);
    }

    store.set('currentTrack', track);

  } catch (err) {
    logError('pollCurrentTrack', err);
  }
}

// ─── Start / Stop ─────────────────────────────────────────────────────────────

function startTracker(session, settings, onTrackChange) {
  if (trackerInterval) clearInterval(trackerInterval);

  lastSyncedMinutesToday = 0;
  lastSyncedTracksToday = 0;
  lastSyncedDate = getTodayDate();

  const intervalMs = sanitizeNumber((settings.trackingInterval || 30) * 1000, 30000);
  log(`Starting with ${intervalMs / 1000}s interval`);

  // Initial poll
  pollCurrentTrack(onTrackChange);

  // ROOT CAUSE FIX: Interval no longer passes session – each poll fetches
  // a fresh session itself, so expired tokens are always refreshed automatically
  trackerInterval = setInterval(() => {
    pollCurrentTrack(onTrackChange);
  }, intervalMs);
}

function stopTracker() {
  if (trackerInterval) {
    clearInterval(trackerInterval);
    trackerInterval = null;
    log('Stopped');
  }
}

module.exports = { startTracker, stopTracker };
