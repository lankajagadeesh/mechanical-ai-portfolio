// TurtleBot avoidance simulation and floor-scrubber drivetrain scene.
import * as T from 'three';
import {brushedTexture, speckleTexture, gridTexture, pcbTexture, studioFloor, labelSprite} from './scene-kit.js';

const brushed = brushedTexture(150, 70); brushed.repeat.set(2, 2);
const speck = speckleTexture(128, 80); speck.repeat.set(4, 4);
const M = {
  chrome: new T.MeshStandardMaterial({color: 0xeef1f5, roughness: .1, metalness: 1}),
  steel: new T.MeshStandardMaterial({color: 0xb7bfc9, roughness: .28, metalness: 1, roughnessMap: brushed}),
  black: new T.MeshStandardMaterial({color: 0x141619, roughness: .55, metalness: .3}),
  rubber: new T.MeshStandardMaterial({color: 0x17181b, roughness: .92}),
  graphite: new T.MeshStandardMaterial({color: 0x2b3038, roughness: .5, metalness: .55}),
  plastic: new T.MeshStandardMaterial({color: 0x30343b, roughness: .55, bumpMap: speck, bumpScale: .004}),
  lightGrey: new T.MeshStandardMaterial({color: 0xd9dde3, roughness: .45})
};
const glow = (c, i = 2) => new T.MeshStandardMaterial({color: c, emissive: c, emissiveIntensity: i, roughness: .4});
function add(g, geo, m, x = 0, y = 0, z = 0) {const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o;}
const box = (g, x, y, z, w, h, d, m) => add(g, new T.BoxGeometry(w, h, d), m, x, y, z);
const cyl = (g, x, y, z, r, h, m, seg = 32, r2 = r) => add(g, new T.CylinderGeometry(r, r2, h, seg), m, x, y, z);
function roundedBox(w, h, d, r) {
  const s = new T.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new T.ExtrudeGeometry(s, {depth: d - r, bevelEnabled: true, bevelSize: r * .5, bevelThickness: r * .5, bevelSegments: 3, curveSegments: 8}); g.translate(0, 0, -(d - r) / 2); return g;
}
function cardboard() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#b0834f'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 900; i++) {g.fillStyle = `rgba(80,50,20,${Math.random() * .12})`; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 1);}
  g.fillStyle = '#d4b27d'; g.fillRect(52, 0, 24, 128); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}

// =====================================================================
// TurtleBot3 Burger in an arena, running the project's reactive avoidance logic
// =====================================================================
export function turtlebot(scene, ctx) {
  const U = 2;                                   // 2 scene units per metre
  const HALF = 3.2;                              // arena half-size (3.2 m square arena)
  const floor = studioFloor({size: 20, color: 0xb9c1cc, map: gridTexture({bg: '#252a31', line: '#3b434e', minor: '#2a3038', major: 4}), repeat: 5, roughness: .7, fadeInner: .1, fadeOuter: .5});
  scene.add(floor);
  // arena walls
  const wallMat = new T.MeshPhysicalMaterial({color: 0xdfe4ea, roughness: .5, clearcoat: .3});
  for (const [x, z, w, d] of [[0, -HALF - .05, HALF * 2 + .2, .1], [0, HALF + .05, HALF * 2 + .2, .1], [-HALF - .05, 0, .1, HALF * 2], [HALF + .05, 0, .1, HALF * 2]]) box(scene, x, .16, z, w, .32, d, wallMat);
  const stripe = new T.MeshStandardMaterial({color: 0xffb547, emissive: 0xff8a2a, emissiveIntensity: .35});
  for (const [x, z, w, d] of [[0, -HALF + .004, HALF * 2, .02], [0, HALF - .004, HALF * 2, .02], [-HALF + .004, 0, .02, HALF * 2], [HALF - .004, 0, .02, HALF * 2]]) box(scene, x, .3, z, w, .02, d, stripe);

  // ---- robot (built in metres, scaled up for legibility) ----
  const S = 3.4;
  const bot = new T.Group(); scene.add(bot); const body = new T.Group(); body.scale.setScalar(S); bot.add(body);
  const holes = (() => {const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#000'; for (let y = 10; y < 256; y += 22) for (let x = (y / 22 % 2) * 11 + 6; x < 256; x += 22) {g.beginPath(); g.roundRect(x, y, 12, 12, 2); g.fill();} return new T.CanvasTexture(c);})();
  const plateMat = new T.MeshStandardMaterial({color: 0x2e3238, roughness: .55, alphaMap: holes, alphaTest: .5, side: T.DoubleSide});
  const plateGeo = new T.CylinderGeometry(.072, .072, .003, 48);
  for (const y of [.05, .092, .134, .176]) {add(body, plateGeo, plateMat, 0, y, 0); for (const [x, z] of [[.05, .045], [-.05, .045], [.05, -.045], [-.05, -.045]]) cyl(body, x, y + .021, z, .0035, .042, M.chrome, 12);}
  for (const sx of [-1, 1]) box(body, sx * .035, .033, -.005, .034, .028, .046, M.black);
  box(body, 0, .066, .018, .07, .022, .035, new T.MeshStandardMaterial({color: 0x4a5058, roughness: .5}));
  box(body, 0, .1, 0, .105, .004, .105, new T.MeshStandardMaterial({map: pcbTexture(), roughness: .45, metalness: .2}));
  box(body, 0, .142, .005, .085, .004, .056, new T.MeshStandardMaterial({map: pcbTexture(), roughness: .45, metalness: .2}));
  box(body, .02, .148, .01, .014, .008, .014, M.steel); box(body, -.02, .148, 0, .02, .01, .016, M.steel);
  const led = cyl(body, .045, .18, .045, .006, .006, glow(0x39ff88, 3), 12);
  const wheels = [];
  for (const sx of [-1, 1]) {
    const w = new T.Group(); w.position.set(sx * .08, .033, -.005); body.add(w);
    const tire = add(w, new T.TorusGeometry(.028, .007, 16, 40), M.rubber); tire.rotation.y = Math.PI / 2;
    const hub = cyl(w, 0, 0, 0, .025, .014, M.lightGrey); hub.rotation.z = Math.PI / 2;
    for (let k = 0; k < 5; k++) {const sp = box(w, sx * .008, 0, 0, .002, .004, .044, M.graphite); sp.rotation.x = k / 5 * Math.PI;}
    wheels.push(w);
  }
  add(body, new T.SphereGeometry(.009, 20, 16), M.chrome, 0, .009, .06);
  box(body, 0, .186, 0, .07, .016, .07, M.black);
  const turret = new T.Group(); turret.position.y = .2; body.add(turret);
  cyl(turret, 0, 0, 0, .033, .018, new T.MeshStandardMaterial({color: 0x1b1d21, roughness: .25, metalness: .4}), 40);
  box(turret, 0, .002, -.03, .02, .01, .01, glow(0xff5a36, 2));
  const LIDAR_Y = .2 * S, R_BOT = .09 * S;       // lidar height and collision radius (units)

  // sector fan + threshold arc (children of the robot so they turn with it)
  const fanGeo = (r, from, to) => {const p = [0, 0, 0], n = 30; for (let i = 0; i <= n; i++) {const a = (from + (to - from) * i / n) * Math.PI / 180; p.push(Math.sin(a) * r, 0, -Math.cos(a) * r);} const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); const idx = []; for (let i = 1; i <= n; i++) idx.push(0, i, i + 1); g.setIndex(idx); return g;};
  const sectorMat = new T.MeshBasicMaterial({color: 0x39ff88, transparent: true, opacity: .2, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending});
  const sector = new T.Mesh(fanGeo(1.0 * U, -15, 15), sectorMat); sector.position.y = .012; bot.add(sector);
  const arc = new T.Mesh(new T.RingGeometry(.5 * U - .02, .5 * U + .02, 32, 1, Math.PI / 2 - 15 * Math.PI / 180, 30 * Math.PI / 180), new T.MeshBasicMaterial({color: 0xffb547, side: T.DoubleSide}));
  arc.rotation.x = -Math.PI / 2; arc.position.y = .014; bot.add(arc);

  // obstacles
  const obstacles = []; const card = cardboard();
  const obsGroup = new T.Group(); scene.add(obsGroup);
  function addObstacle(x, z, kind = ['box', 'cone', 'barrel'][obstacles.length % 3]) {
    const g = new T.Group(); g.position.set(x, 0, z); obsGroup.add(g); let r;
    if (kind === 'box') {const w = .45 + Math.random() * .25; box(g, 0, .2, 0, w, .4, w * .8, new T.MeshStandardMaterial({map: card, roughness: .85})); g.rotation.y = Math.random() * Math.PI; r = w * .55;}
    else if (kind === 'cone') {cyl(g, 0, .015, 0, .2, .03, new T.MeshStandardMaterial({color: 0x1a1a1a, roughness: .8}), 4).rotation.y = Math.PI / 4; cyl(g, 0, .28, 0, .02, .52, new T.MeshPhysicalMaterial({color: 0xff5a1a, roughness: .45, clearcoat: .5}), 32, .17); cyl(g, 0, .3, 0, .115, .08, new T.MeshStandardMaterial({color: 0xf2f2f2, roughness: .4}), 32, .125); r = .19;}
    else {cyl(g, 0, .3, 0, .22, .6, new T.MeshPhysicalMaterial({color: 0x2b6fd8, roughness: .3, metalness: .4, clearcoat: .6})); cyl(g, 0, .61, 0, .23, .03, M.steel); r = .23;}
    obstacles.push({x, z, r, g});
  }
  const layout = [[1.2, -1.4, 'box'], [-1.4, -1.0, 'cone'], [.2, 1.5, 'barrel'], [-1.6, 1.6, 'box'], [2.1, 1.2, 'cone'], [-.3, -2.4, 'barrel']];
  layout.forEach(([x, z, k]) => addObstacle(x, z, k));

  // rays and scan points
  const rayN = 31, rayPos = new Float32Array(rayN * 6), rayGeo = new T.BufferGeometry(); rayGeo.setAttribute('position', new T.BufferAttribute(rayPos, 3));
  const rayMat = new T.LineBasicMaterial({color: 0x7dffb0, transparent: true, opacity: .8, blending: T.AdditiveBlending}); scene.add(new T.LineSegments(rayGeo, rayMat));
  const scanN = 180, scanPos = new Float32Array(scanN * 3), scanGeo = new T.BufferGeometry(); scanGeo.setAttribute('position', new T.BufferAttribute(scanPos, 3));
  scene.add(new T.Points(scanGeo, new T.PointsMaterial({color: 0xff6b4a, size: .05, transparent: true, opacity: .85, depthWrite: false, blending: T.AdditiveBlending})));
  // trail
  const trailN = 400, trailPos = new Float32Array(trailN * 3), trailGeo = new T.BufferGeometry(); trailGeo.setAttribute('position', new T.BufferAttribute(trailPos, 3)); trailGeo.setDrawRange(0, 0);
  scene.add(new T.Line(trailGeo, new T.LineBasicMaterial({color: 0x5fd4ff, transparent: true, opacity: .55})));
  let trailCount = 0, trailTimer = 0;
  // turn arrow
  const turnArrow = new T.Group(); turnArrow.position.y = .03; bot.add(turnArrow);
  const arrowMat = new T.MeshBasicMaterial({color: 0xffb547, transparent: true, opacity: .9});
  const tor = new T.Mesh(new T.TorusGeometry(.55, .025, 8, 40, Math.PI / 2), arrowMat); tor.rotation.x = -Math.PI / 2; turnArrow.add(tor);
  const head = new T.Mesh(new T.ConeGeometry(.07, .16, 16), arrowMat); head.position.set(.55, 0, 0); head.rotation.x = Math.PI / 2; turnArrow.add(head);
  turnArrow.rotation.y = Math.PI / 2; turnArrow.visible = false;
  const tag = labelSprite('FORWARD 0.15 m/s', {scale: .62, accent: '#39ff88'}); scene.add(tag);

  // ---- ray casting in the floor plane ----
  function cast(ox, oz, dx, dz, max = 3.5 * U) {
    let best = max;
    const tx = dx > 0 ? (HALF - ox) / dx : dx < 0 ? (-HALF - ox) / dx : Infinity; const tz = dz > 0 ? (HALF - oz) / dz : dz < 0 ? (-HALF - oz) / dz : Infinity;
    best = Math.min(best, tx, tz);
    for (const o of obstacles) {
      const fx = ox - o.x, fz = oz - o.z, b = fx * dx + fz * dz, c = fx * fx + fz * fz - o.r * o.r, disc = b * b - c;
      if (disc >= 0) {const t = -b - Math.sqrt(disc); if (t > 0 && t < best) best = t;}
    }
    return best;
  }

  // ---- controller: the report's state machine ----
  const V = .15 * U, W = 1.1;                      // 0.15 m/s forward, turn rate (rad/s)
  const THRESH = .5 * U;
  let state, timer, x, z, heading, turnLeft, frontMin, simSpeed = 1.5, wheelSpin = 0, last = '';
  function resetRun() {state = 'FORWARD'; timer = 0; x = -2.2; z = 2.2; heading = 0.4; turnLeft = 0; trailCount = 0; trailGeo.setDrawRange(0, 0);}
  resetRun();
  const fwd = h => [-Math.sin(h), -Math.cos(h)];
  function frontDistance() {
    let m = Infinity; const lx = x, lz = z;
    for (let i = 0; i < rayN; i++) {
      const a = heading + (15 - i) * Math.PI / 180, [dx, dz] = fwd(a), r = cast(lx, lz, dx, dz);
      m = Math.min(m, r);
      rayPos.set([lx, LIDAR_Y, lz, lx + dx * r, r < 3.4 * U ? .25 : .02, lz + dz * r], i * 6);
    }
    rayGeo.attributes.position.needsUpdate = true; return m;
  }
  function step(dt) {
    frontMin = frontDistance();
    if (state === 'FORWARD') {
      if (frontMin < THRESH) {state = 'STOP'; timer = 3;}
      else {const [dx, dz] = fwd(heading); x += dx * V * dt; z += dz * V * dt; wheelSpin -= V / (.033 * S) * dt;}
    } else if (state === 'STOP') {
      timer -= dt; if (timer <= 0) state = frontMin < THRESH ? 'TURN' : 'FORWARD', turnLeft = Math.PI / 2;
    } else if (state === 'TURN') {
      const d = Math.min(turnLeft, W * dt); heading -= d; turnLeft -= d; wheels[0].rotation.x += d * 3; wheels[1].rotation.x -= d * 3;
      if (turnLeft <= 1e-4) state = 'CHECK', timer = .4;
    } else if (state === 'CHECK') {timer -= dt; if (timer <= 0) state = frontMin < THRESH ? 'STOP' : 'FORWARD', timer = 3;}
  }
  function update(dt, t) {
    const n = Math.max(1, Math.round(simSpeed * 2)); const h = dt * simSpeed / n;
    for (let i = 0; i < n; i++) step(h);
    bot.position.set(x, 0, z); bot.rotation.y = heading;
    if (state === 'FORWARD') wheels.forEach(w => (w.rotation.x = wheelSpin));
    turret.rotation.y -= dt * 12;
    // spinning scan: points trail the turret heading
    const h0 = heading - turret.rotation.y;
    for (let i = 0; i < scanN; i++) {const a = h0 - i / scanN * 2.2, [dx, dz] = fwd(a), r = cast(x, z, dx, dz); scanPos.set([x + dx * r, .2, z + dz * r], i * 3);}
    scanGeo.attributes.position.needsUpdate = true;
    trailTimer += dt; if (trailTimer > .08 && state === 'FORWARD') {trailTimer = 0; if (trailCount < trailN) trailCount++; else trailPos.copyWithin(0, 3); trailPos.set([x, .02, z], (trailCount - 1) * 3); trailGeo.attributes.position.needsUpdate = true; trailGeo.setDrawRange(0, trailCount);}
    const blocked = state !== 'FORWARD';
    const col = state === 'FORWARD' ? 0x39ff88 : state === 'TURN' ? 0xffb547 : 0xff5a36;
    sectorMat.color.setHex(col); rayMat.color.setHex(state === 'FORWARD' ? 0x7dffb0 : 0xff9a7a); led.material.color.setHex(col); led.material.emissive.setHex(col);
    turnArrow.visible = state === 'TURN' || (state === 'STOP' && timer < 1.2); arrowMat.opacity = .5 + Math.sin(t * 6) * .4;
    const label = state === 'FORWARD' ? 'FORWARD 0.15 m/s' : state === 'STOP' ? `STOP · WAIT ${Math.max(0, timer).toFixed(1)} s` : state === 'TURN' ? 'TURN 90° CLOCKWISE' : 'CHECK FRONT SECTOR';
    if (label !== last) {last = label; const nt = labelSprite(label, {scale: .62, accent: blocked ? '#ff5a36' : '#39ff88'}); tag.material.map.dispose(); tag.material.map = nt.material.map; tag.material.needsUpdate = true;}
    tag.position.set(x, 1.35, z); sectorMat.opacity = .16 + Math.sin(t * 3) * .05;
    ctx.follow?.(bot.position, dt);
  }
  // click the floor to drop an obstacle
  const ray = new T.Raycaster(), plane = new T.Plane(new T.Vector3(0, 1, 0), 0), hit = new T.Vector3(); let down = null;
  ctx.dom.addEventListener('pointerdown', e => (down = [e.clientX, e.clientY]));
  ctx.dom.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return; const r = ctx.dom.getBoundingClientRect();
    ray.setFromCamera(new T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), ctx.camera);
    if (ray.ray.intersectPlane(plane, hit) && Math.abs(hit.x) < HALF - .3 && Math.abs(hit.z) < HALF - .3 && Math.hypot(hit.x - x, hit.z - z) > .8) addObstacle(hit.x, hit.z);
  });
  return {
    target: [-2.2, .2, 2.2], position: [.6, 3.4, 5.8], shadow: 5, update,
    format: v => `${Number(v).toFixed(1)}×`,
    change(v) {simSpeed = Number(v); return statusText();},
    action(name) {
      if (name === 'add') {for (let k = 0; k < 20; k++) {const ax = (Math.random() * 2 - 1) * (HALF - .6), az = (Math.random() * 2 - 1) * (HALF - .6); if (Math.hypot(ax - x, az - z) > 1.2 && obstacles.every(o => Math.hypot(o.x - ax, o.z - az) > o.r + .6)) {addObstacle(ax, az); break;}}}
      if (name === 'restart') {obstacles.splice(layout.length).forEach(o => obsGroup.remove(o.g)); resetRun();}
    },
    statusText
  };
  function statusText() {
    const d = isFinite(frontMin) ? (frontMin / U).toFixed(2) : '—';
    const s = state === 'FORWARD' ? 'Path clear: driving forward at 0.15 m/s.' : state === 'STOP' ? `Obstacle inside 0.5 m: stopped, waiting ${Math.max(0, timer).toFixed(1)} s before rechecking.` : state === 'TURN' ? 'Obstacle still there: turning 90° clockwise.' : 'Checking the front sector again before moving.';
    return `${s} Nearest front return: ${d} m. Click the floor to drop another obstacle.`;
  }
}

// =====================================================================
// User-driven floor scrubber: chain-drive ratio drives the wheels, brush and ground speed
// =====================================================================
export function scrubber(scene, ctx) {
  // ---- dynamic floor: dirty tiles get cleaned where the squeegee passes ----
  const FW = 8, FD = 5, PX = 128;               // floor metres and pixels per metre
  const floorCanvas = document.createElement('canvas'); floorCanvas.width = FW * PX; floorCanvas.height = FD * PX; const fg = floorCanvas.getContext('2d');
  const tile = (dirty) => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.fillStyle = dirty ? '#7b766c' : '#d7dde3'; g.fillRect(0, 0, 64, 64); g.strokeStyle = dirty ? '#5f5a51' : '#b4bcc6'; g.lineWidth = 2; g.strokeRect(1, 1, 62, 62);
    const img = g.getImageData(0, 0, 64, 64); for (let i = 0; i < img.data.length; i += 4) {const n = (Math.random() - .5) * (dirty ? 26 : 8); img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;} g.putImageData(img, 0, 0);
    return g.createPattern ? c : c;
  };
  const dirtyTile = tile(true), cleanTile = tile(false);
  const cleanPattern = fg.createPattern(cleanTile, 'repeat'), dirtyPattern = fg.createPattern(dirtyTile, 'repeat');
  function paintDirty() {
    fg.fillStyle = dirtyPattern; fg.fillRect(0, 0, floorCanvas.width, floorCanvas.height);
    for (let i = 0; i < 40; i++) {const x0 = Math.random() * floorCanvas.width, y0 = Math.random() * floorCanvas.height, r = 30 + Math.random() * 90; const gr = fg.createRadialGradient(x0, y0, 0, x0, y0, r); gr.addColorStop(0, `rgba(55,40,22,${.25 + Math.random() * .2})`); gr.addColorStop(1, 'rgba(55,40,22,0)'); fg.fillStyle = gr; fg.fillRect(x0 - r, y0 - r, r * 2, r * 2);}
    for (let i = 0; i < 18; i++) {const x0 = Math.random() * floorCanvas.width, y0 = Math.random() * floorCanvas.height; fg.fillStyle = 'rgba(40,30,20,.22)'; for (let k = 0; k < 6; k++) {fg.beginPath(); fg.ellipse(x0 + k * 40, y0 + (k % 2) * 22, 9, 16, 0, 0, 7); fg.fill();}}
  }
  paintDirty();
  const floorTex = new T.CanvasTexture(floorCanvas); floorTex.colorSpace = T.SRGBColorSpace; floorTex.anisotropy = 8;
  const floorMesh = new T.Mesh(new T.PlaneGeometry(FW, FD), new T.MeshStandardMaterial({map: floorTex, roughness: .62, metalness: 0}));
  floorMesh.rotation.x = -Math.PI / 2; floorMesh.receiveShadow = true; scene.add(floorMesh);
  const outer = studioFloor({size: 24, color: 0x3a4250, roughness: .8, fadeInner: .12, fadeOuter: .5}); outer.position.y = -.003; scene.add(outer);

  // ---- machine ----
  const mach = new T.Group(); scene.add(mach);
  const paint = new T.MeshPhysicalMaterial({color: 0x1f6fd1, roughness: .32, metalness: .15, clearcoat: .9, clearcoatRoughness: .15});
  const darkPaint = new T.MeshPhysicalMaterial({color: 0x252a31, roughness: .5, metalness: .3, clearcoat: .3});
  add(mach, roundedBox(1.0, .12, .56, .04), darkPaint, 0, .2, 0);
  add(mach, roundedBox(.82, .44, .54, .08), paint, -.05, .49, 0);
  add(mach, roundedBox(.8, .05, .52, .03), darkPaint, -.05, .73, 0);
  const tank = add(mach, roundedBox(.3, .2, .44, .04), new T.MeshPhysicalMaterial({color: 0x9fd8ff, roughness: .05, transparent: true, opacity: .35, clearcoat: 1}), .2, .86, 0);
  const water = add(mach, new T.BoxGeometry(.26, .12, .38), new T.MeshPhysicalMaterial({color: 0x2aa7ff, roughness: .1, transparent: true, opacity: .55, emissive: 0x0a3a66, emissiveIntensity: .4}), .2, .82, 0);
  void tank;
  const lbl = document.createElement('canvas'); lbl.width = 256; lbl.height = 64; const lg = lbl.getContext('2d'); lg.fillStyle = '#ffffff'; lg.font = '700 34px Manrope, Arial'; lg.fillText('SCRUB·VAC', 20, 44);
  const lblTex = new T.CanvasTexture(lbl); lblTex.colorSpace = T.SRGBColorSpace;
  const decal = new T.Mesh(new T.PlaneGeometry(.36, .09), new T.MeshBasicMaterial({map: lblTex, transparent: true})); decal.position.set(-.05, .52, .276); mach.add(decal);
  // handle
  const tube = (pts, r, m) => {const c = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))); return add(mach, new T.TubeGeometry(c, 40, r, 12), m);};
  for (const z of [-.22, .22]) tube([[-.42, .7, z], [-.6, .9, z], [-.72, 1.05, z]], .016, M.steel);
  tube([[-.72, 1.05, -.24], [-.74, 1.06, 0], [-.72, 1.05, .24]], .016, M.steel);
  for (const z of [-.2, .2]) {const gr = cyl(mach, -.73, 1.055, z, .022, .09, M.rubber); gr.rotation.x = Math.PI / 2;}
  add(mach, roundedBox(.12, .08, .22, .02), M.black, -.66, 1.0, 0);
  const screen = box(mach, -.61, 1.01, 0, .005, .045, .12, glow(0x5fd4ff, 1.2)); screen.rotation.z = -.5;
  cyl(mach, -.63, 1.05, .08, .014, .02, glow(0xff3b30, .8));
  // brush deck (front) with rotating disc brush
  cyl(mach, .38, .13, 0, .27, .1, darkPaint, 48);
  cyl(mach, .38, .07, 0, .28, .03, new T.MeshStandardMaterial({color: 0xffb547, roughness: .6}), 48);
  const brush = new T.Group(); brush.position.set(.38, .03, 0); mach.add(brush);
  cyl(brush, 0, .01, 0, .24, .02, new T.MeshStandardMaterial({color: 0x1d3f7a, roughness: .5}), 40);
  const bristle = new T.InstancedMesh(new T.CylinderGeometry(.004, .004, .04, 5), new T.MeshStandardMaterial({color: 0x2f2f33, roughness: .8}), 220);
  const m4 = new T.Matrix4(); for (let i = 0; i < 220; i++) {const a = i * 2.4, r = .04 + .19 * Math.sqrt((i + 1) / 220); m4.makeTranslation(Math.cos(a) * r, -.012, Math.sin(a) * r); bristle.setMatrixAt(i, m4);} brush.add(bristle);
  for (let i = 0; i < 3; i++) {const a = i / 3 * Math.PI * 2; const tuft = cyl(brush, Math.cos(a) * .17, -.01, Math.sin(a) * .17, .018, .04, new T.MeshStandardMaterial({color: 0xff5a36, roughness: .7}), 10); void tuft;}
  // squeegee (rear) + vacuum hose
  const sq = new T.Mesh(new T.TorusGeometry(.42, .02, 10, 40, Math.PI * .7), M.steel); sq.rotation.set(Math.PI / 2, 0, Math.PI * .65); sq.position.set(-.18, .05, 0); sq.castShadow = true; mach.add(sq);
  const blade = new T.Mesh(new T.TorusGeometry(.42, .012, 6, 40, Math.PI * .7), M.rubber); blade.rotation.copy(sq.rotation); blade.position.set(-.18, .02, 0); mach.add(blade);
  tube([[-.58, .06, 0], [-.66, .2, 0], [-.6, .45, .05], [-.46, .6, .05]], .03, new T.MeshStandardMaterial({color: 0x1b1c20, roughness: .7}));
  // front casters
  for (const z of [-.22, .22]) {cyl(mach, .56, .06, z, .012, .1, M.steel); const cw = cyl(mach, .56, .035, z, .035, .025, M.rubber); cw.rotation.x = Math.PI / 2;}

  // ---- drivetrain on the right side: motor sprocket -> chain -> wheel sprocket ----
  const SIDE = .345, PITCH = .014, N1 = 16;
  const motorPos = new T.Vector2(.14, .36), axlePos = new T.Vector2(-.15, .12);
  const motor = cyl(mach, motorPos.x, motorPos.y, SIDE - .07, .06, .1, new T.MeshStandardMaterial({color: 0x3b4450, roughness: .4, metalness: .6}), 32); motor.rotation.x = Math.PI / 2;
  const wheels = [];
  for (const z of [-.31, .31]) {const w = new T.Group(); w.position.set(axlePos.x, axlePos.y, z); mach.add(w); const tire = add(w, new T.TorusGeometry(.1, .028, 16, 48), M.rubber); void tire; const hub = cyl(w, 0, 0, 0, .09, .05, M.lightGrey, 40); hub.rotation.x = Math.PI / 2; for (let k = 0; k < 6; k++) {const b = cyl(w, Math.cos(k) * .05, Math.sin(k) * .05, z > 0 ? .026 : -.026, .007, .01, M.steel, 6); b.rotation.x = Math.PI / 2;} wheels.push(w);}
  const pitchR = n => PITCH / (2 * Math.sin(Math.PI / n));
  function sprocketGeo(n) {
    const r = pitchR(n), ro = r + PITCH * .32, ri = r - PITCH * .32, s = new T.Shape();
    for (let i = 0; i < n; i++) {const a = i / n * Math.PI * 2, da = Math.PI * 2 / n; const pts = [[ri, a], [ro, a + da * .3], [ro, a + da * .5], [ri, a + da * .8]]; pts.forEach(([rr, aa], k) => (i === 0 && k === 0 ? s.moveTo : s.lineTo).call(s, rr * Math.cos(aa), rr * Math.sin(aa)));}
    const hole = new T.Path(); hole.absarc(0, 0, Math.min(.012, ri * .35), 0, Math.PI * 2, true); s.holes.push(hole);
    const g = new T.ExtrudeGeometry(s, {depth: .008, bevelEnabled: false}); g.translate(0, 0, -.004); return g;
  }
  const sprMat = new T.MeshStandardMaterial({color: 0xc9ced6, roughness: .25, metalness: 1, roughnessMap: brushed});
  const s1 = add(mach, sprocketGeo(N1), sprMat, motorPos.x, motorPos.y, SIDE);
  const s2 = add(mach, sprocketGeo(32), sprMat, axlePos.x, axlePos.y, SIDE);
  // bevel pair on the drive axle (thesis drivetrain)
  const bevelMat = new T.MeshStandardMaterial({color: 0xd9a441, roughness: .3, metalness: 1});
  const bevelA = cyl(mach, axlePos.x, axlePos.y, .22, .045, .03, bevelMat, 18, .025); bevelA.rotation.x = Math.PI / 2;
  const bevelB = cyl(mach, axlePos.x + .045, axlePos.y + .035, .18, .03, .03, bevelMat, 14, .018); bevelB.rotation.z = Math.PI / 2;
  // chain: instanced links following the tangent path
  const linkGeo = new T.BoxGeometry(PITCH * .95, .006, .012), linkMat = new T.MeshStandardMaterial({color: 0x9aa3ad, roughness: .35, metalness: 1});
  const chain = new T.InstancedMesh(linkGeo, linkMat, 160); chain.castShadow = true; mach.add(chain);
  let path = null, chainLen = 0, nLinks = 0;
  function buildPath(n2) {
    const c1 = motorPos, c2 = axlePos, r1 = pitchR(N1), r2 = pitchR(n2);
    const d = c2.clone().sub(c1), L = d.length(), u = d.clone().divideScalar(L), nrm = new T.Vector2(-u.y, u.x);
    const s = (r1 - r2) / L, c = Math.sqrt(1 - s * s);
    const n = side => new T.Vector2(u.x * s + nrm.x * c * side, u.y * s + nrm.y * c * side); // outward normal at tangent points
    const nA = n(1), nB = n(-1);
    const a1A = Math.atan2(nA.y, nA.x), a1B = Math.atan2(nB.y, nB.x);
    const segs = [];
    // span A: from sprocket1 tangent A to sprocket2 tangent A
    segs.push({type: 'line', p: c1.clone().addScaledVector(nA, r1), q: c2.clone().addScaledVector(nA, r2)});
    let from = a1A, to = a1B; while (to > from) to -= Math.PI * 2; segs.push({type: 'arc', c: c2, r: r2, from, to});
    segs.push({type: 'line', p: c2.clone().addScaledVector(nB, r2), q: c1.clone().addScaledVector(nB, r1)});
    from = a1B; to = a1A; while (to > from) to -= Math.PI * 2; segs.push({type: 'arc', c: c1, r: r1, from, to});
    segs.forEach(sg => (sg.len = sg.type === 'line' ? sg.p.distanceTo(sg.q) : Math.abs(sg.to - sg.from) * sg.r));
    path = segs; chainLen = segs.reduce((a, b) => a + b.len, 0); nLinks = Math.min(160, Math.floor(chainLen / PITCH)); chain.count = nLinks;
  }
  function pointAt(s) {
    s = ((s % chainLen) + chainLen) % chainLen;
    for (const sg of path) {if (s <= sg.len) {if (sg.type === 'line') {const t = s / sg.len; return [sg.p.x + (sg.q.x - sg.p.x) * t, sg.p.y + (sg.q.y - sg.p.y) * t, Math.atan2(sg.q.y - sg.p.y, sg.q.x - sg.p.x)];} const a = sg.from + (sg.to - sg.from) * s / sg.len; return [sg.c.x + sg.r * Math.cos(a), sg.c.y + sg.r * Math.sin(a), a - Math.PI / 2];} s -= sg.len;}
    return [0, 0, 0];
  }
  const q = new T.Quaternion(), zAxis = new T.Vector3(0, 0, 1), pos = new T.Vector3(), one = new T.Vector3(1, 1, 1);
  function layoutChain(offset) {for (let i = 0; i < nLinks; i++) {const [px, py, ang] = pointAt(offset + i * chainLen / nLinks); pos.set(px, py, SIDE + (i % 2 ? .003 : -.003)); q.setFromAxisAngle(zAxis, ang); m4.compose(pos, q, one); chain.setMatrixAt(i, m4);} chain.instanceMatrix.needsUpdate = true;}
  const tag = labelSprite('CHAIN DRIVE 16T → 32T', {scale: .5}); tag.position.set(-.1, 1.22, 0); mach.add(tag);

  // ---- motion over the floor: lawn-mower lanes ----
  const lanes = [-1.75, -1.05, -.35, .35, 1.05, 1.75], XEND = 3.1;
  let lane = 0, dir = 1, mx = -XEND, turning = false, turnA = 0, heading = 0;
  let n2 = 32, ratio = 2, motorAngle = 0, chainOffset = 0, wheelAngle = 0;
  const MOTOR_RPM = 60, WHEEL_R = .128;
  const speed = () => (MOTOR_RPM / ratio) * 2 * Math.PI / 60 * WHEEL_R;   // m/s
  function setTeeth(n) {n2 = n; ratio = n2 / N1; s2.geometry.dispose(); s2.geometry = sprocketGeo(n2); buildPath(n2); layoutChain(chainOffset); const nt = labelSprite(`CHAIN DRIVE 16T → ${n2}T`, {scale: .5}); tag.material.map.dispose(); tag.material.map = nt.material.map; tag.material.needsUpdate = true;}
  const toPx = (x, z) => [(x + FW / 2) * PX, (z + FD / 2) * PX];
  function clean(x, z, h) {
    const [px, py] = toPx(x, z); fg.save(); fg.translate(px, py); fg.rotate(-h); fg.fillStyle = cleanPattern;
    fg.setTransform(1, 0, 0, 1, 0, 0); fg.save(); fg.translate(px, py); fg.rotate(h); fg.beginPath(); fg.rect(-.08 * PX, -.4 * PX, .16 * PX, .8 * PX); fg.restore(); fg.fill(); fg.restore();
    fg.fillStyle = 'rgba(120,190,255,.05)'; fg.beginPath(); fg.arc(px, py, .38 * PX, 0, 7); fg.fill();
    floorTex.needsUpdate = true;
  }
  function place() {
    const z = lanes[lane];
    if (!turning) {mach.position.set(mx, 0, z); heading = dir > 0 ? 0 : Math.PI;}
    mach.rotation.y = -heading;
  }
  setTeeth(32); place();
  function update(dt) {
    const v = speed(); const wM = MOTOR_RPM * 2 * Math.PI / 60, wW = wM / ratio;
    motorAngle -= wM * dt; wheelAngle -= wW * dt; chainOffset += wM * pitchR(N1) * dt;
    s1.rotation.z = motorAngle; s2.rotation.z = wheelAngle; wheels.forEach(w => (w.rotation.z = wheelAngle)); bevelA.rotation.y = wheelAngle; bevelB.rotation.x = -wheelAngle * 1.5;
    layoutChain(chainOffset); brush.rotation.y += dt * 9;
    if (!turning) {
      mx += dir * v * dt; if ((dir > 0 && mx >= XEND) || (dir < 0 && mx <= -XEND)) {if (lane === lanes.length - 1) {lane = 0; dir = 1; mx = -XEND; paintDirty();} else {turning = true; turnA = 0;}}
    } else {
      const R = (lanes[lane + 1] - lanes[lane]) / 2, w = v / R; turnA += w * dt;
      const cx = mx, cz = lanes[lane] + R; const a = Math.min(Math.PI, turnA);
      const x = cx + dir * R * Math.sin(a), z = cz - R * Math.cos(a); mach.position.set(x, 0, z); heading = (dir > 0 ? 0 : Math.PI) - a * dir * -1;
      heading = dir > 0 ? a : Math.PI - a;  // yaw: facing +x, sweeping through +z to -x (or back)
      mach.rotation.y = -heading;
      if (turnA >= Math.PI) {turning = false; lane++; dir = -dir; mx = cx;}
    }
    if (!turning) place();
    const fx = mach.position.x - Math.cos(heading) * .18, fz = mach.position.z - Math.sin(heading) * .18;
    clean(fx, fz, heading);
    water.scale.y = .7 + .3 * Math.abs(Math.sin(performance.now() / 4000));
    ctx.follow?.(mach.position, dt);
  }
  return {
    target: [-3.1, .4, -1.75], position: [-1.1, 1.75, .5], shadow: 5, update,
    format: v => `${v}T · ${(v / N1).toFixed(2)}:1`,
    change(v) {setTeeth(Number(v)); return statusText();},
    statusText
  };
  function statusText() {
    const wheelRpm = MOTOR_RPM / ratio;
    return `${n2} driven teeth / ${N1} motor teeth = ${ratio.toFixed(2)}:1. With a 60 rpm motor the wheels turn at ${wheelRpm.toFixed(1)} rpm with ${ratio.toFixed(2)}× the torque, so the machine scrubs at ${speed().toFixed(2)} m/s.`;
  }
}
