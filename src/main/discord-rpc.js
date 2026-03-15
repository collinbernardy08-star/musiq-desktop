const Store = require('electron-store');
const store = new Store();

let rpcConnected = false;
let currentActivity = null;
let retryTimeout = null;
let isConnecting = false;
let rpcClient = null;

function getClientId() {
  const settings = store.get('settings', {});
  return (settings.discordClientId || '').trim();
}

// Patched version that doesn't call destroy() to avoid the IPC null write bug
async function initDiscordRPC() {
  const clientId = getClientId();
  if (!clientId) {
    console.log('[Discord RPC] Keine Client ID – übersprungen');
    return;
  }

  if (isConnecting || rpcConnected) return;

  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }

  isConnecting = true;
  rpcClient = null;

  try {
    // Lazy require to get a fresh instance each time
    const DiscordRPC = require('discord-rpc');
    DiscordRPC.register(clientId);

    const client = new DiscordRPC.Client({ transport: 'ipc' });
    rpcClient = client;

    client.on('ready', () => {
      if (client !== rpcClient) return; // stale client
      rpcConnected = true;
      isConnecting = false;
      console.log('[Discord RPC] Verbunden!');
      if (currentActivity) {
        client.setActivity(currentActivity).catch(() => {});
      }
    });

    client.on('disconnected', () => {
      if (client !== rpcClient) return;
      rpcConnected = false;
      isConnecting = false;
      rpcClient = null;
      console.log('[Discord RPC] Getrennt – retry in 30s');
      retryTimeout = setTimeout(() => initDiscordRPC(), 30000);
    });

    // Set a connection timeout
    const loginTimeout = setTimeout(() => {
      if (!rpcConnected && isConnecting) {
        isConnecting = false;
        rpcClient = null;
        console.log('[Discord RPC] Timeout – retry in 30s');
        retryTimeout = setTimeout(() => initDiscordRPC(), 30000);
      }
    }, 10000);

    await client.login({ clientId });
    clearTimeout(loginTimeout);

  } catch (err) {
    isConnecting = false;
    rpcClient = null;
    console.log('[Discord RPC] Fehler:', err.message, '– retry in 30s');
    retryTimeout = setTimeout(() => initDiscordRPC(), 30000);
  }
}

function updateDiscordRPC(track, settings = {}) {
  if (!track || !track.isPlaying) {
    clearDiscordRPC();
    return;
  }

  const endTimestamp = settings.discordShowProgress
    ? new Date(Date.now() + ((track.duration || 0) - (track.progress || 0)))
    : undefined;

  const activity = {
    details: track.name,
    state: `von ${track.artist}`,
    largeImageKey: track.albumArt || 'spotify_logo',
    largeImageText: track.album || 'Mus-IQ',
    smallImageKey: 'spotify_logo',
    smallImageText: 'mus-iq.com',
    ...(endTimestamp && { endTimestamp }),
    buttons: [
      ...(track.spotifyUrl ? [{ label: '▶ Song auf Spotify', url: track.spotifyUrl }] : []),
      { label: '🌐 mus-iq.com', url: 'https://mus-iq.com' },
    ],
  };

  currentActivity = activity;

  if (rpcConnected && rpcClient) {
    rpcClient.setActivity(activity).catch(() => {});
  }
}
function clearDiscordRPC() {
  currentActivity = null;
  if (rpcConnected && rpcClient) {
    rpcClient.clearActivity().catch(() => {});
  }
}

function destroyDiscordRPC() {
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
  clearDiscordRPC();
  rpcConnected = false;
  isConnecting = false;
  // Don't call rpcClient.destroy() – it crashes due to IPC null write bug
  rpcClient = null;
}

module.exports = { initDiscordRPC, updateDiscordRPC, clearDiscordRPC, destroyDiscordRPC };