// Live visitor counter backed by GoatCounter (jagadeesh-portfolio.goatcounter.com).
// On the published site it records the visit and shows the running total.
export async function connectCounter({config, hostname, countNode, noteNode, fetcher = fetch, addTracker, timeoutMs = 6000, retryMs = 4000}) {
  const live = config.enabled && config.allowedHostnames?.includes(hostname) && /^[a-z0-9][a-z0-9-]*$/.test(config.siteCode || '');
  if (!live) {countNode.textContent = '—'; noteNode.textContent = 'Total visits since launch'; return 'preview';}
  const origin = `https://${config.siteCode}.goatcounter.com`;
  addTracker?.(`${origin}/count`);
  const read = async () => {
    const abort = new AbortController(), timer = setTimeout(() => abort.abort(), timeoutMs);
    try {
      const response = await fetcher(`${origin}/counter/TOTAL.json`, {signal: abort.signal, credentials: 'omit'});
      if (!response.ok) throw new Error('Counter unavailable');
      const data = await response.json();
      if (typeof data.count !== 'string' || !/^\d[\d,.\s  ]*$/.test(data.count)) throw new Error('Invalid counter data');
      countNode.textContent = data.count.trim(); noteNode.textContent = 'Total visits since launch'; return true;
    } catch {return false;} finally {clearTimeout(timer);}
  };
  if (await read()) return 'live';
  await new Promise(r => setTimeout(r, retryMs));   // the first visit may still be registering
  if (await read()) return 'live';
  countNode.textContent = '—'; noteNode.textContent = 'Total visits since launch'; return 'error';
}
if (typeof document !== 'undefined') {
  const countNode = document.querySelector('#visit-count'), noteNode = document.querySelector('#visit-note');
  fetch(new URL('./counter-config.json', import.meta.url)).then(r => {if (!r.ok) throw new Error('Config unavailable'); return r.json();})
    .then(config => connectCounter({config, hostname: location.hostname, countNode, noteNode, addTracker: endpoint => {const script = document.createElement('script'); script.async = true; script.src = 'https://gc.zgo.at/count.js'; script.dataset.goatcounter = endpoint; document.head.appendChild(script);}}))
    .catch(() => {countNode.textContent = '—';});
}
