const { createClient } = require('@supabase/supabase-js');
const Store = require('electron-store');

const store = new Store();

const SUPABASE_URL = 'https://lhhouxpwhteripljizul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoaG91eHB3aHRlcmlwbGppenVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NjQyODEsImV4cCI6MjA4MTM0MDI4MX0.JA1mmBgMq_w3e46m_9PzkePIkHCCsMh7ksLMbz4-1L4';

let realtimeInterval = null;
let syncInterval = null;

// Per-track state
let activeTrackId = null;
let activeTrackData = null;
let lastCommittedProgress = 0;
let lastSeenProgress = 0;

// Sync state
let lastSyncedMinutesToday = 0;
let lastSyncedTracksToday = 0;
let lastSyncedDate = null;

// Session state
let isRefreshing = false;
let sessionExpiredNotified = false;
let onSessionExpiredCallback = null;

// ─── Logging ──────────────────────────────────────────────────────────────────
function log(msg) { console.log(`[Tracker] ${new Date().toISOString()} ${msg}`); }
function logError(ctx, err) { console.error(`[Tracker][ERROR][${ctx}]`, err?.message || err); }

// ─── Session management ───────────────────────────────────────────────────────
// ROOT CAUSE FIX: "Already Used" happens when web app and desktop app both try
// to refresh the same token simultaneously. Solution:
// 1. Only refresh if truly needed (token expires in < 5 min)
// 2. If refresh fails with "Already Used", wait briefly and re-read the store
//    (the web app may have already refreshed it and saved the new token)
// 3. Never aggressively invalidate the session on a single refresh failure
async function getFreshSession() {
  // Prevent concurrent refresh attempts
  if (isRefreshing) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return store.get('session');
  }

  const session = store.get('session');
  if (!session?.refresh_token) return null;

  const expiresAt = session.expires_at;
  const nowSec = Math.floor(Date.now() / 1000);
  const needsRefresh = !expiresAt || (expiresAt - nowSec) < 300;

  if (!needsRefresh) {
    sessionExpiredNotified = false;
    return session;
  }

  isRefreshing = true;
  try {
    log('Token expiring – refreshing...');
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await sb.auth.refreshSession({
      refresh_token: session.refresh_token,
    });

    if (error) {
      // FIX: "Already Used" means the web app already refreshed this token
      // Wait 2 seconds and re-read the store – web app saved the new session
      if (error.message?.includes('Already Used') || error.status === 400) {
        log('Refresh token already used (web app refreshed it) – re-reading store in 2s...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        const freshFromStore = store.get('session');
        if (freshFromStore && freshFromStore.refresh_token !== session.refresh_token) {
          log('New session found in store after waiting – using it');
          isRefreshing = false;
          return freshFromStore;
        }
        // Still same token – try one more time with the stored session
        const { data: retryData, error: retryError } = await sb.auth.refreshSession({
          refresh_token: freshFromStore?.refresh_token || session.refresh_token,
        });
        if (!retryError && retryData?.session) {
          store.set('session', retryData.session);
          log('Retry refresh succeeded');
          isRefreshing = false;
          return retryData.session;
        }
        // Both failed – session is truly expired
        logError('getFreshSession retry', retryError);
      } else {
        logError('getFreshSession', error);
      }

      // Only notify expiry after multiple failures
      if (!sessionExpiredNotified) {
        sessionExpiredNotified = true;
        log('Session fully expired – notifying');
        if (typeof onSessionExpiredCallback === 'function') onSessionExpiredCallback();
      }
      isRefreshing = false;
      return null;
    }

    if (!data?.session) {
      isRefreshing = false;
      return null;
    }

    store.set('session', data.session);
    sessionExpiredNotified = false;
    log('Session refreshed successfully');
    isRefreshing = false;
    return data.session;

  } catch (err) {
    logError('getFreshSession', err);
    isRefreshing = false;
    return null;
  }
}

// ─── Supabase client ──────────────────────────────────────────────────────────
function getSupabase(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// ─── Spotify API ──────────────────────────────────────────────────────────────
async function callSpotifyAPI(endpoint, accessToken) {
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await sb.functions.invoke('spotify-api', {
      headers: { Authorization: `Bearer ${accessToken}` },
      body: { endpoint },
    });
    if (error) throw error;
    return data;
  } catch (err) {
    logError(`callSpotifyAPI(${endpoint})`, err);
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sanitizeNumber(value, fallback = 0) {
  const n = Number(value);
  return (isNaN(n) || !isFinite(n) || n < 0) ? fallback : n;
}

function isValidTrack(track) {
  return !!(track?.id && track?.name && track?.artist);
}

function getTodayDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' });
}

function getTodayKey() { return `localStats_${getTodayDate()}`; }

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
    log(`Date rollover ${lastSyncedDate} → ${today}`);
    lastSyncedMinutesToday = 0;
    lastSyncedTracksToday = 0;
  }
  lastSyncedDate = today;
}

// ─── Local stats ──────────────────────────────────────────────────────────────
function addMinutesToLocal(deltaMs) {
  if (!deltaMs || deltaMs <= 0) return;
  const key = getTodayKey();
  const stats = store.get(key, { tracksToday: 0, minutesToday: 0 });
  stats.minutesToday = sanitizeNumber(stats.minutesToday) + deltaMs / 60000;
  store.set(key, stats);
  store.set('localStats', {
    tracksToday: sanitizeNumber(stats.tracksToday),
    minutesToday: Math.round(sanitizeNumber(stats.minutesToday)),
  });
}

function addTrackToLocal() {
  const key = getTodayKey();
  const stats = store.get(key, { tracksToday: 0, minutesToday: 0 });
  stats.tracksToday = sanitizeNumber(stats.tracksToday) + 1;
  store.set(key, stats);
  store.set('localStats', {
    tracksToday: sanitizeNumber(stats.tracksToday),
    minutesToday: Math.round(sanitizeNumber(stats.minutesToday)),
  });
}

// ─── Supabase sync ────────────────────────────────────────────────────────────
async function syncToSupabase(track) {
  if (!isValidTrack(track)) return;

  const session = await getFreshSession();
  if (!session?.user?.id || !session?.access_token) {
    log('Sync skipped: no valid session');
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

  log(`Sync "${track.name}" | +${minutesDelta}min / +${tracksDelta} tracks`);

  // 1. Log play
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
    if (error) logError('insert plays', error);
  } catch (err) { logError('insert plays', err); }

  // 2. Upsert daily stats
  try {
    if (currentMinutes > 0 || currentTracks > 0) {
      const { error } = await sb.from('daily_listening_stats').upsert({
        user_id: session.user.id,
        date: today,
        minutes_listened: currentMinutes,
        tracks_played: currentTracks,
      }, { onConflict: 'user_id,date' });
      if (error) logError('upsert daily_stats', error);
    }
  } catch (err) { logError('upsert daily_stats', err); }

  // 3. Update total stats (delta only, never go backwards)
  try {
    if (minutesDelta > 0 || tracksDelta > 0) {
      const { data: existing, error: fetchErr } = await sb
        .from('listening_stats')
        .select('total_minutes, tracks_played')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (fetchErr) { logError('fetch total_stats', fetchErr); return; }

      const existingMinutes = sanitizeNumber(existing?.total_minutes);
      const existingTracks = sanitizeNumber(existing?.tracks_played);

      const { error: upsertErr } = await sb.from('listening_stats').upsert({
        user_id: session.user.id,
        total_minutes: Math.max(existingMinutes + minutesDelta, existingMinutes),
        tracks_played: Math.max(existingTracks + tracksDelta, existingTracks),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (!upsertErr) {
        lastSyncedMinutesToday = currentMinutes;
        lastSyncedTracksToday = currentTracks;
      } else {
        logError('upsert total_stats', upsertErr);
      }
    }
  } catch (err) { logError('upsert total_stats', err); }
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

    const session = await getFreshSession();
    if (!session) return;

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
    if (!item?.id || !item?.name) return;

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
        await syncToSupabase(activeTrackData);
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

    // Detect seek
    const progressDiff = currentProgress - lastSeenProgress;
    if (Math.abs(progressDiff) > 3000 && lastSeenProgress > 0) {
      log(`Seek: ${lastSeenProgress}ms → ${currentProgress}ms`);
      lastCommittedProgress = currentProgress;
      lastSeenProgress = currentProgress;
      store.set('currentTrack', track);
      onTrackChange(track);
      return;
    }

    if (track.isPlaying) {
      commitProgressDelta(currentProgress);
      lastSeenProgress = currentProgress;
    }

    activeTrackData = track;

    const prevTrack = store.get('currentTrack');
    if (prevTrack?.isPlaying !== track.isPlaying || prevTrack?.id !== track.id) {
      store.set('currentTrack', track);
      onTrackChange(track);
    }

  } catch (err) {
    logError('pollCurrentTrack', err);
  }
}

// ─── Start / Stop ─────────────────────────────────────────────────────────────
function startTracker(settings, onTrackChange, onSessionExpired) {
  if (realtimeInterval) clearInterval(realtimeInterval);
  if (syncInterval) clearInterval(syncInterval);

  if (typeof onSessionExpired === 'function') onSessionExpiredCallback = onSessionExpired;

  lastSyncedMinutesToday = 0;
  lastSyncedTracksToday = 0;
  lastSyncedDate = getTodayDate();
  sessionExpiredNotified = false;
  isRefreshing = false;

  const realtimeEnabled = settings?.realtimeTracking !== false;
  const realtimeMs = realtimeEnabled ? 1000 : sanitizeNumber((settings?.trackingInterval || 30) * 1000, 30000);
  const syncMs = sanitizeNumber((settings?.trackingInterval || 30) * 1000, 30000);

  log(`Starting – realtime: ${realtimeEnabled} (${realtimeMs}ms), sync: ${syncMs}ms`);

  pollCurrentTrack(onTrackChange);

  realtimeInterval = setInterval(() => {
    pollCurrentTrack(onTrackChange);
  }, realtimeMs);

  if (realtimeEnabled) {
    syncInterval = setInterval(async () => {
      if (activeTrackData) {
        const localStats = getLocalStats();
        const currentMinutes = Math.round(sanitizeNumber(localStats.minutesToday));
        const currentTracks = sanitizeNumber(localStats.tracksToday);
        if (currentMinutes > lastSyncedMinutesToday || currentTracks > lastSyncedTracksToday) {
          await syncToSupabase(activeTrackData);
        }
      }
    }, syncMs);
  }
}

function stopTracker() {
  if (realtimeInterval) { clearInterval(realtimeInterval); realtimeInterval = null; }
  if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
  log('Stopped');
}

module.exports = { startTracker, stopTracker };
