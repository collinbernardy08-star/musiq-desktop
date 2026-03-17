const { createClient } = require('@supabase/supabase-js');
const Store = require('electron-store');

const store = new Store();

const SUPABASE_URL = 'https://lhhouxpwhteripljizul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoaG91eHB3aHRlcmlwbGppenVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NjQyODEsImV4cCI6MjA4MTM0MDI4MX0.JA1mmBgMq_w3e46m_9PzkePIkHCCsMh7ksLMbz4-1L4';

let themeSubscription = null;
let onThemeChangeCallback = null;

// ─── Built-in themes ──────────────────────────────────────────────────────────
// These must match the theme IDs on your website
const THEMES = {
  dark: {
    '--bg-primary':    '#0f0f0f',
    '--bg-secondary':  '#161616',
    '--bg-card':       '#1a1a1a',
    '--bg-hover':      '#222222',
    '--border':        '#2a2a2a',
    '--border-light':  '#333333',
    '--accent':        '#1DB954',
    '--accent-hover':  '#1ed760',
    '--accent-dim':    'rgba(29, 185, 84, 0.15)',
    '--text-primary':  '#ffffff',
    '--text-secondary':'#a0a0a0',
    '--text-muted':    '#666666',
  },
  light: {
    '--bg-primary':    '#f5f5f5',
    '--bg-secondary':  '#ebebeb',
    '--bg-card':       '#ffffff',
    '--bg-hover':      '#e0e0e0',
    '--border':        '#d0d0d0',
    '--border-light':  '#c0c0c0',
    '--accent':        '#1DB954',
    '--accent-hover':  '#1ed760',
    '--accent-dim':    'rgba(29, 185, 84, 0.15)',
    '--text-primary':  '#111111',
    '--text-secondary':'#555555',
    '--text-muted':    '#888888',
  },
  midnight: {
    '--bg-primary':    '#050510',
    '--bg-secondary':  '#0a0a1a',
    '--bg-card':       '#0f0f20',
    '--bg-hover':      '#15152a',
    '--border':        '#1a1a30',
    '--border-light':  '#252540',
    '--accent':        '#7c6af7',
    '--accent-hover':  '#9585ff',
    '--accent-dim':    'rgba(124, 106, 247, 0.15)',
    '--text-primary':  '#e8e8ff',
    '--text-secondary':'#8888bb',
    '--text-muted':    '#55557a',
  },
  rose: {
    '--bg-primary':    '#0f0a0a',
    '--bg-secondary':  '#180f0f',
    '--bg-card':       '#1e1212',
    '--bg-hover':      '#261515',
    '--border':        '#2e1818',
    '--border-light':  '#3a2020',
    '--accent':        '#e84393',
    '--accent-hover':  '#ff5aaa',
    '--accent-dim':    'rgba(232, 67, 147, 0.15)',
    '--text-primary':  '#ffe8f0',
    '--text-secondary':'#bb8899',
    '--text-muted':    '#7a5566',
  },
  ocean: {
    '--bg-primary':    '#060d14',
    '--bg-secondary':  '#0a1520',
    '--bg-card':       '#0d1c2a',
    '--bg-hover':      '#102233',
    '--border':        '#152840',
    '--border-light':  '#1c3350',
    '--accent':        '#00b4d8',
    '--accent-hover':  '#00d4f8',
    '--accent-dim':    'rgba(0, 180, 216, 0.15)',
    '--text-primary':  '#e0f4ff',
    '--text-secondary':'#7aabcc',
    '--text-muted':    '#3d6e88',
  },
  sunset: {
    '--bg-primary':    '#0f0800',
    '--bg-secondary':  '#1a1000',
    '--bg-card':       '#221500',
    '--bg-hover':      '#2a1a00',
    '--border':        '#332000',
    '--border-light':  '#442a00',
    '--accent':        '#ff7b00',
    '--accent-hover':  '#ff9500',
    '--accent-dim':    'rgba(255, 123, 0, 0.15)',
    '--text-primary':  '#fff3e0',
    '--text-secondary':'#cc9966',
    '--text-muted':    '#886644',
  },
};

// ─── Apply theme to renderer ──────────────────────────────────────────────────
function getThemeVars(themeId, customColors = null) {
  // Custom theme from website overrides built-in
  if (customColors && typeof customColors === 'object') {
    return { ...THEMES.dark, ...customColors };
  }
  return THEMES[themeId] || THEMES.dark;
}

// ─── Load theme from Supabase ─────────────────────────────────────────────────
async function loadThemeFromSupabase(session) {
  if (!session?.user?.id || !session?.access_token) return null;

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    });

    // Adjust table/column names to match your website's schema
    const { data, error } = await sb
      .from('user_profiles')
      .select('theme_id, theme_custom_colors')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error('[ThemeSync] Failed to load theme:', error.message);
      return null;
    }

    if (!data) return null;

    const themeId = data.theme_id || 'dark';
    const customColors = data.theme_custom_colors || null;
    const vars = getThemeVars(themeId, customColors);

    console.log(`[ThemeSync] Loaded theme: ${themeId}`);
    return { themeId, vars };

  } catch (err) {
    console.error('[ThemeSync] Error:', err.message);
    return null;
  }
}

// ─── Realtime theme subscription ─────────────────────────────────────────────
async function startThemeSync(session, onThemeChange) {
  if (!session?.user?.id || !session?.access_token) return;

  onThemeChangeCallback = onThemeChange;

  // Load theme immediately on start
  const theme = await loadThemeFromSupabase(session);
  if (theme && onThemeChange) onThemeChange(theme);

  // Subscribe to realtime changes on user_profiles
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });

  // Unsubscribe previous if any
  if (themeSubscription) {
    await sb.removeChannel(themeSubscription);
    themeSubscription = null;
  }

  themeSubscription = sb
    .channel('theme-changes')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'user_profiles',
      filter: `user_id=eq.${session.user.id}`,
    }, async (payload) => {
      console.log('[ThemeSync] Theme changed on website, syncing to app...');
      const themeId = payload.new?.theme_id || 'dark';
      const customColors = payload.new?.theme_custom_colors || null;
      const vars = getThemeVars(themeId, customColors);
      if (onThemeChangeCallback) onThemeChangeCallback({ themeId, vars });
    })
    .subscribe();

  console.log('[ThemeSync] Subscribed to realtime theme changes');
}

function stopThemeSync() {
  if (themeSubscription) {
    themeSubscription.unsubscribe();
    themeSubscription = null;
  }
}

module.exports = { startThemeSync, stopThemeSync, loadThemeFromSupabase, THEMES };
