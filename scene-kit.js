// Shared rendering kit: studio lighting, procedural PBR textures and a visibility-aware render loop.
import * as THREE from 'three';

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export function makeRenderer(maxRatio = 2) {
  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, maxRatio));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

// A photo-studio environment: dark cyclorama, big overhead softbox, warm and cool rim strips.
export function studioEnvironment(renderer, {warm = [1.0, .78, .55], cool = [.6, .82, 1.0]} = {}) {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({color: 0x2c3038, side: THREE.BackSide}));
  room.position.y = 5; env.add(room);
  const floorM = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({color: 0x15171b})); floorM.rotation.x = -Math.PI / 2; floorM.position.y = -.99; env.add(floorM);
  const panel = (w, h, rgb, k, pos, look) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({side: THREE.DoubleSide}));
    m.material.color.setRGB(rgb[0] * k, rgb[1] * k, rgb[2] * k);
    m.position.set(...pos); m.lookAt(...look); env.add(m);
  };
  panel(16, 12, [1, 1, 1], 3.2, [0, 10.8, 0], [0, 0, 0]);          // overhead softbox
  panel(7, 7, [1, .98, .95], 2.2, [-7, 4.5, 7], [0, 2, 0]);          // big key softbox, front-left
  panel(7, 7, [.95, .98, 1], 1.5, [7, 4.5, 7], [0, 2, 0]);           // fill softbox, front-right
  panel(1.2, 7, warm, 2.4, [-9.5, 4, 2], [0, 3, 0]);              // warm rim strip
  panel(1.2, 7, cool, 2.4, [9.5, 4, 2], [0, 3, 0]);               // cool rim strip
  panel(18, 7, [1, 1, 1], 1.9, [0, 6, -9.7], [0, 2, 0]);        // large back-top softbox (what flat metal faces reflect)
  panel(20, 1.4, [1, 1, 1], .9, [0, .6, -9.8], [0, .6, 0]);        // horizon glow
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, .035).texture;
  pmrem.dispose(); env.traverse(o => {o.geometry?.dispose(); o.material?.dispose?.()});
  return tex;
}

// ---------- procedural textures ----------
function canvas(w, h = w) {const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')];}
function toTex(c, {srgb = false, repeat = 1} = {}) {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}
let seed = 7; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// Brushed / machined metal roughness: fine directional streaks.
export function brushedTexture(base = 150, spread = 60, size = 512) {
  const [c, g] = canvas(size); g.fillStyle = `rgb(${base},${base},${base})`; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const v = base + (rand() - .5) * spread; g.strokeStyle = `rgba(${v},${v},${v},${.25 + rand() * .5})`;
    g.lineWidth = rand() * 1.4 + .2; const y = rand() * size, len = 40 + rand() * size;
    const x = rand() * size; g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y + (rand() - .5) * 2); g.stroke();
    if (x + len > size) {g.beginPath(); g.moveTo(x - size, y); g.lineTo(x + len - size, y); g.stroke();}
  }
  return toTex(c);
}
// Fine speckle for powder coat, cast iron, plastics.
export function speckleTexture(base = 128, spread = 70, size = 256, density = 1) {
  const [c, g] = canvas(size); const img = g.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {const v = base + (rand() - .5) * spread * density; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;}
  g.putImageData(img, 0, 0); return toTex(c);
}
// Radial fade used as an alpha map so floors melt into the page.
export function radialFade(size = 256, inner = .15, outer = .5) {
  const [c, g] = canvas(size); const gr = g.createRadialGradient(size / 2, size / 2, size * inner, size / 2, size / 2, size * outer);
  gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); return t;
}
// Engineering floor grid (tile seams + fine minor lines).
export function gridTexture({size = 512, major = 4, bg = '#171b22', line = '#2c3542', minor = '#1d232c'} = {}) {
  const [c, g] = canvas(size); g.fillStyle = bg; g.fillRect(0, 0, size, size);
  g.strokeStyle = minor; g.lineWidth = 1; const step = size / (major * 4);
  for (let i = 0; i <= size; i += step) {g.beginPath(); g.moveTo(i, 0); g.lineTo(i, size); g.moveTo(0, i); g.lineTo(size, i); g.stroke();}
  g.strokeStyle = line; g.lineWidth = 2; const s2 = size / major;
  for (let i = 0; i <= size; i += s2) {g.beginPath(); g.moveTo(i, 0); g.lineTo(i, size); g.moveTo(0, i); g.lineTo(size, i); g.stroke();}
  return toTex(c, {srgb: true});
}
export function hazardTexture() {
  const [c, g] = canvas(256, 32); g.fillStyle = '#16181c'; g.fillRect(0, 0, 256, 32); g.fillStyle = '#f4b41a';
  for (let x = -32; x < 288; x += 32) {g.beginPath(); g.moveTo(x, 32); g.lineTo(x + 16, 32); g.lineTo(x + 32, 0); g.lineTo(x + 16, 0); g.fill();}
  const t = toTex(c, {srgb: true}); return t;
}
export function fenceTexture() {
  const [c, g] = canvas(128); g.clearRect(0, 0, 128, 128); g.strokeStyle = '#fff'; g.lineWidth = 3;
  for (let i = 0; i <= 128; i += 16) {g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.moveTo(0, i); g.lineTo(128, i); g.stroke();}
  return toTex(c);
}
// Timing-belt teeth (dark rubber with ridges) used on the drive belt.
export function beltTexture() {
  const [c, g] = canvas(64, 16); g.fillStyle = '#1a1b1e'; g.fillRect(0, 0, 64, 16);
  for (let x = 0; x < 64; x += 8) {g.fillStyle = '#0c0d0f'; g.fillRect(x, 0, 4, 16); g.fillStyle = '#2a2b30'; g.fillRect(x + 4, 0, 1, 16);}
  return toTex(c, {srgb: true});
}
export function conveyorTexture() {
  const [c, g] = canvas(64); g.fillStyle = '#23262b'; g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 8) {g.fillStyle = '#16181b'; g.fillRect(0, y, 64, 3);}
  for (let i = 0; i < 300; i++) {g.fillStyle = `rgba(255,255,255,${rand() * .05})`; g.fillRect(rand() * 64, rand() * 64, 1, 1);}
  return toTex(c, {srgb: true});
}
export function pcbTexture() {
  const [c, g] = canvas(256); g.fillStyle = '#0d4a2c'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#1f7a48'; g.lineWidth = 2;
  for (let i = 0; i < 60; i++) {g.beginPath(); let x = rand() * 256, y = rand() * 256; g.moveTo(x, y); for (let k = 0; k < 3; k++) {rand() > .5 ? x += (rand() - .5) * 120 : y += (rand() - .5) * 120; g.lineTo(x, y);} g.stroke();}
  g.fillStyle = '#111'; for (let i = 0; i < 7; i++) g.fillRect(20 + rand() * 200, 20 + rand() * 200, 20 + rand() * 30, 16 + rand() * 20);
  g.fillStyle = '#c9a44a'; for (let i = 0; i < 40; i++) g.fillRect(rand() * 256, rand() * 256, 4, 4);
  return toTex(c, {srgb: true});
}

// Box-projected UVs for meshes that arrive without UVs (e.g. tessellated STEP).
export function boxUV(geometry, scale = 1 / 100) {
  const pos = geometry.attributes.position; const uv = new Float32Array(pos.count * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    n.subVectors(c, b).cross(a.clone().sub(b)); const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    [a, b, c].forEach((p, k) => {
      let u, v; if (az >= ax && az >= ay) {u = p.x; v = p.y;} else if (ax >= ay) {u = p.y; v = p.z;} else {u = p.x; v = p.z;}
      uv[(i + k) * 2] = u * scale; uv[(i + k) * 2 + 1] = v * scale;
    });
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geometry;
}

// Soft fading floor that receives real shadows.
export function studioFloor({size, color = 0x14171d, map = null, repeat = 1, roughness = .55, fadeInner = .12, fadeOuter = .5, upZ = false}) {
  const alpha = radialFade(256, fadeInner, fadeOuter);
  if (map) {map.repeat.set(repeat, repeat);}
  const mat = new THREE.MeshStandardMaterial({color, map, roughness, metalness: .05, transparent: true, alphaMap: alpha, depthWrite: false});
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  if (!upZ) floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true; floor.renderOrder = -1; return floor;
}

// Rounded "pill" label sprite.
export function labelSprite(text, {scale = 1, accent = '#ffb547'} = {}) {
  const [c, g] = canvas(512, 96); g.font = '600 34px Manrope, DM Sans, Arial'; const w = Math.min(500, g.measureText(text).width + 70);
  const x = (512 - w) / 2; g.fillStyle = 'rgba(10,13,19,.86)'; g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2;
  g.beginPath(); g.roundRect(x, 14, w, 64, 32); g.fill(); g.stroke();
  g.fillStyle = accent; g.beginPath(); g.arc(x + 30, 46, 7, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#eef3fb'; g.textBaseline = 'middle'; g.fillText(text, x + 48, 48);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map: tex, depthTest: false, transparent: true}));
  s.scale.set(2.6 * scale, .49 * scale, 1); s.renderOrder = 10; return s;
}

// Runs `frame(dt, t)` only while the element is on screen and the tab is visible.
export function visibleLoop(el, frame) {
  let onScreen = false, raf = 0, last = 0, t = 0;
  const tick = now => {
    raf = 0; if (!onScreen || document.hidden) return;
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now; t += dt;
    frame(dt, t); raf = requestAnimationFrame(tick);
  };
  const kick = () => {if (!raf && onScreen && !document.hidden) {last = 0; raf = requestAnimationFrame(tick);}};
  new IntersectionObserver(e => {onScreen = e[0].isIntersecting; kick();}, {rootMargin: '120px'}).observe(el);
  document.addEventListener('visibilitychange', kick);
  return {kick};
}
