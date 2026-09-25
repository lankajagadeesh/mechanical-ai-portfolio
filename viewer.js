// Hero assembly: the R1 STEP tessellation rendered with studio lighting, PBR materials,
// real-time shadows, an animated belt drive and a live plate-travel simulation.
import * as THREE from 'three';
import {OrbitControls} from './assets/OrbitControls.js';
import {makeRenderer, studioEnvironment, brushedTexture, speckleTexture, gridTexture, beltTexture, boxUV, studioFloor, visibleLoop, reducedMotion} from './scene-kit.js';

const stage = document.querySelector('#cad-stage');
const loading = document.querySelector('#cad-loading');
const description = document.querySelector('#component-description');
const hud = document.querySelector('#cad-hud');
const controlsSel = '.viewer-controls button,.assembly-controls input,.assembly-controls select,.model-presets button,.sim-toggle';
document.querySelectorAll(controlsSel).forEach(c => c.disabled = true);
const info = {
  all: '22 STEP solids with original proportions and placements.',
  plate: '6061-T6 plate, 260 × 180 × 10 mm. Four guided slots provide 20 mm design travel.',
  adjuster: 'The right-side M10 adjustment screw pushes the plate left to increase pulley spacing.',
  frame: 'Base plate, support rails and side guides support and guide the moving plate.',
  motor: 'Motor body and mounting foot, bolted to the sliding plate.',
  drive: 'Drive and driven pulley pitch radii: 40 and 60 mm. Nominal centre distance: 360 mm.',
  hardware: 'Four clamp screws and washers lock the plate at the set position.'
};

// Smooth normals across shallow angles, keep hard machined edges crisp.
function creasedNormals(geometry, creaseDeg = 32) {
  const pos = geometry.attributes.position, count = pos.count, cos = Math.cos(creaseDeg * Math.PI / 180);
  const face = new Float32Array(count * 3), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    const n = c.sub(b).cross(a.sub(b)).normalize(); for (let k = 0; k < 3; k++) face.set([n.x, n.y, n.z], (i + k) * 3);
  }
  const buckets = new Map(); const key = i => `${Math.round(pos.getX(i) * 100)},${Math.round(pos.getY(i) * 100)},${Math.round(pos.getZ(i) * 100)}`;
  for (let i = 0; i < count; i++) {const k = key(i); (buckets.get(k) || buckets.set(k, []).get(k)).push(i);}
  const normals = new Float32Array(count * 3);
  for (const list of buckets.values()) for (const i of list) {
    let x = 0, y = 0, z = 0; const fx = face[i * 3], fy = face[i * 3 + 1], fz = face[i * 3 + 2];
    for (const j of list) {const gx = face[j * 3], gy = face[j * 3 + 1], gz = face[j * 3 + 2]; if (fx * gx + fy * gy + fz * gz >= cos) {x += gx; y += gy; z += gz;}}
    const l = Math.hypot(x, y, z) || 1; normals[i * 3] = x / l; normals[i * 3 + 1] = y / l; normals[i * 3 + 2] = z / l;
  }
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3)); return geometry;
}

try {
  const renderer = makeRenderer(2);
  renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  scene.environmentRotation.x = Math.PI / 2; scene.environmentIntensity = 1; // studio is Y-up, CAD is Z-up
  const camera = new THREE.PerspectiveCamera(32, 1, 5, 8000); camera.up.set(0, 0, 1);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .08; controls.enablePan = false;
  controls.minDistance = 340; controls.maxDistance = 1800; controls.maxPolarAngle = Math.PI * .49;

  // ---- lighting: key with soft shadows, warm rim, cool fill ----
  scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x1a1410, .55));
  const key = new THREE.DirectionalLight(0xfff8f0, 2.8); key.position.set(420, -520, 900); key.target.position.set(120, 0, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0004; key.shadow.normalBias = .6;
  Object.assign(key.shadow.camera, {left: -420, right: 420, top: 420, bottom: -420, near: 200, far: 2200}); key.shadow.radius = 5;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xffc896, 1.1); rim.position.set(-500, 420, 260); scene.add(rim);
  const fill = new THREE.DirectionalLight(0x6fb8ff, 1.1); fill.position.set(700, 300, 180); scene.add(fill);

  // ---- materials ----
  const brushed = brushedTexture(150, 70); brushed.repeat.set(1.4, 1.4);
  const brushedFine = brushedTexture(110, 60); brushedFine.repeat.set(3, 3);
  const speck = speckleTexture(128, 90, 256); speck.repeat.set(6, 6);
  const M = {
    plate: new THREE.MeshPhysicalMaterial({color: 0xe4e8ee, metalness: 1, roughness: .3, roughnessMap: brushed, clearcoat: .15, clearcoatRoughness: .4}),
    base: new THREE.MeshPhysicalMaterial({color: 0x26303c, metalness: .25, roughness: .62, bumpMap: speck, bumpScale: .6, clearcoat: .3, clearcoatRoughness: .5}),
    rail: new THREE.MeshStandardMaterial({color: 0xa3acb6, metalness: 1, roughness: .26, roughnessMap: brushedFine}),
    guide: new THREE.MeshPhysicalMaterial({color: 0xe8672a, metalness: .75, roughness: .32, roughnessMap: brushedFine, clearcoat: .4}),
    foot: new THREE.MeshStandardMaterial({color: 0x3a4250, metalness: .55, roughness: .5, bumpMap: speck, bumpScale: .4}),
    motor: new THREE.MeshPhysicalMaterial({color: 0x1c447e, metalness: .55, roughness: .32, clearcoat: 1, clearcoatRoughness: .12, bumpMap: speck, bumpScale: .15}),
    pulley: new THREE.MeshStandardMaterial({color: 0xc9ced6, metalness: 1, roughness: .22, roughnessMap: brushedFine}),
    shaft: new THREE.MeshStandardMaterial({color: 0xe3e7ec, metalness: 1, roughness: .1}),
    screw: new THREE.MeshStandardMaterial({color: 0x24262b, metalness: .85, roughness: .32}),
    washer: new THREE.MeshStandardMaterial({color: 0xc8cdd4, metalness: 1, roughness: .28, roughnessMap: brushedFine}),
    block: new THREE.MeshPhysicalMaterial({color: 0xd63a2f, metalness: .7, roughness: .3, roughnessMap: brushedFine, clearcoat: .5})
  };
  const pick = p => {
    const n = p.name;
    if (p.group === 'plate') return M.plate;
    if (n === 'Base plate') return M.base;
    if (n === 'Support rail') return M.rail;
    if (n === 'Guide strip') return M.guide;
    if (n === 'Motor mounting foot') return M.foot;
    if (n === 'Motor body envelope') return M.motor;
    if (/pulley/i.test(n)) return M.pulley;
    if (/shaft/i.test(n)) return M.shaft;
    if (n === 'Clamp washer') return M.washer;
    if (n === 'Adjuster reaction block') return M.block;
    return M.screw;
  };
  const pivots = {'Motor shaft': [0, 0, 85], 'Drive pulley': [0, 0, 85], 'Driven pulley': [360, 0, 85], 'Driven shaft': [360, 0, 85], 'Adjustment screw': [160, 0, 18]};
  const movesWithPlate = new Set(['Slotted motor plate and thrust boss', 'Motor mounting foot', 'Motor body envelope', 'Motor shaft', 'Drive pulley']);

  const model = new THREE.Group(); scene.add(model); const meshes = [];
  const response = await fetch('./assets/assembly.json'); if (!response.ok) throw new Error('CAD unavailable'); const data = await response.json();
  for (const part of data.solids) {
    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(part.positions, 3)); geometry.setIndex(part.indices);
    geometry = geometry.toNonIndexed(); creasedNormals(geometry); boxUV(geometry, 1 / 180);
    const pivot = pivots[part.name] || [0, 0, 0]; geometry.translate(-pivot[0], -pivot[1], -pivot[2]);
    const material = pick(part).clone();
    const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData = {...part, base: new THREE.Vector3(...pivot), spin: 0};
    mesh.position.copy(mesh.userData.base); model.add(mesh); meshes.push(mesh);
  }
  const byName = n => meshes.filter(m => m.userData.name === n);
  // Set-screw markers on the pulley hubs make rotation readable.
  for (const [name, r] of [['Drive pulley', 28], ['Driven pulley', 44]]) for (const m of byName(name)) {
    const dot = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 2, 6), new THREE.MeshStandardMaterial({color: 0x121316, metalness: .8, roughness: .35}));
    dot.position.set(0, 74, r); m.add(dot);
    const key2 = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 16), M.guide.clone()); key2.position.set(0, 74, -r * .6); m.add(key2);
  }

  // ---- timing belt on the pitch envelope, rebuilt when the plate travels ----
  const beltTex = beltTexture(); const beltMat = new THREE.MeshStandardMaterial({color: 0xffffff, map: beltTex, roughness: .78, metalness: 0, side: THREE.DoubleSide});
  const belt = new THREE.Mesh(new THREE.BufferGeometry(), beltMat); belt.castShadow = true; belt.receiveShadow = true; scene.add(belt);
  const PITCH = 8, R1 = 40, R2 = 60, Y0 = 77, Y1 = 93, TH = 3.2; let beltLength = 0;
  function buildBelt(x1) {
    const x2 = 360, d = x2 - x1, s = (R2 - R1) / d, c = Math.sqrt(1 - s * s), zc = 85;
    const upper = Math.atan2(c, -s), lower = Math.atan2(-c, -s); const pts = [];
    const push = (x, z, nx, nz) => pts.push([x, z, nx, nz]);
    const arc = (cx, r, from, to, n) => {for (let i = 0; i <= n; i++) {const a = from + (to - from) * i / n; push(cx + r * Math.cos(a), zc + r * Math.sin(a), Math.cos(a), Math.sin(a));}};
    arc(x2, R2, upper, lower, 48);                          // wrap around driven pulley
    arc(x1, R1, lower + Math.PI * 2, upper, 40);            // back along the lower span and around the drive pulley
    push(pts[0][0], pts[0][1], pts[0][2], pts[0][3]);       // close the loop
    const lens = [0]; for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const verts = [], uvs = [], idx = []; const len = lens[lens.length - 1];
    // Each face is its own strip so normals stay crisp: inner, outer, and the two belt edges.
    const at = (i, outer, y) => [pts[i][0] + (outer ? pts[i][2] * TH : 0), y, pts[i][1] + (outer ? pts[i][3] * TH : 0)];
    const strip = (fa, fb, flip) => {
      const start = verts.length / 3;
      pts.forEach((p, i) => {const u = lens[i] / (PITCH * 8); verts.push(...fa(i), ...fb(i)); uvs.push(u, 0, u, 1);});
      for (let i = 0; i < pts.length - 1; i++) {const a = start + i * 2, b = a + 2; flip ? idx.push(a, a + 1, b, a + 1, b + 1, b) : idx.push(a, b, a + 1, a + 1, b, b + 1);}
    };
    strip(i => at(i, false, Y0), i => at(i, false, Y1), false);
    strip(i => at(i, true, Y0), i => at(i, true, Y1), true);
    strip(i => at(i, false, Y0), i => at(i, true, Y0), true);
    strip(i => at(i, false, Y1), i => at(i, true, Y1), false);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals();
    belt.geometry.dispose(); belt.geometry = g; beltLength = len;
  }

  // ---- studio floor with engineering grid, glow ring and drifting dust ----
  const floor = studioFloor({size: 2200, color: 0x6a7280, map: gridTexture({bg: '#1a1f27', line: '#344052', minor: '#20262f'}), repeat: 5.5, roughness: .7, fadeInner: .05, fadeOuter: .48, upZ: true});
  floor.position.set(120, 0, -32.6); scene.add(floor);
  const ring = new THREE.Mesh(new THREE.RingGeometry(330, 334, 128), new THREE.MeshBasicMaterial({color: 0xffa640, transparent: true, opacity: .5}));
  ring.position.set(120, 0, -32.3); scene.add(ring);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(380, 381, 128), new THREE.MeshBasicMaterial({color: 0x69c7ff, transparent: true, opacity: .25}));
  ring2.position.set(120, 0, -32.3); scene.add(ring2);
  const dustGeo = new THREE.BufferGeometry(); const dustPos = new Float32Array(260 * 3);
  for (let i = 0; i < 260; i++) dustPos.set([120 + (Math.random() - .5) * 900, (Math.random() - .5) * 700, Math.random() * 420 - 20], i * 3);
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({color: 0xffd7a8, size: 2.2, transparent: true, opacity: .45, depthWrite: false, blending: THREE.AdditiveBlending}));
  scene.add(dust);

  // ---- state ----
  let shiftTarget = 0;
  let explode = 0, shift = 0, running = !reducedMotion.matches, driveAngle = 0, screwAngle = 0, beltOffset = 0;
  const offsets = {plate: 45, frame: 0, motor: 125, drive: 85, hardware: 80, adjuster: 20};
  function layout() {
    for (const m of meshes) {
      const u = m.userData; m.position.copy(u.base);
      m.position.z += (u.name === 'Base plate' ? -45 : offsets[u.group]) * explode;
      if (movesWithPlate.has(u.name) || u.name === 'Adjustment screw') m.position.x -= shift;
    }
    belt.visible = explode < .01;
    if (hud) hud.querySelector('[data-cd]').textContent = (360 + shift).toFixed(1);
    if (hud) hud.querySelector('[data-bl]').textContent = beltLength.toFixed(0);
  }
  function setShift(s) {shift = s; buildBelt(-s); layout();}
  setShift(0);

  function draw() {renderer.render(scene, camera);}
  function fitProjection() {camera.zoom = Math.min(1.35, Math.max(.5, camera.aspect * .8)); camera.updateProjectionMatrix();}
  function reset() {controls.target.set(125, 10, 30); camera.position.set(620, -700, 380); fitProjection(); controls.update(); draw();}
  function resize() {const {width, height} = stage.getBoundingClientRect(); if (!width || !height) return; renderer.setSize(width, height); camera.aspect = width / height; fitProjection(); draw();}
  stage.appendChild(renderer.domElement); renderer.domElement.setAttribute('aria-hidden', 'true');
  document.querySelector('#cad-fallback').hidden = true; loading.hidden = true; stage.dataset.loaded = 'true'; stage.dataset.solids = data.solids.length;
  new ResizeObserver(resize).observe(stage); reset(); resize();

  // ---- animation: belt drive ----
  const W1 = 2.4; // rad/s, drive pulley (visual)
  visibleLoop(stage, (dt, t) => {
    let dirty = controls.update();
    if (running) {
      dirty = true;
      driveAngle += W1 * dt;
      for (const m of meshes) {
        const n = m.userData.name;
        if (n === 'Drive pulley' || n === 'Motor shaft') m.rotation.y = driveAngle;
        if (n === 'Driven pulley' || n === 'Driven shaft') m.rotation.y = driveAngle * R1 / R2;
      }
      beltOffset -= (W1 * R1) * dt / (PITCH * 8); beltTex.offset.x = beltOffset;
      const p = dust.geometry.attributes.position; for (let i = 0; i < p.count; i++) {let z = p.getZ(i) + dt * 6; if (z > 400) z = -20; p.setZ(i, z);} p.needsUpdate = true;
      ring.material.opacity = .35 + Math.sin(t * 1.6) * .15;
    }
    const target = shiftTarget; if (Math.abs(target - shift) > .01) {const s = shift + (target - shift) * Math.min(1, dt * 5); const turn = (s - shift) / 1.5 * Math.PI * 2; screwAngle += turn; for (const m of byName('Adjustment screw')) m.rotation.x = screwAngle; setShift(s); dirty = true;}
    if (dirty) draw();
  });

  // ---- controls ----
  const explodeInput = document.querySelector('#explode'), component = document.querySelector('#component'), shiftInput = document.querySelector('#shift');
  explodeInput.addEventListener('input', e => {explode = Number(e.target.value) / 100; layout(); draw();});
  shiftInput?.addEventListener('input', e => {shiftTarget = Number(e.target.value); document.querySelector('#shift-value').textContent = `${Number(e.target.value).toFixed(0)} mm`;});
  function highlight(group) {
    for (const m of meshes) {
      const selected = group === 'all' || m.userData.group === group;
      m.material.opacity = selected ? 1 : .12; m.material.transparent = !selected; m.material.depthWrite = selected;
      m.material.emissive.setHex(selected && group !== 'all' ? 0x3a1c05 : 0); m.castShadow = selected;
    }
    beltMat.opacity = group === 'all' || group === 'drive' ? 1 : .15; beltMat.transparent = beltMat.opacity < 1;
    description.textContent = info[group];
  }
  component.addEventListener('change', e => {highlight(e.target.value); draw();});
  document.querySelector('#reset-view').addEventListener('click', reset);
  document.querySelector('#top-view').addEventListener('click', () => {controls.target.set(115, 0, 0); camera.position.set(115, -1, 1050); controls.update(); draw();});
  document.querySelector('#front-view').addEventListener('click', () => {controls.target.set(115, 0, 40); camera.position.set(115, -1050, 60); controls.update(); draw();});
  function zoom(factor) {const off = camera.position.clone().sub(controls.target); off.multiplyScalar(factor); off.clampLength(controls.minDistance, controls.maxDistance); camera.position.copy(controls.target).add(off); controls.update(); draw();}
  document.querySelector('#zoom-in').addEventListener('click', () => zoom(.85)); document.querySelector('#zoom-out').addEventListener('click', () => zoom(1.15));
  const toggle = document.querySelector('.sim-toggle');
  const syncToggle = () => {if (toggle) {toggle.setAttribute('aria-pressed', String(running)); toggle.textContent = running ? 'Pause drive' : 'Run drive';}};
  toggle?.addEventListener('click', () => {running = !running; syncToggle();}); syncToggle();
  reducedMotion.addEventListener('change', () => {running = !reducedMotion.matches; syncToggle();});
  stage.addEventListener('keydown', e => {
    if (e.key === 'r' || e.key === 'R') reset(); else if (e.key === '+' || e.key === '=') zoom(.85); else if (e.key === '-') zoom(1.15);
    else if (e.key.startsWith('Arrow')) {const off = camera.position.clone().sub(controls.target); if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') off.applyAxisAngle(new THREE.Vector3(0, 0, 1), e.key === 'ArrowLeft' ? .12 : -.12); else off.z += e.key === 'ArrowUp' ? 35 : -35; camera.position.copy(controls.target).add(off); controls.update(); draw();}
    else return; e.preventDefault();
  });
  renderer.domElement.addEventListener('webglcontextlost', e => {e.preventDefault(); document.querySelector('#cad-fallback').hidden = false; renderer.domElement.hidden = true; loading.hidden = false; loading.textContent = '3D paused. Still view shown. Reload to try again.'; document.querySelectorAll(controlsSel).forEach(c => c.disabled = true);});
  document.querySelectorAll(controlsSel).forEach(c => c.disabled = false);

  // Scroll tour used by interactions.js: the camera sweeps in while parts lift apart.
  function tour(t) {
    if (explodeInput.disabled) return;
    controls.target.set(125, 10, 30); camera.position.set(620 - t * 150, -700 + t * 80, 380 + t * 110);
    explode = Math.max(0, Math.min(.55, (t - .2) * .85)); layout(); highlight('all');
    explodeInput.value = String(Math.round(explode * 100)); component.value = 'all'; controls.update(); draw();
  }
  window.__cad = {scene, camera, controls, meshes, renderer, draw, reset, tour, setShift: v => {shiftTarget = v;}};
  dispatchEvent(new Event('cadready'));
} catch (error) {
  loading.textContent = 'Still view shown. Interactive 3D is unavailable in this browser.';
  for (const control of document.querySelectorAll(controlsSel)) control.disabled = true;
  stage.dataset.loaded = 'fallback'; console.warn('Using CAD still view:', error.message);
}
