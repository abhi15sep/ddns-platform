let intervalId = null;
let startDebounce = null;

function normalizeUrl(url) {
  return url.replace(/\/+$/, '');
}

async function detectPublicIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip;
  } catch {
    try {
      const res = await fetch('https://ifconfig.me/ip');
      return (await res.text()).trim();
    } catch {
      return null;
    }
  }
}

async function smartUpdate(store, onResult) {
  const serverUrl = store.get('serverUrl');
  const domains = store.get('domains');

  if (!serverUrl || !domains.length) return;

  const currentIp = await detectPublicIP();
  if (!currentIp) {
    console.error('Could not detect public IP');
    onResult({
      domain: domains[0]?.subdomain || 'unknown',
      ip: store.get('lastKnownIp') || 'Unknown',
      changed: false,
      status: 'error',
      error: 'Could not detect public IP',
    });
    return;
  }

  const lastIp = store.get('lastKnownIp');
  const ipChanged = currentIp !== lastIp;
  const baseUrl = normalizeUrl(serverUrl);

  for (const domain of domains) {
    try {
      const url = `${baseUrl}/update?domain=${encodeURIComponent(domain.subdomain)}&token=${encodeURIComponent(domain.token)}&ip=${encodeURIComponent(currentIp)}`;

      console.log(`Updating ${domain.subdomain}...`);
      const response = await fetch(url, {
        headers: { 'User-Agent': 'DDNS-Desktop-Client/1.0' },
      });
      const text = await response.text();

      if (text.trim() === 'OK') {
        console.log(`Update OK for ${domain.subdomain} -> ${currentIp}`);
        onResult({
          domain: domain.subdomain,
          ip: currentIp,
          changed: ipChanged,
          status: 'ok',
        });
      } else {
        console.error(`Update failed for ${domain.subdomain}: ${text}`);
        onResult({
          domain: domain.subdomain,
          ip: currentIp,
          changed: false,
          status: 'error',
          error: text,
        });
      }
    } catch (err) {
      console.error(`Update error for ${domain.subdomain}:`, err.message);
      onResult({
        domain: domain.subdomain,
        ip: currentIp,
        changed: false,
        status: 'error',
        error: err.message,
      });
    }
  }
}

function startUpdater(store, onResult) {
  // Debounce: if called multiple times quickly (e.g. config changes),
  // only actually start once after things settle
  if (startDebounce) clearTimeout(startDebounce);

  startDebounce = setTimeout(() => {
    stopUpdater();
    const serverUrl = store.get('serverUrl');
    const domains = store.get('domains');

    if (!serverUrl || !domains.length) {
      console.log('Updater not started: missing serverUrl or domains');
      return;
    }

    const intervalMinutes = store.get('updateInterval') || 5;

    // Do an immediate check
    smartUpdate(store, onResult);

    // Schedule recurring checks
    intervalId = setInterval(
      () => smartUpdate(store, onResult),
      intervalMinutes * 60 * 1000
    );

    console.log(`Updater started: checking every ${intervalMinutes} minutes (${domains.length} domain(s))`);
  }, 500);
}

function stopUpdater() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Updater stopped');
  }
}

function checkNow(store, onResult) {
  return smartUpdate(store, onResult);
}

module.exports = { startUpdater, stopUpdater, checkNow };
