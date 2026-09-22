// Original quiet ambient texture generated locally. Nothing loads until Sound on.
const ui=document.querySelector('.sound-control'),button=ui.querySelector('button'),slider=ui.querySelector('input'),status=ui.querySelector('output');
let context,master,voices=[],enabled=false,fadeTimer,chordTimer,operation=0,chord=0;
const chords=[[130.813,164.814,195.998],[110,130.813,164.814],[87.307,130.813,174.614],[97.999,146.832,195.998]];
function record(){ui.dataset.context=context?.state||'uncreated';ui.dataset.enabled=String(enabled);ui.dataset.voices=String(voices.length);ui.dataset.volume=slider.value}
function fade(value,seconds=.4){if(!context)return;master.gain.cancelScheduledValues(context.currentTime);master.gain.setValueAtTime(master.gain.value,context.currentTime);master.gain.linearRampToValueAtTime(value,context.currentTime+seconds)}
function target(){return Number(slider.value)/100*.16}
function stopClock(){clearInterval(chordTimer);chordTimer=undefined}
function startClock(){stopClock();chordTimer=setInterval(()=>{if(!enabled||document.hidden||context.state!=='running')return;chord=(chord+1)%chords.length;voices.forEach((osc,i)=>{osc.frequency.cancelScheduledValues(context.currentTime);osc.frequency.setValueAtTime(osc.frequency.value,context.currentTime);osc.frequency.exponentialRampToValueAtTime(chords[chord][i],context.currentTime+5)})},16000)}
async function apply(){
 const token=++operation;clearTimeout(fadeTimer);stopClock();
 button.setAttribute('aria-pressed',String(enabled));button.textContent=enabled?'Sound on':'Sound off';
 if(enabled&&!document.hidden){
  try{
   if(!context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('unsupported');context=new Audio();master=context.createGain();master.gain.value=0;const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=600;filter.Q.value=.3;master.connect(filter);filter.connect(context.destination);voices=chords[0].map((frequency,i)=>{const osc=context.createOscillator(),gain=context.createGain();osc.type='sine';osc.frequency.value=frequency;osc.detune.value=[-3,2,0][i];gain.gain.value=.18;osc.connect(gain);gain.connect(master);osc.start();return osc});context.onstatechange=record}
   await context.resume();if(token!==operation)return;fade(target(),1.2);startClock();status.textContent='Soft ambient sound';setTimeout(()=>{if(status.textContent==='Soft ambient sound')status.textContent=''},2200);
  }catch{enabled=false;button.setAttribute('aria-pressed','false');button.textContent='Sound unavailable';status.textContent='Audio could not start in this browser.';if(context)context.suspend().catch(()=>{})}
 }else if(context){fade(0,.35);fadeTimer=setTimeout(()=>{if(token===operation)context.suspend().then(record).catch(()=>{})},400);status.textContent=''}
 record();
}
button.addEventListener('click',()=>{enabled=!enabled;apply()});slider.addEventListener('input',()=>{if(enabled&&context?.state==='running')fade(target());record()});document.addEventListener('visibilitychange',apply);addEventListener('pagehide',()=>{enabled=false;stopClock();clearTimeout(fadeTimer);context?.close().catch(()=>{})});record();
