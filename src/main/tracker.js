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

function logError(context, err) {
  console.error(`[Tracker][ERROR][${context}] ${err?.message || err}`);
}

// ─── Supabase client ──────────────────────────────────────────────────────────

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
    logError('callSpotifyAPI', err);
    return null;
  }
}

// ─── Validation helpers ───────────────────────────────────────────────────────

// FIX: Validate track has all required fields before any write
function isValidTrack(track) {
  if (!track) { log('Validation failed: track is null'); return false; }
  if (!track.id) { log('Validation failed: track.id missing'); return false; }
  if (!track.name) { log('Validation failed: track.name missing'); return false; }
  if (!track.artist) { log('Validation failed: track.artist missing'); return false; }
  return true;
}

// FIX: Validate stats are real numbers, not NaN/null/undefined/negative
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

async function syncToSupabase(track, session) {
  // FIX: Validate everything before touching Supabase
  if (!session?.user?.id) { log('syncToSupabase skipped: no user id'); return; }
  if (!session?.access_token) { log('syncToSupabase skipped: no access token'); return; }
  if (!isValidTrack(track)) { log('syncToSupabase skipped: invalid track'); return; }

  checkDateRollover();

  const sb = getSupabase(session.access_token);
  const today = getTodayDate();
  const localStats = getLocalStats();

  const currentMinutes = Math.round(sanitizeNumber(localStats.minutesToday));
  const currentTracks = sanitizeNumber(localStats.tracksToday);

  // FIX: Additional sanity check – never write 0 minutes if we've been tracking
  if (currentMinutes < 0 || currentTracks < 0) {
    logError('syncToSupabase', `Refusing to sync negative stats: ${currentMinutes}min, ${currentTracks} tracks`);
    return;
  }

  const minutesDelta = Math.max(0, currentMinutes - lastSyncedMinutesToday);
  const tracksDelta = Math.max(0, currentTracks - lastSyncedTracksToday);

  log(`Syncing track "${track.name}" | today: ${currentMinutes}min / ${currentTracks} tracks | delta: +${minutesDelta}min / +${tracksDelta} tracks`);

  // ── Step 1: Log the play ──────────────────────────────────────────────────
  try {
    const { error } = await sb.from('background_tracked_plays').insert({
      user_id: session.user.id,
      track_id: track.id,
      track_name: track.name || 'Unknown',
      artist_name: track.artist || 'Unknown',
      album_name: track.album || '',
      album_image: track.albumArt || null,
      spotify_url: track.spotifyUrl || null,
      played_at: new Date().toISOString(),
    });
    if (error) logError('insert background_tracked_plays', error);
    else log(`Logged play: "${track.name}"`);
  } catch (err) {
    logError('insert background_tracked_plays', err);
    // Non-fatal: continue with stats sync
  }

  // ── Step 2: Upsert daily stats ────────────────────────────────────────────
  try {
    // FIX: Only upsert if we have real data (currentMinutes > 0 OR currentTracks > 0)
    // Never upsert zeros if it would overwrite existing data
    if (currentMinutes > 0 || currentTracks > 0) {
      const { error } = await sb.from('daily_listening_stats').upsert({
        user_id: session.user.id,
        date: today,
        minutes_listened: currentMinutes,
        tracks_played: currentTracks,
      }, { onConflict: 'user_id,date' });
      if (error) logError('upsert daily_listening_stats', error);
      else log(`Daily stats updated: ${currentMinutes}min, ${currentTracks} tracks`);
    } else {
      log('Skipping daily stats upsert: both values are 0');
    }
  } catch (err) {
    logError('upsert daily_listening_stats', err);
    // Non-fatal: continue
  }

  // ── Step 3: Update total stats (delta only) ───────────────────────────────
  try {
    if (minutesDelta > 0 || tracksDelta > 0) {
      // FIX: Read existing values first with explicit error handling
      const { data: existing, error: fetchError } = await sb
        .from('listening_stats')
        .select('total_minutes, tracks_played')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (fetchError) {
        logError('fetch listening_stats', fetchError);
        // STOP: don't write if we can't read – avoids overwriting with wrong data
        return;
      }

      const existingMinutes = sanitizeNumber(existing?.total_minutes);
      const existingTracks = sanitizeNumber(existing?.tracks_played);

      const newMinutes = existingMinutes + minutesDelta;
      const newTracks = existingTracks + tracksDelta;

      // FIX: Final safety check – new values must be >= existing values
      if (newMinutes < existingMinutes || newTracks < existingTracks) {
        logError('listening_stats safety check',
          `Refusing to write lower values: ${existingMinutes}→${newMinutes}min, ${existingTracks}→${newTracks} tracks`);
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
        log(`Total stats updated: ${existingMinutes}→${newMinutes}min, ${existingTracks}→${newTracks} tracks`);
      }
    } else {
      log('Skipping total stats update: delta is 0');
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
    log(`+${Math.round(remaining / 1000)}s (track end commit)`);
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

async function pollCurrentTrack(session, onTrackChange) {
  try {
    checkDateRollover();

    const data = await callSpotifyAPI('currently-playing', session.access_token);

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

    // FIX: Validate API response before using
    if (!item?.id || !item?.name) {
      log('Incomplete track data from API, skipping poll');
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
    log('Stopped');
  }
}

module.exports = { startTracker, stopTracker };
