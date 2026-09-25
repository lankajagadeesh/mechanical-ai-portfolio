// Mechanical page motion: hero gear train, CAD dimension line, rack-and-pinion scroll gauge and conveyor dividers.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS = 'http://www.w3.org/2000/svg';
let scrollVel = 0, lastY = scrollY;
addEventListener('scroll', () => {scrollVel += (scrollY - lastY); lastY = scrollY;}, {passive: true});

// ---------- gear geometry (involute-like tooth outline, drawn as a path) ----------
function gearPath(teeth, module) {
  const r = teeth * module / 2, ra = r + module, rf = r - 1.25 * module, pts = [];
  for (let i = 0; i < teeth; i++) {
    const a = i / teeth * Math.PI * 2, da = Math.PI * 2 / teeth;
    [[rf, 0], [rf, .1], [r, .2], [ra, .3], [ra, .48], [r, .58], [rf, .68], [rf, 1]].forEach(([rr, f]) => pts.push([rr * Math.cos(a + da * f), rr * Math.sin(a + da * f)]));
  }
  return 'M' + pts.map(p => p.map(v => v.toFixed(2)).join(' ')).join('L') + 'Z';
}

// ---------- hero gear train ----------
const hero = document.querySelector('.hero-copy');
if (hero) {
  const m = 4, gears = [{z: 28, x: 0, y: 0}, {z: 14, x: 0, y: 0}, {z: 20, x: 0, y: 0}, {z: 10, x: 0, y: 0}];
  // place meshing gears: centre distance = m (z1 + z2) / 2
  gears[0].x = 0; gears[0].y = 0;
  const place = (g, prev, ang) => {const d = m * (g.z + prev.z) / 2; g.x = prev.x + d * Math.cos(ang); g.y = prev.y + d * Math.sin(ang);};
  place(gears[1], gears[0], -.3); place(gears[2], gears[1], .35); place(gears[3], gears[2], -.3);
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'hero-gears'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('viewBox', '-64 -64 600 128');
  const els = gears.map((g, i) => {
    const grp = document.createElementNS(NS, 'g'); const p = document.createElementNS(NS, 'path'); p.setAttribute('d', gearPath(g.z, m)); p.setAttribute('class', 'gear g' + i);
    const hub = document.createElementNS(NS, 'circle'); hub.setAttribute('r', m * 1.6); hub.setAttribute('class', 'gear-hub');
    const bore = document.createElementNS(NS, 'circle'); bore.setAttribute('r', m * .7); bore.setAttribute('class', 'gear-bore');
    const pitch = document.createElementNS(NS, 'circle'); pitch.setAttribute('r', g.z * m / 2); pitch.setAttribute('class', 'gear-pitch');
    grp.append(p, pitch, hub, bore); svg.appendChild(grp); return grp;
  });
  const label = document.createElementNS(NS, 'text'); label.setAttribute('class', 'gear-label'); label.setAttribute('x', 250); label.setAttribute('y', 4); svg.appendChild(label);
  hero.prepend(svg);
  // offset alternate gears by half a tooth so they mesh
  const phase = [0, Math.PI / gears[1].z, 0, Math.PI / gears[3].z];
  let angle = 0, speed = .35, hover = 0;
  document.querySelector('.hero')?.addEventListener('pointermove', () => (hover = 1.4));
  const tick = () => {
    const boost = Math.min(6, Math.abs(scrollVel) * .02); scrollVel *= .85; hover *= .96;
    speed += ((.35 + boost + hover) - speed) * .08; angle += speed * .016;
    let a = angle;
    gears.forEach((g, i) => {if (i) a = -a * gears[i - 1].z / g.z; els[i].setAttribute('transform', `translate(${g.x} ${g.y}) rotate(${((a + phase[i]) * 180 / Math.PI).toFixed(2)})`);});
    const rpm = speed * 60 / (2 * Math.PI) * 10;
    label.textContent = `z28 → z10 · i = 1 : 2.8 · ${rpm.toFixed(0)} → ${(rpm * 2.8).toFixed(0)} rpm`;
    if (!reduced) requestAnimationFrame(tick);
  };
  tick();
}

// ---------- CAD dimension line over the headline ----------
const firstLine = document.querySelector('#hero-title .line');
if (firstLine) {
  const dim = document.createElement('span'); dim.className = 'dim-line'; dim.setAttribute('aria-hidden', 'true');
  dim.innerHTML = '<i class="ext l"></i><i class="ext r"></i><i class="arrow"></i><b>R1 · ±0.05</b>'; firstLine.prepend(dim);
}

// ---------- rack-and-pinion scroll gauge ----------
const stops = [['#work', 'Assembly'], ['.other-work', 'Builds'], ['#experience', 'Experience'], ['#ai', 'AI work'], ['#auren', 'AUREN'], ['.finale', 'Contact']]
  .map(([sel, name]) => [document.querySelector(sel), name]).filter(([el]) => el);
if (stops.length && matchMedia('(min-width: 1100px)').matches) {
  const H = 440, pitch = 11, z = 16, r = z * pitch / (2 * Math.PI);
  const wrap = document.createElement('nav'); wrap.className = 'rack-gauge'; wrap.setAttribute('aria-label', 'Section progress');
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `-40 -30 80 ${H + 60}`); svg.setAttribute('aria-hidden', 'true');
  let teeth = ''; for (let y = 0; y <= H; y += pitch) teeth += `M4 ${y} L10 ${y + pitch * .25} L10 ${y + pitch * .6} L4 ${y + pitch * .85}`;
  svg.innerHTML = `<rect class="rack-body" x="4" y="-6" width="10" height="${H + 12}" rx="2"/><path class="rack-teeth" d="${teeth}"/><line class="rack-fill" x1="16" y1="0" x2="16" y2="0"/><g class="pinion"><path d="${gearPath(z, pitch / Math.PI)}"/><circle r="4.5" class="pinion-hub"/><line x1="0" y1="0" x2="${r - 3}" y2="0" class="pinion-mark"/></g>`;
  wrap.appendChild(svg);
  const labels = document.createElement('div'); labels.className = 'rack-labels';
  stops.forEach(([el, name]) => {const a = document.createElement('a'); a.textContent = name; a.href = el.id ? '#' + el.id : '#'; a.addEventListener('click', e => {e.preventDefault(); el.scrollIntoView({behavior: reduced ? 'auto' : 'smooth'});}); labels.appendChild(a);});
  wrap.appendChild(labels); document.body.appendChild(wrap);
  const pinion = svg.querySelector('.pinion'), fill = svg.querySelector('.rack-fill');
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight, k = max > 0 ? scrollY / max : 0, y = k * H;
    // rolling without slip: rotation = distance travelled / pitch radius
    pinion.setAttribute('transform', `translate(${-r + 3} ${y}) rotate(${(y / r * 180 / Math.PI).toFixed(1)})`); fill.setAttribute('y2', y);
    const docTop = scrollY + innerHeight * .4;
    stops.forEach(([el], i) => {const top = el.getBoundingClientRect().top + scrollY; const pos = top / (max + innerHeight) * H; labels.children[i].style.top = `${(pos + 30) / (H + 60) * 100}%`; labels.children[i].classList.toggle('on', docTop >= top && (i === stops.length - 1 || docTop < stops[i + 1][0].getBoundingClientRect().top + scrollY));});
    wrap.classList.toggle('show', scrollY > innerHeight * .5);
  };
  addEventListener('scroll', () => requestAnimationFrame(update), {passive: true}); addEventListener('resize', update); setTimeout(update, 300);
}

// ---------- conveyor dividers that run with the scroll ----------
const partsSVG = [
  '<path d="M-9 -5 L0 -10 L9 -5 L9 5 L0 10 L-9 5Z" class="p-nut"/><circle r="4" class="p-hole"/>',
  `<path d="${gearPath(10, 2.2)}" class="p-gear"/><circle r="3" class="p-hole"/>`,
  '<circle r="10" class="p-bearing"/><circle r="6" class="p-race"/><circle r="3" class="p-hole"/>',
  '<rect x="-12" y="-3" width="20" height="6" rx="1" class="p-bolt"/><rect x="8" y="-6" width="6" height="12" rx="1" class="p-bolt-head"/>',
  '<rect x="-10" y="-8" width="20" height="16" rx="3" class="p-box"/><path d="M-10 -2 H10" class="p-tape"/>'
];
function makeConveyor(before, caption) {
  if (!before) return;
  const wrap = document.createElement('div'); wrap.className = 'conveyor'; wrap.setAttribute('aria-hidden', 'true');
  const W = 1400, n = 11;
  let rollers = ''; for (let i = 0; i <= n; i++) rollers += `<g transform="translate(${60 + i * (W - 120) / n} 52)"><circle r="9" class="roller"/><line x1="-6" y1="0" x2="6" y2="0" class="roller-mark"/></g>`;
  let parts = ''; for (let i = 0; i < 14; i++) parts += `<g class="part" data-i="${i}">${partsSVG[i % partsSVG.length]}</g>`;
  wrap.innerHTML = `<svg viewBox="0 0 ${W} 90" preserveAspectRatio="none"><rect x="40" y="40" width="${W - 80}" height="24" rx="12" class="belt"/><rect x="40" y="40" width="${W - 80}" height="24" rx="12" class="belt-links"/>${rollers}${parts}<rect x="30" y="66" width="${W - 60}" height="5" rx="2" class="frame"/></svg><span class="conveyor-caption">${caption}</span>`;
  before.before(wrap);
  const svg = wrap.querySelector('svg'), linkRect = wrap.querySelector('.belt-links'), roll = [...wrap.querySelectorAll('.roller-mark')], items = [...wrap.querySelectorAll('.part')];
  const spacing = (W - 80) / items.length;
  const update = () => {
    const rect = wrap.getBoundingClientRect(); if (rect.bottom < -50 || rect.top > innerHeight + 50) return;
    const travel = (scrollY * .9) % (W - 80);
    linkRect.style.strokeDashoffset = String(-scrollY * .9);
    roll.forEach(r => r.setAttribute('transform', `rotate(${scrollY * .9 / 9 * 180 / Math.PI})`));
    items.forEach((p, i) => {let x = 40 + ((i * spacing + travel) % (W - 80)); const bob = Math.sin((x + i) * .05) * .6; p.setAttribute('transform', `translate(${x.toFixed(1)} ${(30 + bob).toFixed(1)}) rotate(${i % 5 === 1 ? scrollY * .3 : 0})`);});
    void svg;
  };
  addEventListener('scroll', () => requestAnimationFrame(update), {passive: true}); update();
}
makeConveyor(document.querySelector('#work'), 'PART FLOW · FROM IDEA TO ASSEMBLY');
makeConveyor(document.querySelector('#experience'), 'IN-FEED · EXPERIENCE');
makeConveyor(document.querySelector('#auren'), 'NEXT STATION · AUREN');
