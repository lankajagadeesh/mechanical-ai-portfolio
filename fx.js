// Page motion: sticky header state, cursor light, skill marquee, scroll reveals, count-ups and card spotlights.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const header = document.querySelector('.header');
const onScroll = () => header.classList.toggle('scrolled', scrollY > 20);
addEventListener('scroll', onScroll, {passive: true}); onScroll();

// Cursor light
const glow = document.querySelector('.cursor-glow');
if (glow && !reduced) addEventListener('pointermove', e => {glow.style.setProperty('--mx', e.clientX + 'px'); glow.style.setProperty('--my', e.clientY + 'px');}, {passive: true});

// Skills marquee (content duplicated for a seamless loop; the copy is hidden from assistive tech)
const strip = document.querySelector('.expertise-strip');
if (strip) {
  const items = [...strip.children]; const track = document.createElement('div'); track.className = 'marquee-track';
  items.forEach(i => track.appendChild(i));
  items.forEach(i => {const c = i.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c);});
  strip.appendChild(track);
}

// Scroll reveal
const targets = document.querySelectorAll('.tile,.toolkit h2,.finale>*,.section-heading,.case-title,.case-grid>div,.results article,.engineering-detail>*,.project-row,.project-feature-heading,.project-feature-body>*,.interactive-demo,.timeline article,.experience-layout>h2,.ai-intro>*,.ai-project,.ai-other,.auren-intro>*,.auren-story,.about>*,.work-index');
targets.forEach(el => {
  el.classList.add('reveal');
  const sibs = el.parentElement ? [...el.parentElement.children].filter(c => targets.length && c.classList.contains('reveal')) : [];
  el.style.setProperty('--d', `${Math.min(4, Math.max(0, sibs.indexOf(el))) * .08}s`);
});
const io = new IntersectionObserver(entries => entries.forEach(e => {if (e.isIntersecting) {e.target.classList.add('in'); io.unobserve(e.target);}}), {rootMargin: '0px 0px -8% 0px', threshold: .05});
targets.forEach(el => io.observe(el));

// Count-up for headline numbers (final text is the original value)
document.querySelectorAll('.results strong').forEach(el => {
  const node = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (!node || reduced) return;
  const final = node.textContent.trim(), value = parseFloat(final), decimals = (final.split('.')[1] || '').length;
  el.setAttribute('aria-label', el.textContent.trim());
  const run = () => {
    const t0 = performance.now(), dur = 1600;
    const step = now => {const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4); node.textContent = (value * e).toFixed(decimals); if (k < 1) requestAnimationFrame(step); else node.textContent = final;};
    requestAnimationFrame(step);
  };
  new IntersectionObserver((en, obs) => {if (en[0].isIntersecting) {obs.disconnect(); run();}}, {threshold: .6}).observe(el);
});

// Spotlight that follows the pointer across cards
document.querySelectorAll('.case-grid>div,.tile').forEach(card => card.addEventListener('pointermove', e => {
  const r = card.getBoundingClientRect(); card.style.setProperty('--x', `${e.clientX - r.left}px`); card.style.setProperty('--y', `${e.clientY - r.top}px`);
}));

// Magnetic primary buttons
if (!reduced) document.querySelectorAll('.button.primary,.nav-resume').forEach(b => {
  b.addEventListener('pointermove', e => {const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px,${(e.clientY - r.top - r.height / 2) * .25}px)`;});
  b.addEventListener('pointerleave', () => (b.style.transform = ''));
});

// Hero stat count-up
if (!reduced) document.querySelectorAll('.hero-stats dd[data-count]').forEach((dd, i) => {
  const n = +dd.dataset.count, text = dd.firstChild; const t0 = performance.now() + 900 + i * 120;
  const step = now => {const k = Math.max(0, Math.min(1, (now - t0) / 1200)); text.textContent = String(Math.round(n * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step);};
  text.textContent = '0'; requestAnimationFrame(step);
});

// Gentle 3D tilt on toolkit tiles
if (!reduced && matchMedia('(hover:hover)').matches) document.querySelectorAll('.tile').forEach(t => {
  t.addEventListener('pointermove', e => {const r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; t.style.transform = `perspective(900px) rotateX(${-y * 5}deg) rotateY(${x * 6}deg) translateY(-3px)`;});
  t.addEventListener('pointerleave', () => (t.style.transform = ''));
});
