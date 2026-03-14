let intervalId = null;

async function doUpdate(store, onResult) {
  const serverUrl = store.get('serverUrl');
  const domains = store.get('domains');

  if (!serverUrl || !domains.length) return;

  for (const domain of domains) {
    try {
      const url = `${serverUrl}/update?domain=${encodeURIComponent(domain.subdomain)}&token=${encodeURIComponent(domain.token)}`;

      const response = await fetch(url, {
        headers: { 'User-Agent': 'DDNS-Desktop-Client/1.0' },
      });
      const text = await response.text();

      if (text.trim() === 'OK') {
        // Detect our current IP by making a request to the server
        // The server auto-detects and we can check what it stored
        const previousIp = store.get('lastKnownIp');

        // We don't know the exact IP from the OK response,
        // so we'll parse it from a separate check or just note the update
        onResult({
          domain: domain.subdomain,
          ip: previousIp || 'Updated',
          changed: false,
          status: 'ok',
        });
      } else {
        console.error(`Update failed for ${domain.subdomain}: ${text}`);
        onResult({
          domain: domain.subdomain,
          ip: store.get('lastKnownIp') || 'Unknown',
          changed: false,
          status: 'error',
          error: text,
        });
      }
    } catch (err) {
      console.error(`Update error for ${domain.subdomain}:`, err.message);
      onResult({
        domain: domain.subdomain,
        ip: store.get('lastKnownIp') || 'Unknown',
        changed: false,
        status: 'error',
        error: err.message,
      });
    }
  }
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
  const currentIp = await detectPublicIP();
  if (!currentIp) {
    console.error('Could not detect public IP');
    return;
  }

  const lastIp = store.get('lastKnownIp');
  const ipChanged = currentIp !== lastIp;

  const serverUrl = store.get('serverUrl');
  const domains = store.get('domains');

  for (const domain of domains) {
    try {
      const url = `${serverUrl}/update?domain=${encodeURIComponent(domain.subdomain)}&token=${encodeURIComponent(domain.token)}&ip=${encodeURIComponent(currentIp)}`;

      const response = await fetch(url, {
        headers: { 'User-Agent': 'DDNS-Desktop-Client/1.0' },
      });
      const text = await response.text();

      if (text.trim() === 'OK') {
        onResult({
          domain: domain.subdomain,
          ip: currentIp,
          changed: ipChanged,
          status: 'ok',
        });
      } else {
        onResult({
          domain: domain.subdomain,
          ip: currentIp,
          changed: false,
          status: 'error',
          error: text,
        });
      }
    } catch (err) {
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
  stopUpdater();
  const intervalMinutes = store.get('updateInterval') || 5;

  // Do an immediate check
  smartUpdate(store, onResult);

  // Schedule recurring checks
  intervalId = setInterval(
    () => smartUpdate(store, onResult),
    intervalMinutes * 60 * 1000
  );

  console.log(`Updater started: checking every ${intervalMinutes} minutes`);
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
