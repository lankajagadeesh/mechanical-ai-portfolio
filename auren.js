// AUREN: a talking assistant on the page. It answers questions about Jagadeesh's work for visitors,
// and, under Jagadeesh's voice profile, shows how it drives the desktop.
const root = document.querySelector('[data-demo="auren"]');
if (root) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.innerHTML = `
  <div class="au-grid">
    <div class="au-core">
      <canvas class="au-orb" width="360" height="360" aria-hidden="true"></canvas>
      <p class="au-state" aria-live="polite"><i></i><span>IDLE · SAY OR TYPE SOMETHING</span></p>
      <div class="au-profile" role="radiogroup" aria-label="Who is speaking">
        <button type="button" role="radio" aria-checked="true" data-who="visitor">Visitor</button>
        <button type="button" role="radio" aria-checked="false" data-who="owner">Jagadeesh (voice-verified)</button>
      </div>
      <label class="au-voice"><input type="checkbox" checked> Spoken replies</label>
    </div>
    <div class="au-chat">
      <div class="au-log" role="log" aria-live="polite" aria-label="Conversation with AUREN"></div>
      <div class="au-chips"></div>
      <form class="au-input" autocomplete="off">
        <button type="button" class="au-mic" aria-label="Speak to AUREN" title="Speak"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>
        <label class="sr-only" for="au-text">Message to AUREN</label>
        <input id="au-text" type="text" placeholder="Ask about Jagadeesh, or say “open Chrome”…">
        <button type="submit" class="au-send">Send</button>
      </form>
    </div>
  </div>
  <div class="au-desktop" aria-label="Simulated desktop that AUREN controls">
    <div class="au-bar"><span>DESKTOP · WINDOWS</span><span class="au-clock"></span></div>
    <div class="au-screen"><p class="au-empty">Switch to Jagadeesh's voice profile and give a command. The actions appear here.</p></div>
    <div class="au-task"><span class="au-vol">VOL <b></b></span><span class="au-timer"></span></div>
  </div>`;

  const $ = s => root.querySelector(s);
  const log = $('.au-log'), input = $('#au-text'), stateEl = $('.au-state span'), screen = $('.au-screen'), volEl = $('.au-vol b'), timerEl = $('.au-timer'), clockEl = $('.au-clock');
  let who = 'visitor', speaking = false, listening = false, thinking = false, pending = null, volume = 40, timerEnd = 0, timerLabel = '';
  const voiceOn = () => $('.au-voice input').checked;
  volEl.textContent = volume;

  // ---------- desktop ----------
  function windowCard(title, body, cls = '') {
    screen.querySelector('.au-empty')?.remove();
    const w = document.createElement('div'); w.className = 'au-win ' + cls; w.innerHTML = `<div class="au-win-top"><i></i><i></i><i></i><b>${title}</b></div><div class="au-win-body">${body}</div>`;
    screen.prepend(w); [...screen.querySelectorAll('.au-win')].slice(4).forEach(n => n.remove());
    return w;
  }
  setInterval(() => {
    clockEl.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    if (timerEnd) {const left = Math.max(0, Math.round((timerEnd - Date.now()) / 1000)); timerEl.textContent = `TIMER ${timerLabel} ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; if (!left) {timerEnd = 0; timerEl.textContent = ''; say(`Your ${timerLabel} timer is done.`);}}
  }, 1000);

  // ---------- knowledge about the portfolio ----------
  const facts = {
    about: 'Jagadeesh Lanka is a mechanical engineer finishing his Master of Engineering at the University of Cincinnati in December 2026. He works across mechanical design, manufacturing, simulation, robotics and technical AI evaluation.',
    projects: 'His featured builds are a servo motor mounting and belt-tensioning assembly, a user-driven floor scrubbing machine, a robotic work cell for turning-mechanism assembly, a TurtleBot LiDAR obstacle-avoidance robot, a nanotechnology-in-aerospace review, and me, AUREN.',
    skills: 'He works in SolidWorks, Creo and AutoCAD, with GD&T drawings, FEA and tolerance analysis, design for manufacture, fabrication and bills of materials, plus Python and ROS 2 for robotics.',
    education: 'He is completing a Master of Engineering in Mechanical Engineering at the University of Cincinnati in December 2026, and holds a BTech in Mechanical Engineering from NIT Manipur. He is also CAPM certified.',
    experience: 'He was a mechanical designer at Zouka Solutions, a graduate research assistant with UPRISE at the University of Cincinnati, a design engineer intern at GSR Engineering and an engineering intern at ONGC. He also reviews AI evaluations for Mercor and authors technical tasks through Handshake AI.',
    ai: 'On the AI side he reviews coding evaluations for Mercor and, through Handshake AI, authors and evaluates tasks in mechanical reasoning, physics, research, data analysis and game development.',
    contact: 'You can email him at lankanh@mail.uc.edu or find him on LinkedIn at linkedin.com/in/lankajagadeesh. He is open to mechanical design, manufacturing and simulation roles.',
    auren: 'I am AUREN, Jagadeesh\'s AI assistant. I listen for his voice, understand what he asks, and run it on his computer: apps, files, search, music, notes and timers. Risky actions always need his confirmation.',
    hire: 'Yes. Jagadeesh graduates in December 2026 and is open to mechanical design, manufacturing and simulation roles, including work that combines engineering with AI. He pairs hands-on design with simulation and careful testing. Email lankanh@mail.uc.edu to start the conversation.'
  };
  const apps = {chrome: 'Google Chrome', browser: 'Google Chrome', edge: 'Microsoft Edge', 'vs code': 'Visual Studio Code', vscode: 'Visual Studio Code', code: 'Visual Studio Code', codex: 'Codex', spotify: 'Spotify', solidworks: 'SolidWorks', creo: 'Creo Parametric', notepad: 'Notepad', excel: 'Excel', word: 'Word', explorer: 'File Explorer', files: 'File Explorer', calculator: 'Calculator', outlook: 'Outlook', teams: 'Teams', terminal: 'Terminal', settings: 'Settings'};

  // ---------- intent routing ----------
  function route(raw) {
    const q = raw.toLowerCase().replace(/[’']/g, "'").trim();
    const has = (...w) => w.some(x => q.includes(x));
    if (pending) {
      if (/^(yes|confirm|do it|go ahead|sure|ok(ay)?)\b/.test(q)) {const p = pending; pending = null; return p();}
      if (/^(no|cancel|stop|don't|never ?mind)\b/.test(q)) {pending = null; return {say: 'Cancelled. Nothing was changed.'};}
    }
    if (/^(hi|hello|hey|good (morning|afternoon|evening)|yo)\b/.test(q)) return {say: who === 'owner' ? 'Hello Jagadeesh. I\'m listening. What should I do?' : 'Hello! I\'m AUREN, Jagadeesh\'s AI assistant. Ask me about his work, his projects or how to reach him.'};
    if (has('who are you', 'what are you', 'what is auren', 'about auren', 'your name', 'what can you do')) return {say: facts.auren};
    if (has('hire', 'recruit', 'job', 'available', 'open to', 'role')) return {say: facts.hire};
    if (has('contact', 'email', 'reach', 'linkedin', 'phone', 'get in touch')) return {say: facts.contact};
    if (has('resume', 'cv')) return {say: 'Here is his resume. It opens in a new tab.', link: ['Open resume', 'assets/Jagadeesh-Lanka-Resume.pdf']};
    // ---- computer commands ----
    const cmd = computer(q, raw);
    if (cmd) {
      if (who !== 'owner') return {say: 'I only run computer commands for Jagadeesh\'s verified voice. Switch to his voice profile above to see that, or ask me about his work.', denied: true};
      return cmd();
    }
    if (has('educat', 'degree', 'study', 'studies', 'university', 'graduat', 'college', 'masters', 'meng')) return {say: facts.education};
    if (has('experience', 'intern', 'worked', 'career', 'companies')) return {say: facts.experience};
    if (has('skill', 'software', 'tools', 'solidworks', 'cad', 'good at')) return {say: facts.skills};
    if (has('project', 'portfolio', 'built', 'build', 'work on')) return {say: facts.projects};
    if (has('handshake', 'mercor', 'ai work', 'evaluation', 'outlier')) return {say: facts.ai};
    if (has('who is jagadeesh', 'about jagadeesh', 'about him', 'tell me about', 'who is he', 'introduce')) return {say: facts.about};
    if (has('time')) return {say: `It's ${new Date().toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}.`};
    if (has('date', 'day is it', 'today')) return {say: `Today is ${new Date().toLocaleDateString([], {weekday: 'long', month: 'long', day: 'numeric'})}.`};
    if (has('weather')) return {say: 'On Jagadeesh\'s machine I check a weather service for that. This web version of me has no internet connection, so I can\'t give a live forecast here.'};
    if (has('joke')) return {say: 'Why did the engineer bring a ladder to the design review? To take the tolerances to a higher level.'};
    if (has('thank')) return {say: 'You\'re welcome!'};
    return {say: who === 'owner' ? 'I didn\'t catch a command in that. Try "open Chrome", "search for bearing preload", "play focus music" or "set a timer for 5 minutes".' : 'I\'m not sure about that one. Ask me about Jagadeesh\'s projects, skills, education or how to contact him.'};
  }
  function computer(q, raw) {
    let m;
    if ((m = q.match(/\bplay\s*(.*)/)) || q.includes('music')) {
      const what = (m && m[1] ? m[1] : 'music').replace(/[.!?]$/, '') || 'music';
      return () => ({say: `Playing ${what} on Spotify.`, act: () => windowCard('Spotify', `<div class="au-music"><div class="au-eq">${'<i></i>'.repeat(14)}</div><p>Now playing · <b>${what}</b></p></div>`, 'au-playing')});
    }
    if ((m = q.match(/^(?:(?:please|can you|could you|auren)[, ]+)*(open|launch|start|switch to|focus on)\s+(.+)/))) {
      const key = Object.keys(apps).find(k => m[2].includes(k)); const name = key ? apps[key] : m[2].replace(/[.!?]$/, '');
      return () => ({say: `Opening ${name}.`, act: () => windowCard(name, `<div class="au-app"><span class="au-app-icon">${name[0].toUpperCase()}</span><p>${name} is open and focused.</p></div>`)});
    }
    if ((m = q.match(/\b(search( the web)?( for)?|google|look up)\s+(.+)/))) {
      const term = m[4].replace(/[.!?]$/, '');
      return () => ({say: `Searching the web for ${term}.`, act: () => windowCard('Google Chrome', `<div class="au-search"><div class="au-url">google.com/search?q=${encodeURIComponent(term)}</div>${[1, 2, 3].map(i => `<p><b>${term} – result ${i}</b><br><small>www.example-${i}.com · ${['Engineering guide', 'Technical article', 'Video walkthrough'][i - 1]}</small></p>`).join('')}</div>`)});
    }
    if (/\b(pause|stop) (the )?music\b/.test(q)) return () => ({say: 'Music paused.', act: () => screen.querySelectorAll('.au-playing').forEach(n => n.classList.remove('au-playing'))});
    if ((m = raw.match(/\b(create|make|new)\s+(a\s+)?folder\s*(called|named)?\s*(.*)/i))) {
      const name = (m[4] || 'New folder').replace(/[.!?]$/, '') || 'New folder';
      return () => ({say: `Created a folder called ${name} in Documents.`, act: () => windowCard('File Explorer', `<div class="au-files"><p><i class="au-ico fold"></i> Documents</p><p class="au-new"><i class="au-ico fold"></i> ${name}</p><p><i class="au-ico fold"></i> Projects</p><p><i class="au-ico doc"></i> Resume.pdf</p></div>`)});
    }
    if ((m = raw.match(/\b(?:write|type|take|make)\s+(?:a\s+)?note\s*(?:that|saying|:)?\s*(.*)/i))) {
      const text = m[1] || 'New note';
      return () => ({say: 'Done. I wrote that in a new note.', act: () => windowCard('Notepad', `<pre class="au-note">${text.replace(/[<>&]/g, c => ({'<': '&lt;', '>': '&gt;', '&': '&amp;'}[c]))}</pre>`)});
    }
    if ((m = q.match(/\b(timer|remind me)\b.*?(\d+)\s*(second|sec|minute|min|hour)/))) {
      const n = +m[2], unit = m[3].startsWith('h') ? 3600 : m[3].startsWith('m') ? 60 : 1;
      return () => ({say: `Timer set for ${n} ${m[3].startsWith('h') ? 'hour' : m[3].startsWith('m') ? 'minute' : 'second'}${n > 1 ? 's' : ''}.`, act: () => {timerEnd = Date.now() + n * unit * 1000; timerLabel = `${n}${m[3][0]}`;}});
    }
    if (/\b(volume|louder|quieter|mute)\b/.test(q)) {
      const up = /up|louder|increase|raise/.test(q), mute = /mute/.test(q); return () => ({say: mute ? 'Muted.' : up ? 'Volume up.' : 'Volume down.', act: () => {volume = mute ? 0 : Math.max(0, Math.min(100, volume + (up ? 20 : -20))); volEl.textContent = volume;}});
    }
    if (/\bscreenshot\b/.test(q)) return () => ({say: 'Screenshot saved to Pictures.', act: () => {screen.classList.remove('au-flash'); void screen.offsetWidth; screen.classList.add('au-flash');}});
    if ((m = q.match(/\b(delete|remove)\s+(.+)/))) {
      const target = m[2].replace(/[.!?]$/, '');
      return () => {pending = () => ({say: `Deleted ${target}. It's in the Recycle Bin if you need it back.`, act: () => windowCard('Recycle Bin', `<div class="au-files"><p><i class="au-ico bin"></i> ${target}</p></div>`)}); return {say: `Deleting ${target} can't be undone easily. Say "confirm" to delete it, or "cancel".`};};
    }
    if (/\b(shut ?down|restart|reboot|sign out|log off)\b/.test(q)) return () => {pending = () => ({say: 'Okay. On the real machine I would shut down now. Here I\'ll just pretend.'}); return {say: 'That will close everything. Say "confirm" to go ahead, or "cancel".'};};
    if (/\block (the )?(screen|computer|pc)\b/.test(q)) return () => ({say: 'Locking the screen.', act: () => windowCard('Lock screen', '<div class="au-app"><span class="au-app-icon">L</span><p>Locked</p></div>')});
    if (/\bclose\b/.test(q)) return () => ({say: 'Closed the active window.', act: () => screen.querySelector('.au-win')?.remove()});
    return null;
  }

  // ---------- conversation ----------
  function bubble(text, from, extra) {
    const b = document.createElement('div'); b.className = 'au-msg ' + from; b.textContent = text;
    if (extra?.link) {const a = document.createElement('a'); a.href = extra.link[1]; a.target = '_blank'; a.rel = 'noopener'; a.textContent = extra.link[0] + ' ↗'; b.append(document.createElement('br'), a);}
    log.appendChild(b); log.scrollTop = log.scrollHeight; return b;
  }
  function setState(text) {stateEl.textContent = text;}
  let voice = null;
  const pickVoice = () => {const vs = speechSynthesis.getVoices(); voice = vs.find(v => /en-(US|GB)/.test(v.lang) && /Google|Natural|Aria|Jenny|Samantha|Daniel/.test(v.name)) || vs.find(v => v.lang?.startsWith('en')) || null;};
  if ('speechSynthesis' in window) {pickVoice(); speechSynthesis.addEventListener?.('voiceschanged', pickVoice);}
  function say(text) {
    if (!voiceOn() || !('speechSynthesis' in window)) {setState('READY'); return;}
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); if (voice) u.voice = voice; u.rate = 1.03; u.pitch = 1;
    u.onstart = () => {speaking = true; setState('SPEAKING');}; u.onend = u.onerror = () => {speaking = false; setState(listening ? 'LISTENING' : 'READY');};
    speechSynthesis.speak(u);
  }
  function handle(text) {
    text = text.trim(); if (!text) return; bubble(text, 'user'); thinking = true; setState('UNDERSTANDING');
    const r = route(text);
    setTimeout(() => {
      thinking = false; if (r.act) {setState('ACTING'); r.act();}
      const b = bubble(r.say, 'bot' + (r.denied ? ' denied' : ''), r); void b; say(r.say);
    }, reduced ? 0 : 520);
  }
  $('.au-input').addEventListener('submit', e => {e.preventDefault(); handle(input.value); input.value = '';});

  // suggestion chips depend on who is speaking
  const chipSets = {
    visitor: ['Who is Jagadeesh?', 'What projects has he built?', 'What are his skills?', 'Is he open to roles?', 'How do I contact him?', 'Open Chrome'],
    owner: ['Open SolidWorks', 'Search for belt tension formula', 'Play focus music', 'Create a folder called Test rigs', 'Set a timer for 2 minutes', 'Delete old_logs.zip']
  };
  function chips() {$('.au-chips').innerHTML = chipSets[who].map(c => `<button type="button">${c}</button>`).join(''); $('.au-chips').querySelectorAll('button').forEach(b => (b.onclick = () => handle(b.textContent)));}
  root.querySelectorAll('[data-who]').forEach(b => b.addEventListener('click', () => {
    who = b.dataset.who; root.querySelectorAll('[data-who]').forEach(x => x.setAttribute('aria-checked', String(x === b))); root.classList.toggle('owner', who === 'owner'); chips();
    bubble(who === 'owner' ? 'Voice profile matched: Jagadeesh. Desktop control enabled.' : 'Visitor mode. I can answer questions about Jagadeesh\'s work.', 'sys');
  }));
  chips();
  bubble('Hi, I\'m AUREN, Jagadeesh\'s AI assistant. Ask me anything about his work, or switch to his voice profile to see me control the desktop.', 'bot');

  // ---------- microphone (Web Speech API where the browser supports it) ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; const mic = $('.au-mic');
  if (!SR) {mic.title = 'Voice input is not supported in this browser. Type instead.'; mic.classList.add('off');}
  let rec = null;
  mic.addEventListener('click', () => {
    if (!SR) {bubble('Voice input isn\'t available in this browser, so type your request instead. Chrome and Edge support it.', 'sys'); return;}
    if (listening) {rec?.stop(); return;}
    speechSynthesis?.cancel(); rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = false;
    let live = null;
    rec.onstart = () => {listening = true; mic.classList.add('on'); setState('LISTENING');};
    rec.onresult = e => {const t = [...e.results].map(r => r[0].transcript).join(''); input.value = t; if (e.results[e.results.length - 1].isFinal) {input.value = ''; handle(t);} void live;};
    rec.onerror = e => {bubble(e.error === 'not-allowed' ? 'Microphone access was blocked. Allow it in the browser, or type instead.' : 'I couldn\'t hear that clearly. Try again or type.', 'sys');};
    rec.onend = () => {listening = false; mic.classList.remove('on'); if (!speaking) setState('READY');};
    rec.start();
  });
  $('.au-voice input').addEventListener('change', e => {if (!e.target.checked) speechSynthesis?.cancel();});

  // ---------- orb visualiser ----------
  const cv = $('.au-orb'), g = cv.getContext('2d'); let t = 0, level = 0, on = false;
  new IntersectionObserver(e => {on = e[0].isIntersecting; if (on) requestAnimationFrame(draw);}).observe(cv);
  function draw() {
    if (!on) return; t += .016;
    const target = speaking ? .75 + Math.sin(t * 18) * .25 * Math.random() : listening ? .45 + Math.random() * .4 : thinking ? .35 : .12;
    level += (target - level) * .15;
    g.clearRect(0, 0, 360, 360); const cx = 180, cy = 180;
    const col = who === 'owner' ? [95, 212, 255] : [169, 139, 255];
    const glow = g.createRadialGradient(cx, cy, 20, cx, cy, 170); glow.addColorStop(0, `rgba(${col},${.35 + level * .3})`); glow.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = glow; g.fillRect(0, 0, 360, 360);
    for (let ring = 0; ring < 3; ring++) {
      g.beginPath(); const R = 70 + ring * 18;
      for (let i = 0; i <= 120; i++) {const a = i / 120 * Math.PI * 2; const n = Math.sin(a * (5 + ring) + t * (2 + ring)) * Math.cos(a * 3 - t * 1.3) * level * (22 - ring * 5); const x = cx + (R + n) * Math.cos(a), y = cy + (R + n) * Math.sin(a); i ? g.lineTo(x, y) : g.moveTo(x, y);}
      g.strokeStyle = `rgba(${col},${.9 - ring * .25})`; g.lineWidth = 2 - ring * .4; g.stroke();
    }
    const core = g.createRadialGradient(cx - 18, cy - 20, 4, cx, cy, 62); core.addColorStop(0, '#fff'); core.addColorStop(.25, `rgb(${col})`); core.addColorStop(1, 'rgba(20,12,40,.9)');
    g.beginPath(); g.arc(cx, cy, 56 + level * 8, 0, 7); g.fillStyle = core; g.fill();
    g.font = '700 15px Manrope, Arial'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.9)'; g.fillText('AUREN', cx, cy + 5);
    if (!reduced) requestAnimationFrame(draw);
  }
}
