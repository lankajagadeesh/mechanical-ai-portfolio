// Project scenes: animated, physically lit 3D models.
import * as T from 'three';
import {OrbitControls} from './assets/OrbitControls.js';
import {turtlebot, scrubber} from './sim-builders.js';
import {makeRenderer, studioEnvironment, brushedTexture, speckleTexture, gridTexture, hazardTexture, fenceTexture, conveyorTexture, pcbTexture, studioFloor, labelSprite, visibleLoop, reducedMotion} from './scene-kit.js';

// ---------- shared materials ----------
const brushed = brushedTexture(150, 70); brushed.repeat.set(2, 2);
const speck = speckleTexture(128, 80); speck.repeat.set(4, 4);
const mat = {
  yellow: new T.MeshPhysicalMaterial({color: 0xf2b00c, roughness: .34, metalness: .15, clearcoat: .7, clearcoatRoughness: .2, bumpMap: speck, bumpScale: .02}),
  graphite: new T.MeshStandardMaterial({color: 0x2b3038, roughness: .5, metalness: .55}),
  black: new T.MeshStandardMaterial({color: 0x121418, roughness: .55, metalness: .3}),
  steel: new T.MeshStandardMaterial({color: 0xbac2cc, roughness: .24, metalness: 1, roughnessMap: brushed}),
  chrome: new T.MeshStandardMaterial({color: 0xeef1f5, roughness: .08, metalness: 1}),
  alu: new T.MeshStandardMaterial({color: 0xd3d8df, roughness: .3, metalness: 1, roughnessMap: brushed}),
  blue: new T.MeshPhysicalMaterial({color: 0x2b6fd8, roughness: .3, metalness: .6, clearcoat: .5}),
  orange: new T.MeshPhysicalMaterial({color: 0xe8612a, roughness: .32, metalness: .55, clearcoat: .5}),
  rubber: new T.MeshStandardMaterial({color: 0x17181b, roughness: .9, metalness: 0}),
  plastic: new T.MeshStandardMaterial({color: 0x34383f, roughness: .6, metalness: 0, bumpMap: speck, bumpScale: .01}),
  paintGrey: new T.MeshPhysicalMaterial({color: 0x5b6470, roughness: .45, metalness: .3, clearcoat: .4}),
  ghost: new T.MeshStandardMaterial({color: 0x3a4250, roughness: .8, transparent: true, opacity: .14, depthWrite: false})
};
const glow = (c, i = 2) => new T.MeshStandardMaterial({color: c, emissive: c, emissiveIntensity: i, roughness: .4});
function add(g, geo, m, x = 0, y = 0, z = 0) {const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o;}
const box = (g, x, y, z, w, h, d, m = mat.graphite) => add(g, new T.BoxGeometry(w, h, d), m, x, y, z);
const cyl = (g, x, y, z, r, h, m = mat.steel, seg = 40, r2 = r) => add(g, new T.CylinderGeometry(r, r2, h, seg), m, x, y, z);
function ringGeo(r, inner, h, seg = 48) {
  const s = new T.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2, false); const hole = new T.Path(); hole.absarc(0, 0, inner, 0, Math.PI * 2, true); s.holes.push(hole);
  const g = new T.ExtrudeGeometry(s, {depth: h, bevelEnabled: true, bevelSize: h * .15, bevelThickness: h * .15, bevelSegments: 2, curveSegments: seg}); g.rotateX(-Math.PI / 2); g.translate(0, -h / 2, 0); return g;
}
function rounded(w, h, d, r = .06) {
  const s = new T.Shape(); const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new T.ExtrudeGeometry(s, {depth: d, bevelEnabled: true, bevelSize: r * .5, bevelThickness: r * .5, bevelSegments: 3}); g.translate(0, 0, -d / 2); return g;
}
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// =====================================================================
// 03 — Robotic work cell: six-axis-style arm running an animated pick-and-place sequence
// =====================================================================
function workcell(scene) {
  const root = new T.Group(); scene.add(root);
  const groups = {}; for (const k of ['bearings', 'shafts', 'lids', 'assembly', 'exit']) {groups[k] = new T.Group(); root.add(groups[k]);}
  // floor, hazard tape and guarding
  const floor = studioFloor({size: 34, color: 0xa5adb8, map: gridTexture({bg: '#262b33', line: '#3a424e', minor: '#2b3139'}), repeat: 8, roughness: .72, fadeInner: .1, fadeOuter: .48});
  root.add(floor);
  const tape = hazardTexture(); const tapeMat = new T.MeshStandardMaterial({map: tape, roughness: .6});
  for (const [x, z, w, d, rot] of [[0, -3.9, 11, .18, 0], [0, 4.1, 11, .18, 0], [-5.5, .1, 8, .18, Math.PI / 2], [5.5, .1, 8, .18, Math.PI / 2]]) {
    const m = new T.Mesh(new T.PlaneGeometry(w, d), tapeMat.clone()); m.material.map = tape.clone(); m.material.map.repeat.set(w / .7, 1); m.material.map.needsUpdate = true;
    m.rotation.set(-Math.PI / 2, 0, rot); m.position.set(x, .004, z); m.receiveShadow = true; root.add(m);
  }
  const fence = fenceTexture(); fence.repeat.set(6, 3);
  const fenceMat = new T.MeshStandardMaterial({color: 0x1d2127, metalness: .6, roughness: .4, alphaMap: fence, transparent: true, side: T.DoubleSide, depthWrite: false});
  const post = new T.MeshPhysicalMaterial({color: 0xf2b00c, roughness: .4, clearcoat: .5});
  for (let i = 0; i < 4; i++) {const p = new T.Mesh(new T.PlaneGeometry(2.7, 2.1), fenceMat); p.position.set(-4.05 + i * 2.7, 1.15, -4.3); root.add(p); box(root, -5.4 + i * 2.7, 1.1, -4.3, .08, 2.2, .08, post);}
  box(root, 5.4, 1.1, -4.3, .08, 2.2, .08, post);
  for (let i = 0; i < 3; i++) {const p = new T.Mesh(new T.PlaneGeometry(2.7, 2.1), fenceMat); p.rotation.y = Math.PI / 2; p.position.set(-5.9, 1.15, -2.95 + i * 2.7); root.add(p); box(root, -5.9, 1.1, -1.6 + i * 2.7, .08, 2.2, .08, post);}
  // stack light
  const tower = new T.Group(); tower.position.set(5, 0, -3.6); root.add(tower); cyl(tower, 0, .9, 0, .03, 1.8, mat.graphite);
  const lamps = [[0x2bd46a, 2], [0xffb020, .15], [0xff3b30, .1]].map(([c, i], k) => cyl(tower, 0, 1.9 + k * .16, 0, .07, .15, glow(c, i)));
  const stackGreen = lamps[0];

  // ---- robot (FANUC-class 6-axis form, approximate) ----
  const L1 = 1.9, L2 = 1.8, SH = 1.0, TOOL = .55;
  const robot = new T.Group(); root.add(robot);
  cyl(robot, 0, .06, 0, .78, .12, mat.graphite); cyl(robot, 0, .3, 0, .58, .4, mat.yellow, 48);
  const j1 = new T.Group(); j1.position.y = .5; robot.add(j1);
  cyl(j1, 0, .18, 0, .52, .36, mat.yellow, 48); box(j1, 0, .45, 0, .6, .5, .75, mat.yellow).geometry = rounded(.62, .55, .72, .12);
  const motor1 = cyl(j1, -.45, .35, .2, .14, .32, mat.graphite); motor1.rotation.z = Math.PI / 2;
  const j2 = new T.Group(); j2.position.set(0, SH - .5, 0); j1.add(j2);
  const hub2 = cyl(j2, 0, 0, .42, .3, .18, mat.graphite); hub2.rotation.x = Math.PI / 2; const cap2 = cyl(j2, 0, 0, .52, .18, .04, mat.steel); cap2.rotation.x = Math.PI / 2;
  const upper = add(j2, rounded(L1 + .3, .34, .34, .12), mat.yellow, L1 / 2, 0, .2);
  const j3 = new T.Group(); j3.position.set(L1, 0, 0); j2.add(j3);
  const hub3 = cyl(j3, 0, 0, .2, .24, .5, mat.graphite); hub3.rotation.x = Math.PI / 2;
  const fore = add(j3, rounded(L2 + .1, .26, .26, .1), mat.yellow, L2 / 2 - .05, 0, 0);
  const motor3 = cyl(j3, -.35, 0, 0, .13, .35, mat.graphite); motor3.rotation.z = Math.PI / 2;
  const wrist = new T.Group(); wrist.position.set(L2, 0, 0); j3.add(wrist);
  const w1 = cyl(wrist, 0, 0, 0, .14, .28, mat.graphite); w1.rotation.x = Math.PI / 2;
  const flange = cyl(wrist, .18, 0, 0, .1, .1, mat.steel); flange.rotation.z = Math.PI / 2;
  const gripper = new T.Group(); gripper.position.set(.26, 0, 0); wrist.add(gripper);
  box(gripper, .08, 0, 0, .14, .22, .3, mat.black);
  const fingers = [-1, 1].map(s => box(gripper, .26, 0, s * .08, .22, .06, .04, mat.alu));
  const tip = new T.Object3D(); tip.position.set(TOOL - .26, 0, 0); gripper.add(tip);
  void upper; void fore;

  // ---- stations ----
  const b = groups.bearings; // vibratory bowl feeder
  cyl(b, -3.2, .35, -.5, .75, .7, mat.paintGrey, 48); cyl(b, -3.2, .74, -.5, .55, .08, mat.graphite);
  const bowl = add(b, new T.LatheGeometry([[.2, 0], [.85, .02], [1.0, .12], [1.02, .5], [1.08, .52], [1.08, .56], [.98, .56], [.96, .14], [.2, .06]].map(([x, y]) => new T.Vector2(x, y)), 64), new T.MeshStandardMaterial({color: 0xc9d0d8, metalness: 1, roughness: .18, roughnessMap: brushed, side: T.DoubleSide}), -3.2, .8, -.5);
  const ringsGroup = new T.Group(); ringsGroup.position.set(-3.2, 1.33, -.5); b.add(ringsGroup);
  const bearingGeo = ringGeo(.1, .05, .06, 32);
  for (let i = 0; i < 11; i++) {const a = i / 11 * Math.PI * 2; add(ringsGroup, bearingGeo, mat.chrome, .9 * Math.cos(a), 0, .9 * Math.sin(a));}
  const track = box(b, -2.45, 1.26, -.3, 1.2, .05, .22, mat.steel); track.rotation.y = -.25; track.rotation.z = -.05;
  const bearingReady = add(b, bearingGeo, mat.chrome, -1.9, 1.33, -.16);
  const sensorB = box(b, -1.9, 1.5, -.42, .08, .08, .08, glow(0x39ff88, 1.5));
  const s = groups.shafts; // shaft tray on a table
  for (const [x, z] of [[1.9, -.9], [3.3, -.9], [1.9, .7], [3.3, .7]]) box(s, x, .4, z, .08, .8, .08, mat.graphite);
  box(s, 2.6, .83, -.1, 1.7, .06, 1.9, mat.paintGrey); box(s, 2.6, .9, -.1, 1.3, .08, 1.3, mat.alu);
  const shaftGeo = new T.CylinderGeometry(.055, .055, .5, 24), collarGeo = new T.CylinderGeometry(.09, .09, .1, 24);
  const shafts = [];
  for (const x of [2.2, 2.6, 3.0]) for (const z of [-.5, -.1, .3]) {const g = new T.Group(); g.position.set(x, 1.19, z); s.add(g); add(g, shaftGeo, mat.chrome); add(g, collarGeo, mat.chrome, 0, -.17, 0); shafts.push(g);}
  const l = groups.lids; // gravity lid chute
  box(l, 0, .8, -3.3, .9, 1.6, .5, mat.paintGrey);
  const chute = new T.Group(); chute.position.set(0, 1.45, -2.6); chute.rotation.x = .42; l.add(chute);
  box(chute, 0, 0, 0, .7, .05, 1.6, mat.steel); box(chute, -.37, .08, 0, .04, .16, 1.6, mat.steel); box(chute, .37, .08, 0, .04, .16, 1.6, mat.steel);
  const lidGeo = ringGeo(.24, .07, .06, 40); const lids = [];
  for (let i = 0; i < 4; i++) lids.push(add(chute, lidGeo, mat.blue, 0, .06, .55 - i * .4));
  box(l, 0, .55, -1.95, .8, 1.1, .45, mat.graphite); const lidReady = add(l, lidGeo, mat.blue, 0, 1.14, -1.95);
  const a = groups.assembly; // fixture
  box(a, 0, .4, 2.0, 1.1, .8, .9, mat.paintGrey); box(a, 0, .83, 2.0, .8, .06, .7, mat.alu);
  const baseGeo = rounded(.46, .16, .46, .05); baseGeo.rotateX(Math.PI / 2);
  const e = groups.exit; // conveyor
  for (const x of [1.2, 3.0, 4.8]) for (const z of [2.6, 3.2]) box(e, x, .38, z, .07, .76, .07, mat.graphite);
  box(e, 3, .79, 2.9, 4.0, .1, .75, mat.graphite);
  const convTex = conveyorTexture(); convTex.repeat.set(10, 1.5);
  const convBelt = box(e, 3, .86, 2.9, 3.9, .03, .62, new T.MeshStandardMaterial({map: convTex, roughness: .85}));
  for (const x of [1.02, 4.98]) {const r = cyl(e, x, .81, 2.9, .07, .66, mat.steel); r.rotation.x = Math.PI / 2;}
  const sensorE = box(e, 4.6, 1.05, 2.5, .08, .12, .08, glow(0x39ff88, 1.5));

  // labels
  const lab = (g, text, x, y, z) => {const sp = labelSprite(text, {scale: 1.35}); sp.position.set(x, y, z); g.add(sp); return sp;};
  lab(b, 'BEARING FEEDER', -3.2, 2.2, -.5); lab(s, 'SHAFT TRAY', 2.6, 1.9, -.1); lab(l, 'LID CHUTE', 0, 2.75, -3.2); lab(a, 'ASSEMBLY', -.9, 1.7, 2.3); lab(e, 'EXIT CONVEYOR', 3.6, 1.6, 3.4);

  // ---- sequence ----
  const FIX = new T.Vector3(0, .86, 2.0);
  const work = new T.Group(); root.add(work); // parts on the fixture
  let basePart, carried = null, shaftIdx = 0, outgoing = [];
  const newBase = () => {basePart = add(work, baseGeo, mat.orange, FIX.x, FIX.y + .08, FIX.z); basePart.userData.stack = [];};
  newBase();
  const P = (x, y, z) => new T.Vector3(x, y, z); const up = (v, h = .55) => v.clone().setY(v.y + h);
  const pBear = P(-1.9, 1.38, -.16), pLid = P(0, 1.19, -1.95), pConv = P(1.5, 1.315, 2.9), pFix = P(0, 1.3, 2.0);
  const H = [1.06, 1.31, 1.23];              // resting heights: bearing, shaft, lid
  const place = [P(0, 1.11, 2.0), P(0, 1.51, 2.0), P(0, 1.28, 2.0)];
  const steps = [];
  const go = (pos, dur = .8, act) => steps.push({pos, dur, act});
  const home = P(1.6, 2.1, .6);
  function plan() {
    steps.length = 0; const sh = shafts[shaftIdx % shafts.length].position.clone().add(s.position); sh.y += .2;
    go(home, .6);
    go(up(pBear), .9); go(pBear, .45, () => grab(bearingReady, bearingGeo, mat.chrome)); go(up(pBear), .45);
    go(up(place[0]), 1.0); go(place[0], .45, () => drop(0)); go(up(place[0]), .4);
    go(up(sh), 1.0); go(sh, .45, () => grab(shafts[shaftIdx++ % shafts.length], null, null)); go(up(sh), .45);
    go(up(place[1]), 1.0); go(place[1], .45, () => drop(1)); go(up(place[1]), .4);
    go(up(pLid), .9); go(pLid, .45, () => grab(lidReady, lidGeo, mat.blue)); go(up(pLid), .45);
    go(up(place[2], .7), 1.0); go(place[2], .45, () => drop(2)); go(up(place[2], .7), .45);
    go(up(pFix, .4), .5); go(pFix, .4, grabAssembly); go(up(pFix, .6), .5);
    go(up(pConv, .5), 1.0); go(pConv, .45, dropAssembly); go(up(pConv, .6), .4); go(home, .8, plan);
  }
  const dummy = new T.Vector3();
  function grab(src, geo, m) {
    if (geo) {carried = add(scene, geo, m); src.visible = false; setTimeout(() => (src.visible = true), 2600);}
    else {carried = src.clone(); scene.add(carried); src.visible = false; setTimeout(() => (src.visible = true), 9000);}
    carried.userData.kind = geo ? 'part' : 'shaft'; closeGrip = 1;
  }
  function drop(n) {
    if (!carried) return; scene.remove(carried); work.add(carried); carried.position.set(FIX.x, H[n], FIX.z);
    carried.rotation.set(0, 0, 0); basePart.userData.stack.push(carried); carried = null; closeGrip = 0;
  }
  function grabAssembly() {
    const g = new T.Group(); scene.add(g); for (const o of [basePart, ...basePart.userData.stack]) {const w = o.getWorldPosition(dummy).clone(); g.attach(o); o.position.copy(w);}
    carried = g; carried.userData.kind = 'assembly'; closeGrip = 1; carried.userData.anchor = pFix.clone();
  }
  function dropAssembly() {
    if (!carried) return; const g = carried; carried = null; closeGrip = 0; g.position.copy(pConv).sub(pFix); outgoing.push(g); newBase();
  }
  let step = 0, stepT = 0, from = home.clone(), closeGrip = 0, grip = 0;
  plan();
  const cyl2 = v => ({a: Math.atan2(-v.z, v.x), r: Math.hypot(v.x, v.z), h: v.y});
  const tipNow = home.clone();
  function solve(p) {
    const c = cyl2(p); j1.rotation.y = c.a;
    const wx = c.r, wy = c.h + TOOL - SH; const D = Math.min(L1 + L2 - .02, Math.hypot(wx, wy));
    const c2 = (D * D - L1 * L1 - L2 * L2) / (2 * L1 * L2); const a2 = -Math.acos(Math.max(-1, Math.min(1, c2)));
    const a1 = Math.atan2(wy, wx) - Math.atan2(L2 * Math.sin(a2), L1 + L2 * Math.cos(a2));
    j2.rotation.z = a1; j3.rotation.z = a2; wrist.rotation.z = -Math.PI / 2 - a1 - a2;
  }
  solve(home);
  const lerpCyl = (p, q, t) => {const A = cyl2(p), B = cyl2(q); let da = B.a - A.a; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; const ang = A.a + da * t, r = A.r + (B.r - A.r) * t; return new T.Vector3(r * Math.cos(ang), A.h + (B.h - A.h) * t, -r * Math.sin(ang));};
  const tipWorld = new T.Vector3();
  function update(dt, t) {
    const st = steps[step]; stepT += dt / st.dur; const k = ease(Math.min(1, stepT));
    tipNow.copy(lerpCyl(from, st.pos, k)); solve(tipNow);
    if (stepT >= 1) {from = st.pos.clone(); stepT = 0; step++; const act = st.act; if (step >= steps.length) step = 0; act?.(); if (act === plan) step = 0;}
    grip += (closeGrip - grip) * Math.min(1, dt * 10); fingers.forEach((f, i) => (f.position.z = (i ? 1 : -1) * (.1 - grip * .045)));
    root.updateMatrixWorld(); tip.getWorldPosition(tipWorld);
    if (carried) {if (carried.userData.kind === 'assembly') carried.position.copy(tipWorld).sub(carried.userData.anchor); else {carried.position.copy(tipWorld); carried.position.y -= carried.userData.kind === 'shaft' ? .2 : .05;}}
    for (const g of outgoing) {
      g.position.x += dt * .55;
      if (g.position.x > 4.2) g.traverse(o => {if (o.material) {if (!o.userData.fade) {o.material = o.material.clone(); o.material.transparent = true; o.userData.fade = 1;} o.material.opacity = Math.max(0, 1 - (g.position.x - 4.2) / .6);}});
    }
    outgoing = outgoing.filter(g => {if (g.position.x > 4.8) {scene.remove(g); return false;} return true;});
    convTex.offset.x -= dt * .55 / (3.9 / 10);
    ringsGroup.rotation.y = t * .6; ringsGroup.position.y = 1.33 + Math.sin(t * 60) * .003;
    lids.forEach((lid, i) => (lid.position.z = .55 - i * .4 + Math.sin(t * 2 + i) * .01));
    const pulse = 1.2 + Math.sin(t * 5) * .8; sensorB.material.emissiveIntensity = pulse; sensorE.material.emissiveIntensity = 2.2 - pulse * .5; stackGreen.material.emissiveIntensity = 1.6 + Math.sin(t * 2) * .4;
  }
  const notes = {all: 'The full part flow through the cell. Select a station to explore.', bearings: 'Bearing feeder: a vibratory bowl aligns bearings. A proximity sensor checks pickup readiness.', shafts: 'Shaft tray: pre-aligned slots hold shafts for pickup. The report proposes fill-level monitoring.', lids: 'Lid chute: gravity brings oriented lids to the pickup point; a photoelectric sensor checks arrival.', assembly: 'Assembly: insert bearing, then shaft, then lid. Proposed vision and force checks support alignment.', exit: 'Exit conveyor: transfer the completed assembly and check part presence at the outgoing station.'};
  return {
    target: [0, .9, 0], position: [9.5, 7.5, 10.5], shadow: 7.5, update,
    change(value) {
      for (const [k, g] of Object.entries(groups)) g.traverse(o => {if (o.isMesh) {o.userData.m ??= o.material; o.material = value === 'all' || k === value ? o.userData.m : mat.ghost;} if (o.isSprite) o.visible = value === 'all' || k === value;});
      return notes[value];
    }
  };
}

// =====================================================================
// 05 — Carbon nanotube: instanced atoms and bonds with iridescent shading
// =====================================================================
function nanotube(scene) {
  const holder = new T.Group(); scene.add(holder); holder.rotation.z = Math.PI / 2;
  const walls = []; const R0 = 1.0, C0 = 14, rows = 13;
  const palette = [
    {atom: new T.MeshPhysicalMaterial({color: 0x3b414b, metalness: .3, roughness: .22, clearcoat: 1, clearcoatRoughness: .1, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 600]}), bond: 0x9fb4cc},
    {atom: new T.MeshPhysicalMaterial({color: 0xff9a3c, metalness: .2, roughness: .25, clearcoat: 1, clearcoatRoughness: .15}), bond: 0xffc890},
    {atom: new T.MeshPhysicalMaterial({color: 0x9b6bff, metalness: .2, roughness: .25, clearcoat: 1, clearcoatRoughness: .15}), bond: 0xc9b2ff}
  ];
  const a = 2 * Math.PI * R0 / (C0 * Math.sqrt(3));
  for (let w = 0; w < 3; w++) {
    const radius = R0 + w * .34, cols = Math.round(C0 * radius / R0), circ = 2 * Math.PI * radius, aw = circ / (cols * Math.sqrt(3));
    const pts = new Map(), edges = new Set(), bonds = [];
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const cx = Math.sqrt(3) * aw * (col + (row % 2) * .5), cy = 1.5 * a * row; const keys = [];
      for (let j = 0; j < 6; j++) {
        const ang = (60 * j + 30) * Math.PI / 180, u = cx + aw * Math.cos(ang), v = cy + a * Math.sin(ang), th = u / circ * Math.PI * 2;
        const p = new T.Vector3(radius * Math.cos(th), v - 1.5 * a * (rows - 1) / 2, radius * Math.sin(th)); const k = p.toArray().map(n => n.toFixed(3)).join(','); if (!pts.has(k)) pts.set(k, p); keys.push(k);
      }
      for (let j = 0; j < 6; j++) {const pair = [keys[j], keys[(j + 1) % 6]].sort(), k = pair.join('|'); if (!edges.has(k)) {edges.add(k); bonds.push([pts.get(pair[0]), pts.get(pair[1])]);}}
    }
    const g = new T.Group(); holder.add(g); walls.push(g);
    const atoms = new T.InstancedMesh(new T.SphereGeometry(.06, 20, 14), palette[w].atom, pts.size); const m4 = new T.Matrix4(); let i = 0;
    for (const p of pts.values()) {m4.makeTranslation(p.x, p.y, p.z); atoms.setMatrixAt(i++, m4);} g.add(atoms);
    const bondMesh = new T.InstancedMesh(new T.CylinderGeometry(.018, .018, 1, 8), new T.MeshStandardMaterial({color: palette[w].bond, metalness: .6, roughness: .3}), bonds.length);
    const q = new T.Quaternion(), yAxis = new T.Vector3(0, 1, 0), d = new T.Vector3(), mid = new T.Vector3(), sc = new T.Vector3();
    bonds.forEach(([p1, p2], k) => {d.subVectors(p2, p1); const len = d.length(); q.setFromUnitVectors(yAxis, d.normalize()); mid.addVectors(p1, p2).multiplyScalar(.5); sc.set(1, len, 1); m4.compose(mid, q, sc); bondMesh.setMatrixAt(k, m4);});
    g.add(bondMesh); g.visible = w === 0;
  }
  // soft backlight halo
  const [hc] = [document.createElement('canvas')]; hc.width = hc.height = 256; const hg = hc.getContext('2d'); const gr = hg.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(90,170,255,.55)'); gr.addColorStop(.5, 'rgba(120,80,255,.15)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); hg.fillStyle = gr; hg.fillRect(0, 0, 256, 256);
  const halo = new T.Sprite(new T.SpriteMaterial({map: new T.CanvasTexture(hc), transparent: true, depthWrite: false, blending: T.AdditiveBlending})); halo.scale.set(9, 9, 1); halo.renderOrder = -2; scene.add(halo);
  return {
    target: [0, 0, 0], position: [4.2, 2.6, 5.4], shadow: 0,
    update(dt, t) {walls.forEach((g, i) => {g.rotation.y += dt * (.25 + i * .08) * (i % 2 ? -1 : 1); const s = 1 + .035 * Math.sin(t * (4.2 - i * .9) + i); g.scale.set(s, 1, s);}); holder.position.y = Math.sin(t * .8) * .06;},
    change(value) {walls.forEach((g, i) => (g.visible = i === 0 || value === 'multi')); return value === 'multi' ? 'Multi-wall nanotube: three concentric carbon lattices, each shown in its radial breathing mode. Thinner walls vibrate faster.' : 'Single-wall nanotube: one carbon lattice wrapped into a seamless tube, shown in its radial breathing mode.';}
  };
}

const builders = {workcell, turtlebot, nanotube, scrubber};
function init(panel) {
  const stage = panel.querySelector('.mini-stage'), desc = panel.querySelector('.mini-description');
  try {
    const renderer = makeRenderer(1.75);
    const scene = new T.Scene(); scene.environment = studioEnvironment(renderer); scene.environmentIntensity = .85;
    const camera = new T.PerspectiveCamera(36, 1, .05, 200);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = .08;
    controls.minDistance = 2; controls.maxDistance = 35; controls.maxPolarAngle = Math.PI * .48;
    scene.add(new T.HemisphereLight(0xd6e6ff, 0x221a14, .6));
    const followOn = panel.dataset.follow === 'true'; const tgtNow = new T.Vector3(), delta = new T.Vector3();
    const ctx = {camera, dom: renderer.domElement, follow: followOn ? (p, dt) => {tgtNow.set(p.x, controls.target.y, p.z); delta.copy(tgtNow).sub(controls.target).multiplyScalar(Math.min(1, dt * 2)); controls.target.add(delta); camera.position.add(delta);} : null};
    const model = builders[panel.dataset.model](scene, ctx);
    const keyL = new T.DirectionalLight(0xfff1e0, 2.6); keyL.position.set(6, 10, 5);
    if (model.shadow) {keyL.castShadow = true; keyL.shadow.mapSize.set(2048, 2048); keyL.shadow.bias = -.0005; keyL.shadow.normalBias = .02; const s = model.shadow; Object.assign(keyL.shadow.camera, {left: -s, right: s, top: s, bottom: -s, near: .5, far: 40});}
    scene.add(keyL); const rimL = new T.DirectionalLight(0xff9b52, .9); rimL.position.set(-7, 4, -6); scene.add(rimL);
    const fillL = new T.DirectionalLight(0x6fb8ff, .9); fillL.position.set(8, 3, -2); scene.add(fillL);
    function draw() {renderer.render(scene, camera);}
    function reset() {camera.position.set(...model.position); controls.target.set(...model.target); controls.update(); draw();}
    function zoom(n) {const v = camera.position.clone().sub(controls.target).multiplyScalar(n).clampLength(2, 35); camera.position.copy(controls.target).add(v); controls.update(); draw();}
    stage.appendChild(renderer.domElement); renderer.domElement.setAttribute('aria-hidden', 'true'); stage.querySelector('img').hidden = true; stage.dataset.loaded = 'true';
    panel.querySelector('.mini-reset').addEventListener('click', reset);
    new ResizeObserver(() => {const {width, height} = stage.getBoundingClientRect(); if (!width) return; renderer.setSize(width, height); camera.aspect = width / height; camera.zoom = Math.min(1, Math.max(.45, camera.aspect / 1.5)); camera.updateProjectionMatrix(); draw();}).observe(stage);
    const option = panel.querySelector('.model-option'); if (option) {const apply = () => {desc.textContent = model.change(option.value); draw();}; option.addEventListener('change', apply); apply();}
    const range = panel.querySelector('input[type=range]'); if (range) {const apply = () => {panel.querySelector('output').textContent = model.format ? model.format(range.value) : range.value; desc.textContent = model.change(range.value); draw();}; range.addEventListener('input', apply); apply();}
    panel.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', () => {model.action?.(b.dataset.action); draw();}));
    let statusClock = 0;
    let playing = !reducedMotion.matches; const toggle = panel.querySelector('.mini-play');
    const sync = () => {if (toggle) {toggle.textContent = playing ? 'Pause' : 'Play'; toggle.setAttribute('aria-pressed', String(playing));}};
    toggle?.addEventListener('click', () => {playing = !playing; sync();}); sync(); reducedMotion.addEventListener('change', () => {playing = !reducedMotion.matches; sync();});
    stage.addEventListener('keydown', e => {
      if (e.key.toLowerCase() === 'r') reset(); else if (e.key === '+' || e.key === '=') zoom(.85); else if (e.key === '-') zoom(1.15);
      else if (e.key.startsWith('Arrow')) {const v = camera.position.clone().sub(controls.target); if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') v.applyAxisAngle(new T.Vector3(0, 1, 0), e.key === 'ArrowLeft' ? .12 : -.12); else v.y += e.key === 'ArrowUp' ? .3 : -.3; camera.position.copy(controls.target).add(v); controls.update(); draw();}
      else return; e.preventDefault();
    });
    renderer.domElement.addEventListener('webglcontextlost', e => {e.preventDefault(); stage.querySelector('img').hidden = false; renderer.domElement.hidden = true; desc.textContent = 'Still diagram shown. Reload to restore 3D.'; panel.querySelectorAll('button,input,select').forEach(c => c.disabled = true);});
    reset();
    visibleLoop(stage, (dt, t) => {const moved = controls.update(); if (playing) model.update?.(dt, t); if (playing || moved) draw(); statusClock += dt; if (model.statusText && statusClock > .3) {statusClock = 0; const txt = model.statusText(); if (desc.textContent !== txt) desc.textContent = txt;}});
    window.__projectViewers ??= {}; window.__projectViewers[panel.dataset.model] = {scene, camera, renderer, controls, draw};
  } catch (e) {
    stage.dataset.loaded = 'fallback'; desc.textContent = 'Still diagram shown. Interactive 3D is unavailable in this browser.';
    panel.querySelectorAll('button,input,select').forEach(c => c.disabled = true); console.warn('Project diagram fallback:', e);
  }
}
const observer = new IntersectionObserver(entries => {for (const entry of entries) if (entry.isIntersecting) {observer.unobserve(entry.target); init(entry.target);}}, {rootMargin: '300px'});
document.querySelectorAll('.mini-viewer').forEach(panel => observer.observe(panel));
