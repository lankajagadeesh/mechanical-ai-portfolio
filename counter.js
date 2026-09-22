// Optional shared counter. Disabled until the user configures a live GoatCounter site.
export async function connectCounter({config,hostname,countNode,noteNode,fetcher=fetch,addTracker,timeoutMs=6000}){
  const local=['localhost','127.0.0.1','::1',''].includes(hostname);
  if(!config.enabled||local||!config.allowedHostnames?.includes(hostname)){
    countNode.textContent='Not live yet';noteNode.textContent=local?'The shared counter is disabled in local preview.':'Shared visitor counter setup is pending.';return 'inactive';
  }
  if(!/^[a-z0-9][a-z0-9-]*$/.test(config.siteCode||'')){
    countNode.textContent='Unavailable';noteNode.textContent='Visitor count is not configured correctly.';return 'invalid';
  }
  const origin=`https://${config.siteCode}.goatcounter.com`;
  countNode.textContent='Loading…';noteNode.textContent='Loading the shared recorded-visit total.';
  const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),timeoutMs);
  try{
    addTracker?.(`${origin}/count`);
    const response=await fetcher(`${origin}/counter/TOTAL.json`,{signal:abort.signal,credentials:'omit'});
    if(!response.ok)throw new Error('Counter unavailable');
    const data=await response.json();
    if(typeof data.count!=='string'||!/^\d[\d,.\s\u00a0\u202f]*$/.test(data.count))throw new Error('Invalid counter data');
    countNode.textContent=data.count;noteNode.textContent='Recorded visits, not unique people. Total may update with a delay.';return 'live';
  }catch{
    countNode.textContent='Unavailable';noteNode.textContent='Visitor count is temporarily unavailable.';return 'error';
  }finally{clearTimeout(timer)}
}
if(typeof document!=='undefined'){
  const countNode=document.querySelector('#visit-count'),noteNode=document.querySelector('#visit-note');
  fetch(new URL('./counter-config.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Config unavailable');return r.json()}).then(config=>connectCounter({config,hostname:location.hostname,countNode,noteNode,addTracker:endpoint=>{const script=document.createElement('script');script.async=true;script.src='https://gc.zgo.at/count.js';script.dataset.goatcounter=endpoint;document.head.appendChild(script)}})).catch(()=>{countNode.textContent='Unavailable';noteNode.textContent='Visitor counter configuration could not be loaded.'});
}
