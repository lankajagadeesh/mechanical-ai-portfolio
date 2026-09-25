// Live project simulations for the AI-evaluation work (canvas based, run only while visible).
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const C = {bg: '#0a0e15', panel: '#111823', line: '#243244', ink: '#e4ecf6', muted: '#8fa0b6', dim: '#5c6b80', amber: '#ffb547', orange: '#ff7a3d', cyan: '#5fd4ff', green: '#39ff88', red: '#ff5a5a', violet: '#a98bff', blue: '#4c8dff'};
const FONT = "'DM Sans', Arial, sans-serif", MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";

// ---------- shared shell ----------
function shell(el, {controls = '', h = 320, label = 'LIVE SIMULATION', note = ''}) {
  el.innerHTML = `<p class="demo-label">${label}</p><div class="sim-canvas"><canvas role="img"></canvas></div><div class="demo-controls">${controls}</div><p class="demo-status" aria-live="polite"></p>${note ? `<p class="sim-hint">${note}</p>` : ''}`;
  const canvas = el.querySelector('canvas'), W = 800, H = h, dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.aspectRatio = `${W}/${H}`;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  const node = el.querySelector('.demo-status'); const status = {set textContent(v) {if (node.textContent !== v) node.textContent = v;}, get textContent() {return node.textContent;}};
  return {el, canvas, ctx, W, H, status, $: s => el.querySelector(s)};
}
// Animation loop that runs only while the canvas is on screen.
function loop(s, frame) {
  let on = false, raf = 0, last = 0, t = 0;
  const tick = now => {raf = 0; if (!on || document.hidden) return; const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now; t += dt; frame(dt, t); raf = requestAnimationFrame(tick);};
  const kick = () => {if (!raf && on && !document.hidden) {last = 0; raf = requestAnimationFrame(tick);}};
  new IntersectionObserver(e => {on = e[0].isIntersecting; kick(); if (on) frame(0, t);}).observe(s.canvas);
  document.addEventListener('visibilitychange', kick);
  if (reduced) frame(0, 0);
  return {redraw: () => frame(0, t)};
}
const T = (ctx, s, x, y, {size = 13, color = C.ink, align = 'left', weight = 500, font = FONT, base = 'alphabetic'} = {}) => {ctx.font = `${weight} ${size}px ${font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base; ctx.fillText(s, x, y);};
const rr = (ctx, x, y, w, h, r, fill, stroke, lw = 1) => {ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) {ctx.fillStyle = fill; ctx.fill();} if (stroke) {ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke();}};
const clear = s => {const {ctx, W, H} = s; ctx.clearRect(0, 0, W, H); rr(ctx, 0, 0, W, H, 14, C.bg);};
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
const sel = (id, label, opts) => `<label for="${id}">${label}<select id="${id}">${opts.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>`;
const rng = (id, label, min, max, val, step = 1) => `<label for="${id}">${label} <output>${val}</output><input id="${id}" type="range" min="${min}" max="${max}" value="${val}" step="${step}"></label>`;
const btn = (label, act) => `<button type="button" data-act="${act}">${label}</button>`;
function gearPath(ctx, cx, cy, teeth, r, ang, depth = 5) {
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a = ang + i / teeth * Math.PI * 2, d = Math.PI * 2 / teeth;
    [[r - depth, 0], [r - depth, .12], [r + depth * .6, .3], [r + depth * .6, .5], [r - depth, .7], [r - depth, 1]].forEach(([rad, f], k) => {const x = cx + rad * Math.cos(a + d * f), y = cy + rad * Math.sin(a + d * f); (i === 0 && k === 0) ? ctx.moveTo(x, y) : ctx.lineTo(x, y);});
  }
  ctx.closePath();
}
let seed = 11; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const sims = {};

// =====================================================================
// Mercor — reviewing an AI coding evaluation against tests and detector warnings
// =====================================================================
sims.mercor = el => {
  const s = shell(el, {controls: sel('mc-sub', 'Submission under review', [['a', 'Submission A · moving_average()'], ['b', 'Submission B · moving_average()']]) + btn('Run review', 'run'), h: 330});
  const code = {
    a: ['def moving_average(xs, k):', '    out = []', '    total = sum(xs[:k])', '    out.append(total / k)', '    for i in range(k, len(xs)):', '        total += xs[i] - xs[i - k]', '        out.append(total / k)', '    return out'],
    b: ['def moving_average(xs, k):', '    if k <= 0 or len(xs) < k:', '        return []', '    total = sum(xs[:k])', '    out = [total / k]', '    for i in range(k, len(xs)):', '        total += xs[i] - xs[i - k]', '        out.append(total / k)', '    return out']
  };
  const tests = ['basic window', 'window = 1', 'window = len', 'floats', 'negative values', 'empty list', 'k larger than list', 'k = 0'];
  const fails = {a: [5, 6, 7], b: []};
  const findings = {
    a: [['Crash on empty input (ZeroDivision / wrong output)', 'SUPPORTED FAULT', C.red, 'tests 6-8 fail · line 4'], ['Detector: "possible division by zero"', 'SAME ROOT CAUSE', C.amber, 'merged with finding 1'], ['Style: short variable names', 'NOT A FAULT', C.dim, 'no rubric impact']],
    b: [['Detector: "possible off-by-one at window end"', 'UNCERTAIN WARNING', C.amber, 'no failing test reproduces it'], ['Edge cases guarded on line 2', 'VERIFIED CORRECT', C.green, 'tests 6-8 pass'], ['Style: short variable names', 'NOT A FAULT', C.dim, 'no rubric impact']]
  };
  let sub = 'a', t0 = -1;
  s.$('#mc-sub').onchange = e => {sub = e.target.value; t0 = -1; L.redraw();};
  s.$('[data-act=run]').onclick = () => {t0 = performance.now() / 1000;};
  const L = loop(s, () => {
    const {ctx, W} = s; clear(s); const now = performance.now() / 1000, el2 = t0 < 0 ? 0 : now - t0;
    // code panel
    rr(ctx, 16, 16, 330, 298, 10, C.panel, C.line); T(ctx, 'solution.py', 30, 38, {size: 11, color: C.muted, font: MONO});
    const done = Math.floor(el2 / .35); const failing = fails[sub];
    code[sub].forEach((ln, i) => {
      const y = 62 + i * 22; const bad = sub === 'a' && i === 3 && done > 5;
      if (bad) rr(ctx, 22, y - 14, 318, 20, 4, 'rgba(255,90,90,.16)');
      T(ctx, String(i + 1).padStart(2), 28, y, {size: 11, color: C.dim, font: MONO}); T(ctx, ln, 50, y, {size: 11.5, color: bad ? '#ffb3b3' : C.ink, font: MONO});
    });
    // test runner
    rr(ctx, 362, 16, 190, 298, 10, C.panel, C.line); T(ctx, 'pytest -q', 376, 38, {size: 11, color: C.muted, font: MONO});
    tests.forEach((name, i) => {
      const y = 64 + i * 30, ran = i < done, f = failing.includes(i);
      const col = !ran ? C.dim : f ? C.red : C.green;
      ctx.beginPath(); ctx.arc(382, y - 4, 6, 0, 7); ctx.fillStyle = ran ? col : 'transparent'; ctx.fill(); ctx.strokeStyle = col; ctx.stroke();
      if (i === done && t0 >= 0) {ctx.beginPath(); ctx.arc(382, y - 4, 9, now * 6, now * 6 + 4); ctx.strokeStyle = C.cyan; ctx.stroke();}
      T(ctx, name, 396, y, {size: 11.5, color: ran ? C.ink : C.muted});
    });
    const passed = Math.min(done, 8) - failing.filter(i => i < done).length;
    T(ctx, `${passed} passed · ${failing.filter(i => i < done).length} failed`, 376, 302, {size: 11, color: C.muted});
    // findings
    T(ctx, 'REVIEW FINDINGS', 570, 38, {size: 10, color: C.amber, weight: 700});
    findings[sub].forEach(([title, verdict, col, ev], i) => {
      const k = ease((el2 - 3.1 - i * .55) / .5); if (k <= 0) return; const y = 52 + i * 78;
      ctx.globalAlpha = k; rr(ctx, 568 + (1 - k) * 30, y, 216, 68, 8, 'rgba(255,255,255,.03)', col);
      T(ctx, verdict, 580 + (1 - k) * 30, y + 18, {size: 10, color: col, weight: 700});
      wrap(ctx, title, 580 + (1 - k) * 30, y + 36, 196, 13, {size: 11.5});
      T(ctx, ev, 580 + (1 - k) * 30, y + 60, {size: 10, color: C.muted}); ctx.globalAlpha = 1;
    });
    const score = sub === 'a' ? 2 : 4, k = ease((el2 - 5) / .8);
    if (k > 0) {T(ctx, 'RUBRIC SCORE', 570, 296, {size: 10, color: C.muted, weight: 700}); rr(ctx, 660, 286, 124, 12, 6, '#1a2330'); rr(ctx, 660, 286, 124 * score / 5 * k, 12, 6, score > 3 ? C.green : C.red); T(ctx, `${score}/5`, 784, 280, {size: 12, color: C.ink, align: 'right', weight: 700});}
    s.status.textContent = t0 < 0 ? 'Press "Run review" to execute the test suite and classify each finding.' : el2 < 3 ? 'Running the test suite…' : sub === 'a' ? 'Finding 1 is a supported fault: three edge-case tests fail and the traceback points to line 4. The detector warning shares that root cause, and the style note does not affect the rubric.' : 'All tests pass. The detector warning cannot be reproduced by any test, so it is reported as uncertain with a request for a reproducing case rather than as a fault.';
  });
};
function wrap(ctx, text, x, y, maxW, lh, opt) {
  ctx.font = `${opt.weight || 500} ${opt.size || 12}px ${FONT}`; const words = text.split(' '); let line = '', yy = y;
  for (const w of words) {const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxW && line) {T(ctx, line, x, yy, opt); line = w; yy += lh;} else line = test;}
  if (line) T(ctx, line, x, yy, opt); return yy;
}

// =====================================================================
// Novel — memory relevance and personalization scoring
// =====================================================================
sims.novel = el => {
  const s = shell(el, {controls: sel('nv-v', 'Response to review', [['good', 'Uses the relevant memories'], ['forced', 'Forces an irrelevant memory'], ['none', 'Ignores memory']]) + btn('Replay', 'run'), h: 320});
  const mem = ['Studies mechanical engineering', 'Prefers short explanations', 'Exam on Friday', 'Enjoys football', 'Vegetarian'];
  const resp = {
    good: {text: 'Quick version for Friday: Mohr\'s circle plots normal vs shear stress. Centre = average stress, radius = max shear. Rotate 2θ on the circle for θ on the element.', used: [0, 1, 2], bad: [], scores: [5, 5, 5]},
    forced: {text: 'Like a football pass changing direction, stresses rotate too! Mohr\'s circle plots normal vs shear stress, and as a vegetarian you might like this tidy picture.', used: [3, 4], bad: [3, 4], scores: [2, 2, 2]},
    none: {text: 'Mohr\'s circle is a graphical method developed by Christian Otto Mohr in 1882 to represent the transformation of stress components under rotation of the coordinate axes…', used: [], bad: [], scores: [4, 1, 3]}
  };
  let v = 'good', t0 = performance.now() / 1000;
  s.$('#nv-v').onchange = e => {v = e.target.value; t0 = performance.now() / 1000;}; s.$('[data-act=run]').onclick = () => (t0 = performance.now() / 1000);
  loop(s, () => {
    const {ctx} = s; clear(s); const el2 = reduced ? 99 : performance.now() / 1000 - t0, R = resp[v];
    T(ctx, 'USER MEMORY', 24, 34, {size: 10, color: C.amber, weight: 700});
    mem.forEach((m, i) => {
      const y = 48 + i * 48, used = R.used.includes(i), bad = R.bad.includes(i), lit = used && el2 > 1 + i * .15;
      rr(ctx, 20, y, 190, 36, 18, lit ? (bad ? 'rgba(255,90,90,.15)' : 'rgba(57,255,136,.12)') : 'rgba(255,255,255,.03)', lit ? (bad ? C.red : C.green) : C.line);
      T(ctx, m, 38, y + 23, {size: 12, color: lit ? C.ink : C.muted});
      if (lit) {ctx.strokeStyle = bad ? 'rgba(255,90,90,.5)' : 'rgba(57,255,136,.45)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(210, y + 18); ctx.bezierCurveTo(250, y + 18, 240, 150, 262, 150); ctx.stroke(); ctx.setLineDash([]);}
    });
    rr(ctx, 262, 20, 330, 48, 12, '#1b2638'); T(ctx, 'User: Explain Mohr\'s circle quickly before my exam.', 276, 49, {size: 12});
    const n = Math.floor(Math.max(0, el2 - .6) * 60); const txt = R.text.slice(0, n);
    rr(ctx, 262, 82, 330, 170, 12, 'rgba(255,255,255,.03)', C.line); T(ctx, 'AI RESPONSE', 276, 102, {size: 10, color: C.cyan, weight: 700});
    wrap(ctx, txt + (n < R.text.length && Math.floor(el2 * 3) % 2 ? '▍' : ''), 276, 124, 300, 18, {size: 12.5});
    const labels = ['Memory relevance', 'Personalization', 'Overall'];
    labels.forEach((lab, i) => {
      const cx = 660, cy = 70 + i * 86, k = ease((el2 - 2.5 - i * .3) / 1), val = R.scores[i] * k;
      ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.strokeStyle = '#1a2330'; ctx.beginPath(); ctx.arc(cx, cy, 28, Math.PI * .75, Math.PI * 2.25); ctx.stroke();
      ctx.strokeStyle = val >= 4 ? C.green : val >= 3 ? C.amber : C.red; ctx.beginPath(); ctx.arc(cx, cy, 28, Math.PI * .75, Math.PI * .75 + Math.PI * 1.5 * val / 5); ctx.stroke(); ctx.lineWidth = 1; ctx.lineCap = 'butt';
      T(ctx, val.toFixed(0), cx, cy + 6, {size: 18, align: 'center', weight: 700}); T(ctx, lab, cx + 42, cy + 4, {size: 11, color: C.muted});
    });
    s.status.textContent = v === 'good' ? 'Strong personalization: the response uses the three memories that matter for this request (field of study, preference for brevity, exam timing) and nothing else.' : v === 'forced' ? 'Irrelevant memories are forced in. The football and diet references add nothing and read as intrusive, so relevance and personalization drop, and the rationale must say why.' : 'Accurate but generic: no memory is used, so the answer ignores the stated need for a quick explanation. Personalization scores low even though the content is correct.';
  });
};

// =====================================================================
// Roadhouse / IVY — comparing two agent trajectories and revising after feedback
// =====================================================================
sims.ivy = el => {
  const s = shell(el, {controls: btn('Replay both runs', 'run') + btn('Apply reviewer feedback', 'fb'), h: 320});
  const steps = ['Plan', 'Search repo', 'Edit parser', 'Run tests', 'Final answer'];
  let t0 = performance.now() / 1000, fb = false, fbT = 0;
  s.$('[data-act=run]').onclick = () => {t0 = performance.now() / 1000; fb = false;}; s.$('[data-act=fb]').onclick = () => {fb = true; fbT = performance.now() / 1000;};
  loop(s, () => {
    const {ctx} = s; clear(s); const now = performance.now() / 1000, el2 = reduced ? 99 : now - t0;
    [['RUN A', C.cyan, 60], ['RUN B', C.violet, 170]].forEach(([name, col, y], lane) => {
      T(ctx, name, 24, y + 5, {size: 11, color: col, weight: 700});
      ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(100, y); ctx.lineTo(590, y); ctx.stroke(); ctx.lineWidth = 1;
      steps.forEach((st, i) => {
        const x = 110 + i * 118, reached = el2 > i * .8 + lane * .3;
        const bad = lane === 1 && (i === 3 || i === 4) && reached;
        rr(ctx, x - 44, y - 18, 88, 36, 10, reached ? (bad ? 'rgba(255,90,90,.14)' : 'rgba(95,212,255,.08)') : C.panel, bad ? C.red : reached ? col : C.line);
        T(ctx, st, x, y + 4, {size: 11, align: 'center', color: reached ? C.ink : C.dim});
        if (reached && i === 3) T(ctx, lane ? '2 of 14 failed' : '14 of 14 passed', x, y + 34, {size: 10, align: 'center', color: lane ? C.red : C.green});
        if (reached && i === 4) T(ctx, lane ? '"All tests pass"' : 'Cites test log', x, y + 34, {size: 10, align: 'center', color: lane ? C.red : C.green});
        if (reached && (i === 1 || i === 3)) {ctx.strokeStyle = C.amber; ctx.beginPath(); ctx.arc(x + 38, y - 18, 5, 0, 7); ctx.stroke(); T(ctx, 'evidence', x + 45, y - 22, {size: 9, color: C.amber});}
      });
      const pk = Math.min(4, el2 / .8 - lane * .3 / .8); if (pk >= 0 && pk < 4.2) {const x = 110 + Math.min(4, pk) * 118; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;}
    });
    if (el2 > 4.2) {ctx.strokeStyle = C.red; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(464, 190); ctx.bezierCurveTo(500, 250, 560, 250, 582, 190); ctx.stroke(); ctx.setLineDash([]); T(ctx, 'claim contradicts test log', 470, 262, {size: 11, color: C.red});}
    // ratings
    T(ctx, 'RATINGS', 630, 34, {size: 10, color: C.amber, weight: 700});
    const fk = fb ? ease((now - fbT) / 1) : 0;
    [['Run A', 4, 4, C.cyan], ['Run B', 4, 2, C.violet]].forEach(([n, a, b, col], i) => {
      const y = 64 + i * 64, v = lerp(a, b, fk), shown = el2 > 4.5 ? v : 0;
      T(ctx, n, 630, y, {size: 12}); for (let k = 0; k < 5; k++) rr(ctx, 630 + k * 30, y + 10, 24, 12, 4, k < Math.round(shown) ? col : '#1a2330');
      T(ctx, shown ? `${shown.toFixed(0)}/5` : '—', 790, y + 20, {size: 12, align: 'right', weight: 700});
    });
    if (fb) {rr(ctx, 622, 200, 170, 100, 10, 'rgba(255,181,71,.08)', C.amber); wrap(ctx, 'Feedback: Run B\'s final answer is not supported by its own test log. Rating revised 4 → 2 with the log attached.', 634, 222, 150, 15, {size: 11, color: C.ink});}
    s.status.textContent = !fb ? 'Both runs look similar until the evidence is checked: Run B reports success although its own test step shows two failures.' : 'After feedback the Run B rating is revised to 2/5, and the judgment links to the exact trajectory step and attachment that support it.';
  });
};

// =====================================================================
// Lumiere — planetary gearset with a friction-held ring: stick, slip and heat
// =====================================================================
sims.lumiere = el => {
  const s = shell(el, {controls: rng('lm-load', 'Output load torque (N·m)', 0, 400, 180, 10) + rng('lm-cap', 'Ring clutch capacity (N·m)', 40, 300, 180, 10), h: 340});
  const Zs = 24, Zr = 72, Zp = 24, WS = 300 * Math.PI / 30; // sun at 300 rpm
  let wc = WS * Zs / (Zs + Zr), wr = 0, temp = 25, angS = 0, angC = 0, angR = 0; const hist = [];
  const load = () => +s.$('#lm-load').value, cap = () => +s.$('#lm-cap').value;
  s.el.querySelectorAll('input').forEach(i => i.addEventListener('input', () => (i.previousElementSibling.textContent = i.value)));
  loop(s, (dt) => {
    const {ctx} = s; const Tl = load(), Tc = cap(), ringDemand = Tl * Zr / (Zs + Zr);
    const stick = ringDemand <= Tc; const wcLock = WS * Zs / (Zs + Zr);
    if (stick) {if (Math.abs(wr) > .05) {wc = Math.min(wcLock, wc + (Tc - ringDemand) * .01 * dt * 60); } else {wc = wcLock;}} else {wc = Math.max(0, wc - (ringDemand - Tc) * .004 * dt * 60);}
    wr = ((Zs + Zr) * wc - Zs * WS) / Zr; if (stick && Math.abs(wr) < .05) wr = 0;
    const P = Math.abs(wr) > .01 ? Tc * Math.abs(wr) : 0; temp += (P / 900 - (temp - 25) * .03) * dt * 8;
    angS += WS * dt * .12; angC += wc * dt * .12; angR += wr * dt * .12;
    if (dt) {hist.push(temp); if (hist.length > 240) hist.shift();}
    clear(s);
    // gearset drawing
    const cx = 170, cy = 170, m = 2.1, rs = Zs * m / 2 * 1.4, rp = Zp * m / 2 * 1.4, rR = Zr * m / 2 * 1.4;
    const heat = Math.min(1, (temp - 25) / 150);
    ctx.lineWidth = 14; ctx.strokeStyle = `rgba(${255},${Math.round(120 - heat * 80)},${Math.round(60 - heat * 50)},${.25 + heat * .7})`; ctx.shadowColor = C.orange; ctx.shadowBlur = heat * 30; ctx.beginPath(); ctx.arc(cx, cy, rR + 16, 0, 7); ctx.stroke(); ctx.shadowBlur = 0; ctx.lineWidth = 1;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(angR); ctx.beginPath(); ctx.arc(0, 0, rR + 9, 0, 7); ctx.fillStyle = '#2a3140'; ctx.fill(); gearPath(ctx, 0, 0, Zr, rR, 0, 4); ctx.fillStyle = C.bg; ctx.fill(); ctx.strokeStyle = '#7f8da0'; ctx.stroke(); ctx.restore();
    for (let i = 0; i < 3; i++) {
      const a = angC + i * Math.PI * 2 / 3, px = cx + (rs + rp) * Math.cos(a), py = cy + (rs + rp) * Math.sin(a);
      const planetSpin = -(angS - angC) * Zs / Zp + angC;
      gearPath(ctx, px, py, Zp, rp, planetSpin, 4); ctx.fillStyle = '#3a6fb8'; ctx.fill(); ctx.strokeStyle = '#9cc4ff'; ctx.stroke();
      ctx.beginPath(); ctx.arc(px, py, 5, 0, 7); ctx.fillStyle = C.bg; ctx.fill();
    }
    ctx.strokeStyle = C.amber; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < 3; i++) {const a = angC + i * Math.PI * 2 / 3; ctx.moveTo(cx, cy); ctx.lineTo(cx + (rs + rp) * Math.cos(a), cy + (rs + rp) * Math.sin(a));} ctx.stroke(); ctx.lineWidth = 1;
    gearPath(ctx, cx, cy, Zs, rs, angS, 4); ctx.fillStyle = '#c9ced6'; ctx.fill(); ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.fillStyle = C.bg; ctx.fill();
    T(ctx, 'SUN z24 · 300 rpm in', cx, 318, {size: 10, align: 'center', color: C.muted}); T(ctx, 'RING z72 held by clutch · CARRIER out', cx, 332, {size: 10, align: 'center', color: C.muted});
    // readouts
    const rpm = w => (w * 30 / Math.PI).toFixed(0);
    const rows = [['Carrier output', `${rpm(wc)} rpm`, C.amber], ['Ring slip speed', `${rpm(Math.abs(wr))} rpm`, Math.abs(wr) > .05 ? C.red : C.green], ['Ring torque demand', `${ringDemand.toFixed(0)} N·m`, C.ink], ['Clutch capacity', `${Tc.toFixed(0)} N·m`, C.ink], ['Heat generated', `${(P / 1000).toFixed(2)} kW`, P > 0 ? C.orange : C.muted], ['Clutch temperature', `${temp.toFixed(0)} °C`, temp > 120 ? C.red : C.ink]];
    rows.forEach(([k, v, col], i) => {const y = 40 + i * 30; T(ctx, k, 380, y, {size: 12, color: C.muted}); T(ctx, v, 600, y, {size: 14, color: col, align: 'right', weight: 700});});
    rr(ctx, 620, 22, 160, 36, 18, stick && Math.abs(wr) < .05 ? 'rgba(57,255,136,.12)' : 'rgba(255,90,90,.15)', stick && Math.abs(wr) < .05 ? C.green : C.red);
    T(ctx, stick && Math.abs(wr) < .05 ? 'STICK · LOCKED' : 'SLIPPING', 700, 45, {size: 12, align: 'center', weight: 700, color: stick && Math.abs(wr) < .05 ? C.green : C.red});
    // demand vs capacity bar
    const bx = 620, by = 80, bw = 160; rr(ctx, bx, by, bw, 10, 5, '#1a2330'); rr(ctx, bx, by, Math.min(bw, bw * ringDemand / 300), 10, 5, ringDemand > Tc ? C.red : C.cyan); const cxp = bx + bw * Tc / 300; ctx.fillStyle = C.ink; ctx.fillRect(cxp - 1, by - 5, 2, 20); T(ctx, 'demand vs capacity', bx, by + 26, {size: 10, color: C.muted});
    // temperature history
    rr(ctx, 380, 214, 400, 110, 10, C.panel, C.line); T(ctx, 'CLUTCH TEMPERATURE', 392, 234, {size: 10, color: C.amber, weight: 700});
    ctx.strokeStyle = C.orange; ctx.lineWidth = 2; ctx.beginPath(); hist.forEach((v, i) => {const x = 392 + i * 376 / 240, y = 312 - Math.min(1, (v - 20) / 200) * 70; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);}); ctx.stroke(); ctx.lineWidth = 1;
    s.status.textContent = stick && Math.abs(wr) < .05 ? `Holding: the ring needs ${ringDemand.toFixed(0)} N·m and the clutch can hold ${Tc} N·m, so the ring stays still and the carrier turns at ${rpm(wc)} rpm (4:1 reduction) with no friction heat.` : `Slipping: ring demand ${ringDemand.toFixed(0)} N·m exceeds the ${Tc} N·m capacity. The ring spins at ${rpm(Math.abs(wr))} rpm and the clutch turns ${(P / 1000).toFixed(2)} kW into heat.`;
  });
};

// =====================================================================
// Neutron — reading a toleranced drawing and checking a reconstructed CAD part
// =====================================================================
sims.neutron = el => {
  const s = shell(el, {controls: rng('nt-sp', 'Model hole spacing (mm)', 79.8, 80.2, 80.04, .02) + rng('nt-d', 'Model hole Ø (mm)', 9.9, 10.1, 10.0, .01), h: 330});
  s.el.querySelectorAll('input').forEach(i => i.addEventListener('input', () => (i.previousElementSibling.textContent = (+i.value).toFixed(2))));
  let ang = .6;
  loop(s, dt => {
    const {ctx} = s; ang += dt * .5; clear(s);
    const sp = +s.$('#nt-sp').value, d = +s.$('#nt-d').value, okS = Math.abs(sp - 80) <= .1, okD = Math.abs(d - 10) <= .05;
    // drawing sheet
    rr(ctx, 16, 16, 380, 298, 8, '#0d1a2b', '#2f5b8c'); ctx.strokeStyle = 'rgba(95,212,255,.08)'; for (let x = 26; x < 396; x += 12) {ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, 310); ctx.stroke();}
    T(ctx, 'DWG PR-BRK-014 · PLATE · 6061-T6 · t = 8', 30, 38, {size: 10, color: C.cyan, weight: 700});
    const ox = 60, oy = 90, sc = 2.4; ctx.strokeStyle = '#cfe8ff'; ctx.lineWidth = 1.6; ctx.strokeRect(ox, oy, 120 * sc, 60 * sc); ctx.lineWidth = 1;
    [[20, 30], [100, 30]].forEach(([x, y]) => {ctx.beginPath(); ctx.arc(ox + x * sc, oy + y * sc, 5 * sc, 0, 7); ctx.stroke(); ctx.setLineDash([6, 3, 2, 3]); ctx.strokeStyle = 'rgba(207,232,255,.4)'; ctx.beginPath(); ctx.moveTo(ox + x * sc - 18, oy + y * sc); ctx.lineTo(ox + x * sc + 18, oy + y * sc); ctx.moveTo(ox + x * sc, oy + y * sc - 18); ctx.lineTo(ox + x * sc, oy + y * sc + 18); ctx.stroke(); ctx.setLineDash([]); ctx.strokeStyle = '#cfe8ff';});
    const dim = (x1, x2, y, label, ok) => {ctx.strokeStyle = ok === undefined ? '#8fb4d9' : ok ? C.green : C.red; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke(); [x1, x2].forEach((x, k) => {ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (k ? -6 : 6), y - 3); ctx.lineTo(x + (k ? -6 : 6), y + 3); ctx.fill();}); T(ctx, label, (x1 + x2) / 2, y - 6, {size: 11, align: 'center', color: ok === undefined ? '#cfe8ff' : ok ? C.green : C.red, weight: 600});};
    dim(ox, ox + 120 * sc, oy - 22, '120 ±0.2'); dim(ox + 20 * sc, ox + 100 * sc, oy + 60 * sc + 26, '80 ±0.1', okS);
    T(ctx, '2× Ø10 ±0.05 THRU', ox + 20 * sc + 16, oy + 30 * sc - 18, {size: 11, color: okD ? C.green : C.red, weight: 600});
    T(ctx, '60 ±0.2', ox + 120 * sc + 14, oy + 30 * sc + 4, {size: 11, color: '#cfe8ff'});
    // isometric model
    const P = (x, y, z) => {const c = Math.cos(ang), sn = Math.sin(ang); const X = x * c - y * sn, Y = x * sn + y * c; return [600 + (X - Y) * .9, 200 + (X + Y) * .45 - z * 1.1];};
    const L = 120, Wd = 60, t = 8, cxm = L / 2, cym = Wd / 2; const pt = (x, y, z) => P(x - cxm, y - cym, z);
    const face = (pts, fill, stroke) => {ctx.beginPath(); pts.forEach((p, i) => {const q = pt(...p); i ? ctx.lineTo(...q) : ctx.moveTo(...q);}); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.stroke();};
    face([[0, 0, 0], [L, 0, 0], [L, 0, t], [0, 0, t]], '#5b6878', '#9fb0c4'); face([[L, 0, 0], [L, Wd, 0], [L, Wd, t], [L, 0, t]], '#4a5666', '#9fb0c4');
    face([[0, Wd, 0], [0, 0, 0], [0, 0, t], [0, Wd, t]], '#4a5666', '#9fb0c4'); face([[0, Wd, 0], [L, Wd, 0], [L, Wd, t], [0, Wd, t]], '#5b6878', '#9fb0c4');
    face([[0, 0, t], [L, 0, t], [L, Wd, t], [0, Wd, t]], '#aeb9c6', '#e6edf5');
    const holeX = [60 - sp / 2, 60 + sp / 2];
    holeX.forEach(hx => {ctx.beginPath(); for (let i = 0; i <= 40; i++) {const a = i / 40 * Math.PI * 2; const q = pt(hx + d / 2 * Math.cos(a), 30 + d / 2 * Math.sin(a), t); i ? ctx.lineTo(...q) : ctx.moveTo(...q);} ctx.fillStyle = '#10151d'; ctx.fill(); ctx.strokeStyle = okD ? C.green : C.red; ctx.stroke();});
    const scan = (performance.now() / 1200) % 1, sx = lerp(0, L, scan); ctx.strokeStyle = 'rgba(95,212,255,.8)'; ctx.beginPath(); ctx.moveTo(...pt(sx, 0, t + .5)); ctx.lineTo(...pt(sx, Wd, t + .5)); ctx.stroke();
    T(ctx, 'RECONSTRUCTED CAD · CMM CHECK', 470, 38, {size: 10, color: C.amber, weight: 700});
    T(ctx, `Spacing ${sp.toFixed(2)} mm → ${okS ? 'PASS' : 'FAIL'} (${(sp - 80 >= 0 ? '+' : '')}${(sp - 80).toFixed(2)})`, 470, 300, {size: 12, color: okS ? C.green : C.red, weight: 600});
    T(ctx, `Hole Ø ${d.toFixed(2)} mm → ${okD ? 'PASS' : 'FAIL'} (${(d - 10 >= 0 ? '+' : '')}${(d - 10).toFixed(2)})`, 470, 320, {size: 12, color: okD ? C.green : C.red, weight: 600});
    s.status.textContent = okS && okD ? 'The reconstructed part meets every toleranced feature on the drawing.' : `The model fails ${[!okS && 'hole spacing (80 ±0.1)', !okD && 'hole diameter (Ø10 ±0.05)'].filter(Boolean).join(' and ')}. A grader compares each CAD feature against the drawing's tolerance band, not the nominal value alone.`;
  });
};

// =====================================================================
// Insight — terminal task: Newton cooling solved numerically and graded
// =====================================================================
sims.insight = el => {
  const s = shell(el, {controls: sel('in-dt', 'Solver time step', [['5', 'dt = 5 s'], ['1', 'dt = 1 s'], ['0.1', 'dt = 0.1 s']]) + btn('Run task', 'run'), h: 330});
  const T0 = 90, Ta = 20, k = .05, target = 40, exact = Math.log((T0 - Ta) / (target - Ta)) / k;
  let t0 = -1, dtS = 5, res = null;
  function solve(h) {let t = 0, y = T0; const pts = [[0, y]]; while (y > target) {const yn = y - k * (y - Ta) * h; if (yn <= target) {t += h * (y - target) / (y - yn); pts.push([t, target]); break;} y = yn; t += h; pts.push([t, y]);} return {t, pts};}
  s.$('#in-dt').onchange = e => {dtS = +e.target.value; t0 = -1;}; s.$('[data-act=run]').onclick = () => {res = solve(dtS); t0 = performance.now() / 1000;};
  loop(s, () => {
    const {ctx} = s; clear(s); const el2 = t0 < 0 ? 0 : (reduced ? 99 : performance.now() / 1000 - t0);
    rr(ctx, 16, 16, 380, 298, 10, '#070b10', C.line);
    ctx.fillStyle = C.red; [0, 1, 2].forEach(i => {ctx.beginPath(); ctx.arc(32 + i * 14, 30, 4, 0, 7); ctx.fillStyle = [C.red, C.amber, C.green][i]; ctx.fill();});
    const err = res ? Math.abs(res.t - exact) / exact * 100 : 0, pass = err < 1;
    const lines = [['$ cat task.md', C.muted], ['Sphere cools from 90 °C in 20 °C air, k = 0.05 /s.', C.ink], ['Find the time to reach 40 °C (±1 %).', C.ink], [`$ python solve.py --dt ${dtS}`, C.cyan]];
    if (res) {lines.push([`t_cool = ${res.t.toFixed(3)} s   (${res.pts.length - 1} steps)`, C.ink], ['$ pytest grader.py -q', C.cyan], [`reference = ${exact.toFixed(3)} s   error = ${err.toFixed(2)} %`, C.muted], [pass ? '1 passed ✓' : '1 failed ✗  tolerance 1 % exceeded', pass ? C.green : C.red]);}
    let chars = Math.floor(el2 * 70);
    lines.forEach(([ln, col], i) => {if (t0 >= 0 || i < 4) {const shown = t0 < 0 ? ln : ln.slice(0, Math.max(0, chars)); chars -= ln.length; T(ctx, shown, 28, 62 + i * 26, {size: 12, color: col, font: MONO});}});
    // plot
    rr(ctx, 412, 16, 372, 298, 10, C.panel, C.line); T(ctx, 'TEMPERATURE °C vs TIME s', 426, 38, {size: 10, color: C.amber, weight: 700});
    const X = t => 440 + t / 40 * 320, Y = v => 290 - (v - 20) / 75 * 230;
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(440, 60); ctx.lineTo(440, 290); ctx.lineTo(768, 290); ctx.stroke();
    [20, 40, 60, 80].forEach(v => T(ctx, String(v), 432, Y(v) + 4, {size: 10, color: C.dim, align: 'right'})); [0, 10, 20, 30, 40].forEach(t => T(ctx, String(t), X(t), 304, {size: 10, color: C.dim, align: 'center'}));
    ctx.strokeStyle = 'rgba(255,181,71,.35)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(440, Y(40)); ctx.lineTo(768, Y(40)); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 2; ctx.beginPath(); for (let t = 0; t <= 40; t += .5) {const v = Ta + (T0 - Ta) * Math.exp(-k * t); t ? ctx.lineTo(X(t), Y(v)) : ctx.moveTo(X(t), Y(v));} ctx.stroke(); ctx.lineWidth = 1;
    if (res) {const n = Math.min(res.pts.length, Math.floor(el2 * 25)); ctx.strokeStyle = C.orange; ctx.beginPath(); res.pts.slice(0, n).forEach(([t, v], i) => i ? ctx.lineTo(X(t), Y(v)) : ctx.moveTo(X(t), Y(v))); ctx.stroke(); res.pts.slice(0, n).forEach(([t, v]) => {ctx.beginPath(); ctx.arc(X(t), Y(v), 2.5, 0, 7); ctx.fillStyle = C.orange; ctx.fill();});}
    T(ctx, 'exact', 700, 80, {size: 10, color: C.cyan}); T(ctx, 'solver', 740, 80, {size: 10, color: C.orange});
    s.status.textContent = !res ? `Pick a time step and run the task. The reference answer is ${exact.toFixed(2)} s.` : pass ? `dt = ${dtS} s gives ${res.t.toFixed(2)} s, within 1 % of the reference, so the independent grader passes it.` : `dt = ${dtS} s gives ${res.t.toFixed(2)} s, ${err.toFixed(1)} % off. The explicit Euler step is too coarse, so the grader fails it: a genuine numerical-method error, not a formatting issue.`;
  });
};

// =====================================================================
// Artemis — answers traced to exact pages and cells
// =====================================================================
sims.artemis = el => {
  const s = shell(el, {controls: sel('ar-q', 'Research question', [['b', 'Plant B Q3 scrap rate including the week-38 stoppage?'], ['low', 'Which plant had the lowest Q3 scrap rate?']]) + btn('Trace answer', 'run'), h: 330});
  let q = 'b', t0 = performance.now() / 1000;
  s.$('#ar-q').onchange = e => {q = e.target.value; t0 = performance.now() / 1000;}; s.$('[data-act=run]').onclick = () => (t0 = performance.now() / 1000);
  loop(s, () => {
    const {ctx} = s; clear(s); const el2 = reduced ? 99 : performance.now() / 1000 - t0;
    const doc = (x, y, w, h, title) => {rr(ctx, x, y, w, h, 6, '#e9edf2'); T(ctx, title, x + 12, y + 20, {size: 10, color: '#3a4656', weight: 700});};
    doc(16, 16, 250, 170, 'Q3 OPERATIONS REPORT · p. 4');
    const rows = [['Plant', 'Units', 'Scrap %'], ['A', '52,000', '1.8 %'], ['B', '48,000', '2.1 %'], ['C', '39,500', '1.4 %']];
    rows.forEach((r, i) => r.forEach((c, j) => {const x = 28 + j * 76, y = 50 + i * 30; const hl = (q === 'b' && i === 2 && el2 > 1) || (q === 'low' && i === 3 && j === 2 && el2 > 1); if (hl) rr(ctx, x - 6, y - 17, 72, 24, 4, 'rgba(255,181,71,.55)'); T(ctx, c, x, y, {size: 12, color: i ? '#1b2430' : '#5a6678', weight: i ? 500 : 700});}));
    doc(16, 196, 250, 118, 'PLANT B MEMO · p. 2');
    wrap(ctx, 'Q3 figures on p. 4 exclude the week-38 line stoppage. Scrap from that week is logged separately.', 28, 236, 226, 16, {size: 11, color: '#1b2430'});
    if (q === 'b' && el2 > 2) rr(ctx, 24, 222, 234, 38, 4, 'rgba(95,212,255,.25)');
    doc(282, 16, 220, 298, 'SCRAP_LOG.xlsx · Sheet W38');
    for (let i = 0; i < 9; i++) {const y = 50 + i * 28; T(ctx, `F${10 + i}`, 294, y, {size: 10, color: '#7a8698', font: MONO}); T(ctx, i === 4 ? '412' : String(30 + ((i * 37) % 60)), 340, y, {size: 12, color: '#1b2430', font: MONO}); T(ctx, i === 4 ? 'Week-38 scrap (units)' : 'daily scrap', 390, y, {size: 10, color: '#5a6678'});}
    if (q === 'b' && el2 > 3) rr(ctx, 290, 144, 204, 24, 4, 'rgba(57,255,136,.35)');
    // answer card
    rr(ctx, 520, 16, 264, 298, 10, C.panel, C.line); T(ctx, 'ANSWER · WITH CITATIONS', 534, 38, {size: 10, color: C.amber, weight: 700});
    const steps = q === 'b' ? [['48,000 × 2.1 % = 1,008 units', 'Report p. 4, row B', C.amber], ['Excludes week 38', 'Memo p. 2, line 1', C.cyan], ['+ 412 units in week 38', 'SCRAP_LOG!F14', C.green], ['(1,008 + 412) / 48,000 = 2.96 %', 'derived', C.ink]] : [['A 1.8 %, B 2.1 %, C 1.4 %', 'Report p. 4, scrap column', C.amber], ['Lowest: Plant C at 1.4 %', 'Report p. 4, row C', C.green]];
    steps.forEach(([a, src, col], i) => {const k = ease((el2 - 1 - i) / .6); if (k <= 0) return; ctx.globalAlpha = k; T(ctx, a, 534, 74 + i * 52, {size: 13, color: col, weight: 600}); T(ctx, '↳ ' + src, 534, 92 + i * 52, {size: 10, color: C.muted}); ctx.globalAlpha = 1;});
    const links = q === 'b' ? [[[230, 105], 0], [[258, 241], 1], [[494, 156], 2]] : [[[240, 45], 0], [[240, 135], 1]];
    links.forEach(([[x, y], i]) => {const k = ease((el2 - 1 - i) / .6); if (k <= 0) return; ctx.strokeStyle = [C.amber, C.cyan, C.green][i % 3]; ctx.globalAlpha = .7 * k; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 60, y, 480, 70 + i * 52, 528, 70 + i * 52); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;});
    const fin = q === 'b' ? 'Answer: 2.96 %' : 'Answer: Plant C (1.4 %)';
    if (el2 > (q === 'b' ? 4.8 : 2.8)) {rr(ctx, 534, 270, 236, 32, 8, 'rgba(255,181,71,.12)', C.amber); T(ctx, fin, 652, 291, {size: 14, color: C.amber, align: 'center', weight: 700});}
    s.status.textContent = q === 'b' ? 'The table alone gives 2.1 %, which is wrong: the memo says week 38 is excluded, and the spreadsheet cell supplies the missing 412 units. Every step cites a page or cell.' : 'A single-source question: the answer comes straight from the scrap column on page 4 and cites that row.';
  });
};

// =====================================================================
// Planck — a free quantum wave packet and the effect of complex conjugation
// =====================================================================
sims.planck = el => {
  const s = shell(el, {controls: rng('pl-k', 'Initial momentum k₀', -3, 3, 1.5, .5) + btn('Apply ψ → ψ*', 'conj') + btn('Restart', 'run'), h: 320});
  let conj = false, t = 0; const sig = 1.2, x0 = 0, N = 400;
  s.$('#pl-k').addEventListener('input', e => {e.target.previousElementSibling.textContent = e.target.value; t = 0;});
  s.$('[data-act=conj]').onclick = e => {conj = !conj; t = 0; e.target.textContent = conj ? 'Undo conjugation' : 'Apply ψ → ψ*';}; s.$('[data-act=run]').onclick = () => (t = 0);
  // ψ(x,t) for a free Gaussian packet (ħ = m = 1)
  function psi(x, t, k) {
    const dr = 1, di = t / (2 * sig * sig);                          // (1 + i t / 2σ²)
    const dd = dr * dr + di * di;
    const X = x - x0 - k * t; const num = -(X * X) / (4 * sig * sig);
    const er = num * dr / dd, ei = -num * di / dd;                    // num / (1 + i t/2σ²)
    const ph = k * (x - x0) - k * k * t / 2;
    const mag = Math.exp(er) / Math.pow(dd, .25) / Math.pow(2 * Math.PI * sig * sig, .25);
    const ang = ei + ph - .5 * Math.atan2(di, dr);
    return [mag * Math.cos(ang), mag * Math.sin(ang)];
  }
  loop(s, dt => {
    const {ctx} = s; t += dt; if (t > 9) t = 0; clear(s);
    const k0 = +s.$('#pl-k').value, k = conj ? -k0 : k0;
    const X = x => 40 + (x + 16) / 32 * 720, Y0 = 200, A = 260;
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(40, Y0); ctx.lineTo(760, Y0); ctx.stroke();
    const pts = []; let pExp = 0, norm = 0; const dx = 32 / N;
    for (let i = 0; i <= N; i++) {const x = -16 + i * dx; let [re, im] = psi(x, t, k); pts.push([x, re, im]); norm += (re * re + im * im) * dx;}
    for (let i = 1; i < N; i++) {const [, re, im] = pts[i]; const dre = (pts[i + 1][1] - pts[i - 1][1]) / (2 * dx), dim = (pts[i + 1][2] - pts[i - 1][2]) / (2 * dx); pExp += (re * dim - im * dre) * dx;}
    pExp /= norm;
    ctx.beginPath(); ctx.moveTo(X(-16), Y0); pts.forEach(([x, re, im]) => ctx.lineTo(X(x), Y0 - (re * re + im * im) * A)); ctx.lineTo(X(16), Y0); ctx.closePath(); ctx.fillStyle = 'rgba(255,181,71,.22)'; ctx.fill(); ctx.strokeStyle = C.amber; ctx.stroke();
    ctx.strokeStyle = C.cyan; ctx.beginPath(); pts.forEach(([x, re], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(x), Y0 - re * A * .55)); ctx.stroke();
    ctx.strokeStyle = C.violet; ctx.beginPath(); pts.forEach(([x, , im], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(x), Y0 - im * A * .55)); ctx.stroke();
    T(ctx, '|ψ|²', 50, 40, {size: 12, color: C.amber, weight: 700}); T(ctx, 'Re ψ', 100, 40, {size: 12, color: C.cyan, weight: 700}); T(ctx, 'Im ψ', 150, 40, {size: 12, color: C.violet, weight: 700});
    T(ctx, `t = ${t.toFixed(2)}   ⟨p⟩ = ${pExp.toFixed(2)} ħ   width grows as σ(t) = σ√(1 + t²/4σ⁴)`, 760, 40, {size: 11, align: 'right', color: C.muted});
    const arrowX = X(x0 + k * t); ctx.strokeStyle = conj ? C.red : C.green; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(arrowX, 250); ctx.lineTo(arrowX + Math.sign(k) * 40, 250); ctx.stroke(); ctx.lineWidth = 1;
    T(ctx, conj ? 'ψ* : momentum sign flipped' : 'ψ : packet moves with k₀', arrowX, 272, {size: 11, align: 'center', color: conj ? C.red : C.green});
    [-15, -10, -5, 0, 5, 10, 15].forEach(x => T(ctx, String(x), X(x), 300, {size: 10, color: C.dim, align: 'center'}));
    s.status.textContent = conj ? `Conjugating the initial state reverses the phase gradient, so ⟨p⟩ changes sign (${pExp.toFixed(2)} ħ) and the packet travels the other way. Missing this sign is a classic reasoning error the tasks check for.` : `A free Gaussian packet with ⟨p⟩ = ${pExp.toFixed(2)} ħ drifts and spreads while |ψ|² stays normalised. Re ψ and Im ψ oscillate at the de Broglie wavelength.`;
  });
};

// =====================================================================
// Seal — combining a map, a ledger and a logbook to answer one question
// =====================================================================
sims.seal = el => {
  const s = shell(el, {controls: btn('Next evidence', 'next') + btn('Restart', 'run'), h: 330});
  let step = 0, t0 = performance.now() / 1000;
  s.$('[data-act=next]').onclick = () => {step = Math.min(4, step + 1); t0 = performance.now() / 1000;}; s.$('[data-act=run]').onclick = () => {step = 0; t0 = performance.now() / 1000;};
  const docks = {A: [120, 90], B: [170, 170], C: [110, 250], D: [250, 270]};
  loop(s, () => {
    const {ctx} = s; clear(s); const el2 = reduced ? 99 : performance.now() / 1000 - t0, now = performance.now() / 1000;
    // map
    rr(ctx, 16, 16, 380, 298, 10, '#0c2233', '#1f4a66');
    ctx.fillStyle = '#b89f76'; ctx.beginPath(); ctx.moveTo(16, 16); ctx.lineTo(200, 16); ctx.bezierCurveTo(150, 90, 230, 140, 190, 200); ctx.bezierCurveTo(160, 250, 280, 250, 300, 314); ctx.lineTo(16, 314); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.2)'; for (let i = 0; i < 8; i++) {ctx.beginPath(); ctx.arc(80, 200, 30 + i * 18, 0, 7); ctx.stroke();}
    T(ctx, 'HARBOUR CHART · 1911', 250, 40, {size: 10, color: '#9cc9e6', weight: 700});
    Object.entries(docks).forEach(([k, [x, y]]) => {const hl = step >= 2 && k === 'B'; rr(ctx, x - 14, y - 10, 28, 20, 4, hl ? C.amber : '#5b4a33'); T(ctx, k, x, y + 5, {size: 12, align: 'center', color: hl ? '#1a1206' : '#f4e7d2', weight: 700}); if (hl) {ctx.strokeStyle = C.amber; ctx.beginPath(); ctx.arc(x, y, 22 + Math.sin(now * 4) * 3, 0, 7); ctx.stroke();}});
    if (step >= 4) {const k = ease(el2 / 3); const path = [[184, 170], [260, 150], [330, 110], [380, 60]]; ctx.strokeStyle = C.cyan; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(...path[0]); path.slice(1).forEach(p => ctx.lineTo(...p)); ctx.stroke(); ctx.setLineDash([]); const seg = k * 3, i = Math.min(2, Math.floor(seg)), f = seg - i; const px = lerp(path[i][0], path[i + 1][0], f), py = lerp(path[i][1], path[i + 1][1], f); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(px + 10, py); ctx.lineTo(px - 8, py - 6); ctx.lineTo(px - 8, py + 6); ctx.fill(); T(ctx, 'MARLIN', px, py - 12, {size: 10, align: 'center', color: C.cyan, weight: 700});}
    // ledger
    rr(ctx, 410, 16, 374, 140, 8, '#efe6d4'); T(ctx, 'CARGO LEDGER · folio 12', 424, 36, {size: 10, color: '#5a4630', weight: 700});
    [['K5', 'Wool', 'Dock A'], ['K6', 'Timber', 'Dock D'], ['K7', 'Machine parts', 'Dock B'], ['K8', 'Grain', 'Dock C']].forEach((r, i) => {const y = 62 + i * 24, hl = step >= 1 && i === 2; if (hl) rr(ctx, 418, y - 16, 358, 22, 4, 'rgba(255,181,71,.55)'); r.forEach((c, j) => T(ctx, c, 428 + j * 110, y, {size: 12, color: '#2a2016'}));});
    // logbook
    rr(ctx, 410, 166, 374, 148, 8, '#e3dccb'); T(ctx, 'HARBOURMASTER LOG · 14 March', 424, 186, {size: 10, color: '#5a4630', weight: 700});
    [['05:10', 'Dock A', 'Tern departs'], ['06:40', 'Dock B', 'Marlin departs'], ['07:15', 'Dock D', 'Gull arrives'], ['08:05', 'Dock B', 'Petrel arrives']].forEach((r, i) => {const y = 212 + i * 24, hl = step >= 3 && i === 1; if (hl) rr(ctx, 418, y - 16, 358, 22, 4, 'rgba(95,212,255,.45)'); r.forEach((c, j) => T(ctx, c, 428 + j * 110, y, {size: 12, color: '#2a2016', font: j ? FONT : MONO}));});
    const msgs = ['Question: when, and on which vessel, did cargo K7 leave the harbour?', 'Ledger: K7 (machine parts) was loaded at Dock B.', 'Chart: Dock B is on the inner quay, so any Dock B departure passes the harbour mouth.', 'Log: the only Dock B departure that morning is the Marlin at 06:40.', 'Answer: K7 left on the Marlin at 06:40 on 14 March. Three sources, each checked, one exact answer.'];
    s.status.textContent = msgs[step];
  });
};

// =====================================================================
// Mark — root cause from multi-file run data
// =====================================================================
sims.mark = el => {
  const s = shell(el, {controls: sel('mk-f', 'Candidate factor', [['offset', 'Fixture offset (mm)'], ['coolant', 'Coolant temperature (°C)'], ['load', 'Spindle load (%)'], ['shift', 'Operator shift']]) + btn('Add batch of 10 runs', 'add'), h: 320});
  seed = 42; const runs = [];
  const addRun = () => {const offset = rand() * .3, coolant = 18 + rand() * 10, load = 40 + rand() * 45, shift = rand() > .5 ? 1 : 0; const slip = 3.2 * offset + .015 * (coolant - 18) + .002 * load + (rand() - .5) * .16; runs.push({offset, coolant, load, shift, slip, born: performance.now() / 1000});};
  for (let i = 0; i < 30; i++) addRun(); runs.forEach(r => (r.born = 0));
  let f = 'offset'; s.$('#mk-f').onchange = e => (f = e.target.value); s.$('[data-act=add]').onclick = () => {for (let i = 0; i < 10; i++) addRun();};
  const corr = key => {const n = runs.length, xs = runs.map(r => r[key]), ys = runs.map(r => r.slip); const mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) {sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2;} return {r: sxy / Math.sqrt(sxx * syy), b: sxy / sxx, a: my - sxy / sxx * mx, min: Math.min(...xs), max: Math.max(...xs)};};
  loop(s, () => {
    const {ctx} = s; clear(s); const now = performance.now() / 1000;
    const c = corr(f), ys = runs.map(r => r.slip), ymin = Math.min(...ys), ymax = Math.max(...ys);
    rr(ctx, 16, 16, 470, 288, 10, C.panel, C.line);
    const X = v => 60 + (v - c.min) / (c.max - c.min || 1) * 400, Y = v => 270 - (v - ymin) / (ymax - ymin) * 220;
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(60, 40); ctx.lineTo(60, 270); ctx.lineTo(466, 270); ctx.stroke();
    T(ctx, 'BEARING SLIP (mm)', 30, 34, {size: 10, color: C.amber, weight: 700}); T(ctx, s.$('#mk-f').selectedOptions[0].text.toUpperCase(), 466, 292, {size: 10, color: C.muted, align: 'right', weight: 700});
    runs.forEach(r => {const k = r.born ? ease((now - r.born) / .7) : 1; ctx.beginPath(); ctx.arc(X(r[f]), Y(r.slip) - (1 - k) * 60, 4, 0, 7); ctx.fillStyle = r.born && now - r.born < 2 ? C.cyan : Math.abs(c.r) > .7 ? C.amber : '#7f8da0'; ctx.globalAlpha = k; ctx.fill(); ctx.globalAlpha = 1;});
    ctx.strokeStyle = C.orange; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(c.min), Y(c.a + c.b * c.min)); ctx.lineTo(X(c.max), Y(c.a + c.b * c.max)); ctx.stroke(); ctx.lineWidth = 1;
    T(ctx, `r = ${c.r.toFixed(2)}   r² = ${(c.r * c.r).toFixed(2)}   n = ${runs.length}`, 466, 60, {size: 12, align: 'right', color: C.ink, weight: 600});
    // ranking
    rr(ctx, 500, 16, 284, 288, 10, C.panel, C.line); T(ctx, 'VARIANCE EXPLAINED (r²)', 514, 38, {size: 10, color: C.amber, weight: 700});
    const all = [['offset', 'Fixture offset'], ['coolant', 'Coolant temp'], ['load', 'Spindle load'], ['shift', 'Operator shift']].map(([k, n]) => [n, corr(k).r ** 2, k]).sort((a, b) => b[1] - a[1]);
    all.forEach(([n, r2, k], i) => {const y = 70 + i * 54; T(ctx, n, 514, y, {size: 12, color: k === f ? C.ink : C.muted}); rr(ctx, 514, y + 10, 250, 12, 6, '#1a2330'); rr(ctx, 514, y + 10, Math.max(2, 250 * r2), 12, 6, i === 0 ? C.amber : '#4a5a70'); T(ctx, r2.toFixed(2), 770, y, {size: 12, align: 'right', color: C.ink, weight: 700});});
    const top = all[0];
    s.status.textContent = `${top[0]} explains ${(top[1] * 100).toFixed(0)} % of the slip variance across ${runs.length} runs, far ahead of the other factors, so it is the leading root cause. The answer key then asks for a controlled check: re-shim the fixture and confirm slip drops.`;
  });
};

// =====================================================================
// Dynamo — CDC pipeline with checkpoints, a crash and replay
// =====================================================================
sims.dynamo = el => {
  const s = shell(el, {controls: sel('dy-m', 'Sink write mode', [['upsert', 'Idempotent upsert by key'], ['append', 'Naive append']]) + btn('Crash the worker', 'crash') + btn('Reset', 'run'), h: 300});
  let events, next, cp, sink, rows, replayed, crashed, crashT, packets, mode = 'upsert', emitT, crashes = 0;
  const keys = ['A', 'B', 'C', 'D'];
  const reset = () => {events = []; next = 0; cp = 0; sink = new Map(); rows = 0; replayed = 0; crashed = false; crashes = 0; packets = []; emitT = 0;};
  reset();
  s.$('#dy-m').onchange = e => {mode = e.target.value; reset();}; s.$('[data-act=run]').onclick = reset;
  s.$('[data-act=crash]').onclick = () => {if (!crashed) {crashed = true; crashes++; crashT = performance.now() / 1000; packets = [];}};
  loop(s, dt => {
    const {ctx} = s; const now = performance.now() / 1000; clear(s);
    if (crashed && now - crashT > 1.6) {crashed = false; replayed += next - cp; next = cp;}
    emitT += dt; if (!crashed && emitT > .7 && packets.length < 3) {emitT = 0; const id = next; if (!events[id]) events[id] = {id, key: keys[id % 4], v: Math.floor(id / 4) + 1}; packets.push({e: events[id], x: 150}); next++;}
    packets.forEach(p => (p.x += dt * 170));
    packets = packets.filter(p => {if (p.x >= 560) {const e = p.e; if (mode === 'upsert') sink.set(e.key, e); else {rows++; sink.set(e.id + '#' + rows, e);} if ((e.id + 1) % 4 === 0) cp = e.id + 1; return false;} return true;});
    // source log
    rr(ctx, 16, 30, 120, 230, 10, C.panel, C.line); T(ctx, 'SOURCE LOG', 28, 50, {size: 10, color: C.amber, weight: 700});
    for (let i = 0; i < 8; i++) {const id = Math.max(0, next - 4) + i; const y = 74 + i * 22; T(ctx, `#${id} ${keys[id % 4]}=v${Math.floor(id / 4) + 1}`, 28, y, {size: 11, color: id < next ? C.muted : C.ink, font: MONO});}
    // belt
    rr(ctx, 140, 130, 440, 34, 17, '#161b22', C.line); for (let x = 150 + ((now * 170) % 30); x < 570; x += 30) {ctx.fillStyle = 'rgba(255,181,71,.25)'; ctx.fillRect(x, 145, 12, 3);}
    packets.forEach(p => {rr(ctx, p.x - 22, 134, 44, 26, 6, C.blue); T(ctx, `${p.e.key}${p.e.v}`, p.x, 152, {size: 12, align: 'center', weight: 700});});
    // worker
    rr(ctx, 330, 70, 110, 44, 10, crashed ? 'rgba(255,90,90,.2)' : 'rgba(57,255,136,.1)', crashed ? C.red : C.green); T(ctx, crashed ? 'WORKER DOWN' : 'WORKER', 385, 97, {size: 11, align: 'center', weight: 700, color: crashed ? C.red : C.green});
    T(ctx, `checkpoint @ #${cp}`, 385, 200, {size: 11, align: 'center', color: C.cyan}); ctx.strokeStyle = C.cyan; ctx.beginPath(); ctx.moveTo(385, 186); ctx.lineTo(385, 166); ctx.stroke();
    // sink
    rr(ctx, 596, 30, 188, 230, 10, C.panel, C.line); T(ctx, mode === 'upsert' ? 'SINK · KEYED TABLE' : 'SINK · APPENDED ROWS', 608, 50, {size: 10, color: C.amber, weight: 700});
    const list = [...sink.values()].slice(-8); list.forEach((e, i) => T(ctx, `${e.key} = v${e.v}   (#${e.id})`, 608, 76 + i * 22, {size: 11, font: MONO}));
    const dup = mode === 'append' ? rows - new Set([...sink.values()].map(e => e.id)).size : 0;
    T(ctx, `replayed events: ${replayed}`, 16, 286, {size: 12, color: C.muted}); T(ctx, `duplicate rows: ${dup}`, 784, 286, {size: 12, align: 'right', color: dup ? C.red : C.green, weight: 700});
    s.status.textContent = crashed ? 'Worker crashed. It restarts from the last checkpoint and replays the events after it.'  : crashes && replayed === 0 ? 'Recovered. The crash landed right on a checkpoint, so nothing had to be replayed. Crash it again mid-batch to see a replay.' : replayed === 0 ? 'Events stream from the source log, the worker checkpoints every four events, and the sink stores the result. Crash the worker to test recovery.' : mode === 'upsert' ? `Replayed ${replayed} events after recovery. Upserts by key make the replay idempotent, so the table matches a run that never crashed.` : `Replayed ${replayed} events, and naive appends produced ${dup} duplicate rows. This is exactly the failure the benchmark's replay tests catch.`;
  });
};

// =====================================================================
// OpenClaw — agent run with tool calls, privacy boundary and rubric checks
// =====================================================================
sims.openclaw = el => {
  const s = shell(el, {controls: sel('oc-t', 'Task given to the agent', [['sum', 'Summarise the pump maintenance log'], ['priv', 'Email the summary with the technician\'s phone number'], ['del', 'Delete old log files']]) + btn('Run agent', 'run'), h: 320});
  let task = 'sum', t0 = performance.now() / 1000;
  s.$('#oc-t').onchange = e => {task = e.target.value; t0 = performance.now() / 1000;}; s.$('[data-act=run]').onclick = () => (t0 = performance.now() / 1000);
  const plans = {
    sum: [['plan', 'Plan: read log, extract faults, summarise', C.cyan], ['tool', 'read_file("pump_log.csv")', C.blue], ['tool', 'summarise(rows=214)', C.blue], ['gate', 'Privacy check: no personal data', C.green], ['out', 'Answer: 3 faults, bearing temp trend rising', C.green]],
    priv: [['plan', 'Plan: summarise, then email the team', C.cyan], ['tool', 'read_file("pump_log.csv")', C.blue], ['tool', 'draft_email(to="team")', C.blue], ['gate', 'Privacy check: phone number detected → redacted', C.amber], ['out', 'Email sent without the personal number', C.green]],
    del: [['plan', 'Plan: find files older than 90 days', C.cyan], ['tool', 'list_files("logs/", older_than=90)', C.blue], ['gate', 'Destructive action: confirmation required', C.red], ['out', 'Asked the user to confirm 12 files first', C.amber]]
  };
  const rub = {sum: [1, 1, 1, 1], priv: [1, 1, 1, 1], del: [1, 1, 1, 1]};
  loop(s, () => {
    const {ctx} = s; clear(s); const el2 = reduced ? 99 : performance.now() / 1000 - t0; const P = plans[task];
    T(ctx, 'AGENT TRAJECTORY', 24, 36, {size: 10, color: C.amber, weight: 700});
    P.forEach(([kind, text, col], i) => {
      const k = ease((el2 - i * .9) / .5); if (k <= 0) return; const y = 54 + i * 50;
      ctx.globalAlpha = k; if (i) {ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(44, y - 18); ctx.lineTo(44, y); ctx.stroke();}
      ctx.beginPath(); ctx.arc(44, y + 16, 10, 0, 7); ctx.fillStyle = col; ctx.fill(); T(ctx, kind === 'plan' ? 'P' : kind === 'tool' ? 'T' : kind === 'gate' ? '!' : '✓', 44, y + 20, {size: 11, align: 'center', color: '#0a0e15', weight: 800});
      rr(ctx, 64, y, 430, 32, 8, kind === 'gate' ? 'rgba(255,181,71,.08)' : 'rgba(255,255,255,.03)', kind === 'gate' ? col : C.line);
      T(ctx, text, 78, y + 21, {size: 12, color: C.ink, font: kind === 'tool' ? MONO : FONT}); ctx.globalAlpha = 1;
    });
    rr(ctx, 520, 20, 264, 280, 10, C.panel, C.line); T(ctx, 'RUBRIC', 534, 44, {size: 10, color: C.amber, weight: 700});
    ['Chose the right tools', 'Stayed within the privacy boundary', 'Handled risky actions safely', 'Final answer grounded in the log'].forEach((r, i) => {const k = el2 > P.length * .9 + i * .3; const y = 76 + i * 50; ctx.beginPath(); ctx.arc(546, y - 4, 9, 0, 7); ctx.fillStyle = k ? (rub[task][i] ? C.green : C.red) : '#1a2330'; ctx.fill(); if (k) T(ctx, '✓', 546, y, {size: 11, align: 'center', color: '#0a0e15', weight: 800}); wrap(ctx, r, 564, y, 200, 15, {size: 12, color: k ? C.ink : C.muted});});
    s.status.textContent = task === 'sum' ? 'A clean run: the agent reads the log, summarises it and passes the privacy check before answering.' : task === 'priv' ? 'The privacy boundary catches the personal phone number and redacts it before anything is sent.' : 'Deleting files is destructive, so the agent stops and asks for confirmation instead of acting on its own.';
  });
};

// =====================================================================
// Touchstone — playable conveyor sorting game
// =====================================================================
sims.touchstone = el => {
  const s = shell(el, {controls: btn('← Blue bin', 'l') + btn('Amber bin →', 'r') + btn('Start / restart', 'run'), h: 300, label: 'PLAYABLE GAME', note: 'Use ← and → (or tap the left or right half of the game) to set the diverter. Sort each crate into the bin of its colour. Three misses end the round.'});
  let crates, gate, score, miss, speed, spawn, over, started, best = 0;
  const reset = () => {crates = []; gate = 0; score = 0; miss = 0; speed = 110; spawn = 0; over = false; started = true;};
  reset(); started = false;
  const setGate = g => {gate = g; if (!started || over) {reset();}};
  s.$('[data-act=l]').onclick = () => setGate(0); s.$('[data-act=r]').onclick = () => setGate(1); s.$('[data-act=run]').onclick = reset;
  s.canvas.addEventListener('pointerdown', e => {const r = s.canvas.getBoundingClientRect(); setGate(e.clientX - r.left < r.width / 2 ? 0 : 1);});
  el.tabIndex = 0; el.addEventListener('keydown', e => {if (e.key === 'ArrowLeft') setGate(0); else if (e.key === 'ArrowRight') setGate(1); else return; e.preventDefault();});
  loop(s, dt => {
    const {ctx} = s; clear(s);
    if (started && !over) {
      spawn -= dt; if (spawn <= 0) {crates.push({x: -30, c: Math.random() > .5 ? 1 : 0, y: 110, vy: 0, falling: false, dir: 0}); spawn = Math.max(.7, 1.8 - score * .04);}
      speed = 110 + score * 4;
      crates.forEach(c => {if (!c.falling) {c.x += speed * dt; if (c.x >= 470) {c.falling = true; c.dir = gate;}} else {c.x += (c.dir ? 1 : -1) * 120 * dt; c.vy += 900 * dt; c.y += c.vy * dt;}});
      crates = crates.filter(c => {if (c.y > 250) {if (c.dir === c.c) score++; else miss++; if (miss >= 3) {over = true; best = Math.max(best, score);} return false;} return true;});
    }
    // conveyor
    rr(ctx, 20, 126, 460, 22, 11, '#161b22', C.line); const off = (performance.now() / 1000 * speed) % 24; for (let x = 24 + off; x < 474; x += 24) {ctx.fillStyle = 'rgba(255,181,71,.3)'; ctx.fillRect(x, 134, 10, 3);}
    for (let x = 40; x < 480; x += 60) {ctx.beginPath(); ctx.arc(x, 158, 6, 0, 7); ctx.fillStyle = '#2a3038'; ctx.fill();}
    // diverter
    ctx.save(); ctx.translate(490, 140); ctx.rotate(gate ? .5 : -.5 + Math.PI); ctx.fillStyle = C.ink; ctx.fillRect(0, -4, 70, 8); ctx.restore(); ctx.beginPath(); ctx.arc(490, 140, 9, 0, 7); ctx.fillStyle = C.amber; ctx.fill();
    // bins
    [[360, C.blue, 'BLUE'], [590, C.amber, 'AMBER']].forEach(([x, col, n]) => {rr(ctx, x - 70, 250, 140, 44, 8, 'rgba(255,255,255,.03)', col, 2); T(ctx, n, x, 278, {size: 12, align: 'center', color: col, weight: 700});});
    crates.forEach(c => {rr(ctx, c.x - 16, c.y - 16, 32, 32, 5, c.c ? C.amber : C.blue); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.strokeRect(c.x - 10, c.y - 10, 20, 20);});
    T(ctx, `SCORE ${score}`, 24, 40, {size: 16, weight: 700}); T(ctx, `MISSES ${'●'.repeat(miss)}${'○'.repeat(3 - miss)}`, 24, 64, {size: 13, color: miss ? C.red : C.muted}); T(ctx, `BEST ${best}`, 780, 40, {size: 13, align: 'right', color: C.muted});
    if (!started || over) {rr(ctx, 250, 40, 300, 70, 12, 'rgba(10,14,21,.9)', C.amber); T(ctx, over ? `ROUND OVER · SCORE ${score}` : 'CONVEYOR SORTER', 400, 70, {size: 16, align: 'center', weight: 700, color: C.amber}); T(ctx, 'Press ← / → or tap to start', 400, 94, {size: 12, align: 'center', color: C.muted});}
    s.status.textContent = over ? `Round over with ${score} crates sorted. Controls, game states, win/loss and restart are the same things the Touchstone task specs define.` : `Score ${score}, misses ${miss} of 3. The belt speeds up as you score.`;
  });
};

// ---------- boot ----------
document.querySelectorAll('[data-demo]').forEach(el => {
  const fn = sims[el.dataset.demo]; if (!fn) return;
  try {fn(el);} catch (err) {el.innerHTML = '<p>Simulation unavailable in this browser.</p>'; console.error('Simulation failed:', err);}
});
