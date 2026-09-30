import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { Enigma, ROTORS, ALPHABET, toIndex, toLetter, parsePlugboard, plugboardPairs } from './enigma.js';
import { buildEnigma, contactPoint, KEY_ROWS } from './model.js';
import { createDiagram, describeTrace } from './diagram.js';
import { PART_INFO, LESSONS, PRESETS } from './learn.js';
import { glowTexture } from './textures.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ---------------------------------------------------------------------------
// Renderer / scene
// ---------------------------------------------------------------------------
const stage = $('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.prepend(renderer.domElement);
renderer.domElement.tabIndex = 0;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x15130f, 120, 260);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 14;
controls.maxDistance = 150;
controls.maxPolarAngle = Math.PI * 0.495;

const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
sun.position.set(22, 48, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -40; sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40;
sun.shadow.camera.near = 10; sun.shadow.camera.far = 120;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.03;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x9fc4ff, 0.6);
rim.position.set(-30, 25, -35);
scene.add(rim);
scene.add(new THREE.HemisphereLight(0xfff4e0, 0x1a140e, 0.35));

const lampLight = new THREE.PointLight(0xffa73a, 0, 14, 1.6);
scene.add(lampLight);

// Desk surface.
const desk = new THREE.Mesh(
  new THREE.CircleGeometry(160, 64),
  new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.92, metalness: 0 }),
);
desk.rotation.x = -Math.PI / 2;
desk.receiveShadow = true;
scene.add(desk);

const model = buildEnigma();
scene.add(model.root);

// ---------------------------------------------------------------------------
// Machine state
// ---------------------------------------------------------------------------
const settings = {
  rotors: ['I', 'II', 'III'],
  reflector: 'B',
  rings: [0, 0, 0],
  start: [0, 0, 0],
  plugboard: '',
};
const machine = new Enigma();
let lastTrace = null;
let tapeIn = '', tapeOut = '';

function applySettings({ keepPositions = false } = {}) {
  const positions = keepPositions ? machine.positions : settings.start.slice();
  machine.configure({ ...settings, positions });
  model.setRotorTypes(settings.rotors, settings.rotors.map((n) => toIndex(ROTORS[n].notch)), settings.reflector);
  model.setPlugboard(plugboardPairs(machine.plugboard));
  syncRotorVisuals(true);
  syncUI();
}

function syncRotorVisuals(instant = false) {
  machine.positions.forEach((p, i) => model.setRotorState(i, p, machine.rings[i], instant));
}

// ---------------------------------------------------------------------------
// Sound (tiny WebAudio synth: key clack + rotor tick)
// ---------------------------------------------------------------------------
let audio = null;
let soundOn = true;
function ac() {
  if (!audio) { try { audio = new AudioContext(); } catch { audio = null; } }
  return audio;
}
function noiseClick(dur = 0.05, freq = 1800, gain = 0.3, delay = 0) {
  const a = ac();
  if (!a || !soundOn) return;
  const t = a.currentTime + delay;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
  const src = a.createBufferSource(); src.buffer = buf;
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 1.2;
  const g = a.createGain(); g.gain.value = gain;
  src.connect(bp).connect(g).connect(a.destination);
  src.start(t);
}
const sfx = {
  keyDown: () => { noiseClick(0.06, 900, 0.5); noiseClick(0.03, 3200, 0.25, 0.012); },
  keyUp: () => noiseClick(0.04, 1400, 0.2),
  rotor: (n) => { for (let i = 0; i < n; i++) noiseClick(0.025, 4200, 0.25, 0.02 + i * 0.03); },
};

// ---------------------------------------------------------------------------
// Key presses
// ---------------------------------------------------------------------------
let heldKey = null;
const litLamp = { letter: null };

function pressKey(letter) {
  if (heldKey || !ALPHABET.includes(letter)) return;
  heldKey = letter;
  const k = model.keys.get(letter);
  k.target = 1;
  const res = machine.press(letter);
  lastTrace = res;
  syncRotorVisuals();
  sfx.keyDown();
  sfx.rotor(res.moved.filter(Boolean).length);
  litLamp.letter = res.output;
  tapeIn += letter;
  tapeOut += res.output;
  renderTape();
  syncWindows(res.moved);
  updateSignal(res);
  if (showPath) buildPath(res);
}

function releaseKey() {
  if (!heldKey) return;
  model.keys.get(heldKey).target = 0;
  heldKey = null;
  litLamp.letter = null;
  sfx.keyUp();
}

// ---------------------------------------------------------------------------
// 3D current path
// ---------------------------------------------------------------------------
let showPath = false;
const pathGroup = new THREE.Group();
pathGroup.renderOrder = 999;
scene.add(pathGroup);
const pathAnim = { t: 0, active: false, meshes: [] };
const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffffff, depthTest: false, transparent: true, blending: THREE.AdditiveBlending }));
spark.scale.set(2.2, 2.2, 1);
spark.renderOrder = 1000;
spark.visible = false;
scene.add(spark);

function partOffset(id) {
  const p = model.parts.find((x) => x.id === id);
  return p.group.position.clone().sub(p.group.userData.base);
}

function buildPath(trace) {
  clearPath();
  if (!trace) return;
  const P = Object.fromEntries(trace.path.map((s) => [s.stage, s.index]));
  const L = (i) => toLetter(i);
  const f = model.faces;
  const off = {
    keys: partOffset('keys'), plug: partOffset('plugboard'), etw: partOffset('etw'),
    r0: partOffset('rotor0'), r1: partOffset('rotor1'), r2: partOffset('rotor2'), ukw: partOffset('ukw'),
    bulbs: partOffset('bulbs'), harness: partOffset('harness'),
  };
  const cp = (x, k, o, r) => contactPoint(x, k, r).add(o);
  const socket = (l) => model.sockets.get(l).front.clone().add(off.plug);
  const viaCable = (from, to) => {
    if (from === to) return [socket(from)];
    const c = model.cableCurve(from, to);
    if (!c) return [socket(from), socket(to)];
    let pts = c.getPoints(24).map((p) => p.clone().add(off.plug));
    if (pts[0].distanceTo(socket(from)) > pts[pts.length - 1].distanceTo(socket(from))) pts = pts.reverse();
    return pts;
  };
  const etwFeed = new THREE.Vector3(f.etwOuter + 1.8, model.axis.y - 4.5, model.axis.z + 2).add(off.etw);
  const inside = (l) => {
    const s = socket(l);
    return [new THREE.Vector3(s.x, s.y, 12).add(off.harness), new THREE.Vector3(s.x * 0.5, 2.8, 3).add(off.harness), new THREE.Vector3(f.etwOuter + 1.8, 2.8, model.axis.z + 4).add(off.harness), etwFeed];
  };
  const kp = model.keyPos(trace.input);
  const keyTop = new THREE.Vector3(kp.x, model.deckY + 2.7, kp.z).add(off.keys);
  const lp = model.lampPos(trace.output);

  const fwd = [
    keyTop,
    new THREE.Vector3(kp.x, model.deckY - 1.5, kp.z).add(off.keys),
    new THREE.Vector3(socket(L(P.key)).x, model.deckY - 2, 12).add(off.harness),
    ...viaCable(L(P.key), L(P.plugIn)),
    ...inside(L(P.plugIn)),
    cp(f.etwOuter, P.etwIn, off.etw), cp(f.etwInner, P.etwIn, off.etw),
    cp(f.rightR, P.etwIn, off.r2), cp(f.rightL, P.rightFwd, off.r2),
    cp(f.middleR, P.rightFwd, off.r1), cp(f.middleL, P.middleFwd, off.r1),
    cp(f.leftR, P.middleFwd, off.r0), cp(f.leftL, P.leftFwd, off.r0),
    cp(f.ukwR, P.leftFwd, off.ukw), cp(f.ukwMid, P.leftFwd, off.ukw, 1.6),
  ];
  const back = [
    cp(f.ukwMid, P.reflector, off.ukw, 1.6), cp(f.ukwR, P.reflector, off.ukw),
    cp(f.leftL, P.reflector, off.r0), cp(f.leftR, P.leftBack, off.r0),
    cp(f.middleL, P.leftBack, off.r1), cp(f.middleR, P.middleBack, off.r1),
    cp(f.rightL, P.middleBack, off.r2), cp(f.rightR, P.rightBack, off.r2),
    cp(f.etwInner, P.rightBack, off.etw), cp(f.etwOuter, P.rightBack, off.etw),
    ...inside(L(P.etwOut)).reverse(),
    ...viaCable(L(P.etwOut), L(P.plugOut)),
    new THREE.Vector3(lp.x, 2.8, lp.z).add(off.harness),
    new THREE.Vector3(lp.x, model.topY - 0.9, lp.z).add(off.bulbs),
  ];
  // Bridge the reflector so both halves join.
  fwd.push(back[0].clone());
  pathAnim.meshes = [makeTube(fwd, 0xffb23a), makeTube(back, 0x52d3e6)];
  pathAnim.t = 0;
  pathAnim.active = true;
  pathAnim.trace = trace;
}

function makeTube(points, color) {
  const clean = points.filter((p, i) => i === 0 || p.distanceToSquared(points[i - 1]) > 1e-4);
  const path = new THREE.CurvePath();
  for (let i = 1; i < clean.length; i++) path.add(new THREE.LineCurve3(clean[i - 1], clean[i]));
  const segs = Math.max(60, clean.length * 14);
  const geo = new THREE.TubeGeometry(path, segs, 0.13, 6, false);
  const mat = new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.95, toneMapped: false });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 999;
  m.userData.total = geo.index.count;
  m.userData.curve = path;
  geo.setDrawRange(0, 0);
  pathGroup.add(m);
  return m;
}

function clearPath() {
  for (const m of pathGroup.children) { m.geometry.dispose(); m.material.dispose(); }
  pathGroup.clear();
  pathAnim.meshes = [];
  pathAnim.active = false;
  spark.visible = false;
}

function animatePath(dt) {
  if (!pathAnim.meshes.length) return;
  const DUR = 1.6;
  pathAnim.t = Math.min(pathAnim.t + dt / DUR, 1);
  const [a, b] = pathAnim.meshes;
  const t = pathAnim.t;
  const fa = clamp01(t / 0.5), fb = clamp01((t - 0.5) / 0.5);
  const step = 6 * 6;
  a.geometry.setDrawRange(0, Math.floor((a.userData.total / step) * fa) * step);
  b.geometry.setDrawRange(0, Math.floor((b.userData.total / step) * fb) * step);
  if (t < 1) {
    spark.visible = true;
    const cur = t < 0.5 ? a : b;
    spark.position.copy(cur.userData.curve.getPointAt(t < 0.5 ? fa : fb));
    spark.material.color.set(t < 0.5 ? 0xffd27a : 0x9ff0ff);
  } else {
    spark.visible = false;
  }
}

// ---------------------------------------------------------------------------
// Lid / cover / explode / x-ray
// ---------------------------------------------------------------------------
const view = {
  lidOpen: true, lidAngle: -1.75,
  coverOpen: false, coverAngle: 0,
  explode: 0, explodeTarget: 0,
  xray: false,
};
const LID_OPEN = -1.75, COVER_OPEN = -1.95;
const maxOrder = Math.max(...model.parts.filter((p) => p.order < 50).map((p) => p.order));

function applyExplode() {
  const S = 0.62; // stagger
  for (const p of model.parts) {
    const base = p.group.userData.base;
    const o = p.order >= 50 ? 1 : p.order / maxOrder;
    const lt = ease(clamp01((view.explode - o * S) / (1 - S)));
    p.group.position.copy(base).addScaledVector(p.explode, lt);
  }
  model.lidPivot.rotation.x = view.lidAngle;
  model.coverPivot.rotation.x = view.coverAngle;
}

const ghostMat = new THREE.MeshStandardMaterial({ color: 0xa9c4dd, transparent: true, opacity: 0.1, depthWrite: false, roughness: 0.2, metalness: 0 });
const GHOST_PARTS = ['case', 'lid', 'cover', 'lampPanel', 'deck'];
function setXray(on) {
  view.xray = on;
  for (const p of model.parts) {
    if (!GHOST_PARTS.includes(p.id)) continue;
    p.group.traverse((o) => {
      if (!o.isMesh || o.material.emissiveMap || o.userData.orig?.emissiveMap) return;
      if (on) { o.userData.orig = o.userData.orig || o.material; o.material = ghostMat; o.castShadow = false; }
      else if (o.userData.orig) { o.material = o.userData.orig; o.castShadow = true; }
    });
  }
  setPressed('#btnXray', on);
}

// ---------------------------------------------------------------------------
// Camera views
// ---------------------------------------------------------------------------
const VIEWS = {
  overview:  { pos: [0, 50, 68], tgt: [0, 8, -1] },
  keyboard:  { pos: [0, 30, 40], tgt: [0, 10, 5] },
  lamps:     { pos: [0, 36, 22], tgt: [0, 11, -1] },
  rotors:    { pos: [10, 30, 14], tgt: [-1.5, 10, -8] },
  plugboard: { pos: [4, 16, 56], tgt: [0, 4, 13] },
  inside:    { pos: [56, 66, 100], tgt: [0, 13, 10] },
  xray:      { pos: [30, 44, 56], tgt: [0, 8, 0] },
  ukw:       { pos: [-26, 26, 12], tgt: [-6, 10, -8] },
};
const camTween = { t: 1, from: null, to: null };
function goView(name) {
  const v = VIEWS[name] || VIEWS.overview;
  const aspectK = camera.aspect < 1 ? 1.2 : 1;
  const tgt = new THREE.Vector3(...v.tgt);
  const pos = new THREE.Vector3(...v.pos).sub(tgt).multiplyScalar(aspectK).add(tgt);
  camTween.from = { pos: camera.position.clone(), tgt: controls.target.clone() };
  camTween.to = { pos, tgt };
  camTween.t = 0;
}
function animateCamera(dt) {
  if (camTween.t >= 1) return;
  camTween.t = Math.min(1, camTween.t + dt / 1.1);
  const e = ease(camTween.t);
  camera.position.lerpVectors(camTween.from.pos, camTween.to.pos, e);
  controls.target.lerpVectors(camTween.from.tgt, camTween.to.tgt, e);
}

// ---------------------------------------------------------------------------
// Picking & hover
// ---------------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const tooltip = $('#tooltip');
let selectedSocket = null;
let selectedPart = null;
const selBox = new THREE.Box3Helper(new THREE.Box3(), 0xffb23a);
selBox.visible = false;
scene.add(selBox);

function pick(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(model.root.children, true).filter((h) => h.object.visible && h.object.material !== ghostMat);
  return hits[0]?.object || null;
}

function describe(obj) {
  if (!obj) return null;
  const u = obj.userData;
  if (u.key) return `Key ${u.key}`;
  if (u.socket) return `Plug socket ${u.socket}${machine.plugboard[toIndex(u.socket)] !== toIndex(u.socket) ? ` ↔ ${toLetter(machine.plugboard[toIndex(u.socket)])} (click to unplug)` : ' (click to plug)'}`;
  if (u.thumb != null) return `${['Left', 'Middle', 'Right'][u.thumb]} rotor thumbwheel: click to advance, shift-click or scroll to turn back`;
  if (u.partId) return model.parts.find((p) => p.id === u.partId)?.name;
  return null;
}

let downAt = null;
let downObj = null;
renderer.domElement.addEventListener('pointerdown', (ev) => {
  ac();
  downAt = [ev.clientX, ev.clientY];
  downObj = pick(ev);
  if (downObj?.userData.key) {
    controls.enabled = false;
    pressKey(downObj.userData.key);
  }
});
window.addEventListener('pointerup', (ev) => {
  controls.enabled = true;
  if (heldKey && downObj?.userData.key) releaseKey();
  if (!downAt) return;
  const moved = Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]) > 5;
  const obj = downObj;
  downAt = null; downObj = null;
  if (moved || !obj || ev.target !== renderer.domElement) return;
  const u = obj.userData;
  if (u.key) return;
  if (u.thumb != null) { turnRotor(u.thumb, ev.shiftKey ? -1 : 1); return; }
  if (u.socket) { clickSocket(u.socket); return; }
  if (u.partId) selectPart(u.partId, false);
});
renderer.domElement.addEventListener('pointermove', (ev) => {
  const obj = pick(ev);
  const text = describe(obj);
  renderer.domElement.style.cursor = obj && (obj.userData.key || obj.userData.socket || obj.userData.thumb != null) ? 'pointer' : 'grab';
  if (text) {
    const r = stage.getBoundingClientRect();
    tooltip.hidden = false;
    tooltip.textContent = text;
    const x = Math.min(ev.clientX - r.left + 14, r.width - tooltip.offsetWidth - 8);
    tooltip.style.left = `${Math.max(8, x)}px`;
    tooltip.style.top = `${ev.clientY - r.top + 14}px`;
  } else {
    tooltip.hidden = true;
  }
});
renderer.domElement.addEventListener('pointerleave', () => { tooltip.hidden = true; });
renderer.domElement.addEventListener('wheel', (ev) => {
  const obj = pick(ev);
  if (obj?.userData.thumb != null) {
    ev.preventDefault();
    ev.stopImmediatePropagation();
    turnRotor(obj.userData.thumb, ev.deltaY > 0 ? -1 : 1);
  }
}, { capture: true, passive: false });

function turnRotor(i, d) {
  const p = machine.positions;
  p[i] = (p[i] + d + 26) % 26;
  machine.positions = p;
  settings.start = machine.positions.slice();
  syncRotorVisuals();
  sfx.rotor(1);
  syncWindows([i === 0, i === 1, i === 2]);
  refreshSignalState();
}

function clickSocket(l) {
  const table = machine.plugboard.slice();
  const i = toIndex(l);
  if (table[i] !== i) {
    const j = table[i];
    table[i] = i; table[j] = j;
    selectedSocket = null;
    commitPlugTable(table, `Unplugged ${l}↔${toLetter(j)}`);
    return;
  }
  if (!selectedSocket) {
    selectedSocket = l;
    setMsg(`Socket ${l} selected. Click another free socket to connect a cable.`, 'ok');
    highlightSocket(l);
    return;
  }
  if (selectedSocket === l) { selectedSocket = null; highlightSocket(null); setMsg(''); return; }
  const j = toIndex(selectedSocket);
  if (plugboardPairs(table).length >= 13) { setMsg('All 13 possible cables are in use.', 'err'); return; }
  table[i] = j; table[j] = i;
  const a = selectedSocket;
  selectedSocket = null;
  commitPlugTable(table, `Connected ${a}↔${l}`);
}

let socketHalo = null;
function highlightSocket(l) {
  if (socketHalo) { model.root.remove(socketHalo); socketHalo = null; }
  if (!l) return;
  const s = model.sockets.get(l);
  socketHalo = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.1, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffb23a, toneMapped: false }));
  socketHalo.position.copy(s.group.getWorldPosition(new THREE.Vector3())).sub(model.root.position);
  socketHalo.position.z += 0.1;
  model.root.add(socketHalo);
}

function commitPlugTable(table, msg) {
  machine.setPlugboardTable(table);
  settings.plugboard = plugboardPairs(table).join(' ');
  model.setPlugboard(plugboardPairs(table));
  highlightSocket(null);
  $('#plugInput').value = settings.plugboard;
  setMsg(msg, 'ok');
  refreshSignalState();
}

function selectPart(id, fromList = true) {
  selectedPart = id;
  const p = model.parts.find((x) => x.id === id);
  selBox.box.setFromObject(p.group);
  selBox.visible = true;
  selBox.userData.until = performance.now() + 4000;
  const info = PART_INFO[id];
  $('#partInfo').innerHTML = info ? `<h2>${info.title}</h2><p>${info.text}</p>` : '';
  $$('#partList button').forEach((b) => b.classList.toggle('sel', b.dataset.id === id));
  if (!fromList) showTab('parts');
}

// ---------------------------------------------------------------------------
// Keyboard input
// ---------------------------------------------------------------------------
const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');
window.addEventListener('keydown', (e) => {
  if (isTyping(document.activeElement) || e.ctrlKey || e.metaKey || e.altKey) return;
  const l = e.key.toUpperCase();
  if (l.length === 1 && ALPHABET.includes(l)) {
    e.preventDefault();
    if (!e.repeat) { ac(); pressKey(l); }
  }
});
window.addEventListener('keyup', (e) => {
  if (heldKey && e.key.toUpperCase() === heldKey) releaseKey();
});
window.addEventListener('blur', releaseKey);

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
function setPressed(sel, on) { $(sel).setAttribute('aria-pressed', String(!!on)); }
function setMsg(text, kind = '') { const m = $('#plugMsg'); m.textContent = text; m.className = 'msg ' + kind; }

function fillSelects() {
  for (const id of ['#rotorL', '#rotorM', '#rotorR']) {
    $(id).innerHTML = Object.keys(ROTORS).map((n) => `<option>${n}</option>`).join('');
  }
  for (const id of ['#ringL', '#ringM', '#ringR']) {
    $(id).innerHTML = [...ALPHABET].map((l, i) => `<option value="${i}">${l} (${String(i + 1).padStart(2, '0')})</option>`).join('');
  }
  $('#preset').innerHTML = '<option value="">Choose a preset…</option>' + Object.entries(PRESETS).map(([k, p]) => `<option value="${k}">${p.label}</option>`).join('');
}

function syncUI() {
  ['#rotorL', '#rotorM', '#rotorR'].forEach((id, i) => { $(id).value = settings.rotors[i]; });
  ['#ringL', '#ringM', '#ringR'].forEach((id, i) => { $(id).value = settings.rings[i]; });
  $('#reflector').value = settings.reflector;
  $('#plugInput').value = plugboardPairs(machine.plugboard).join(' ');
  syncWindows();
  refreshSignalState();
}

function syncWindows(moved = [false, false, false]) {
  $$('.win-group').forEach((g, i) => {
    const el = g.querySelector('.win-letter');
    el.textContent = toLetter(machine.positions[i]);
    if (moved[i]) { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }
  });
}

function renderTape() {
  const group = (s) => s.replace(/(.{5})/g, '$1 ').trim();
  $('#tapeIn').textContent = group(tapeIn.slice(-400));
  $('#tapeOut').textContent = group(tapeOut.slice(-400));
}

const diagram = createDiagram($('#diagram'));
function diagramState() {
  return { rotors: settings.rotors, reflector: settings.reflector, windows: machine.windowLetters };
}
function updateSignal(trace) {
  diagram.update(trace, diagramState());
  const lines = describeTrace(trace);
  $('#stageList').innerHTML = lines.map((l, i) => `<li class="${i <= 6 && i > 0 ? 'fwd-stage' : i > 6 ? 'back-stage' : ''}">${l}</li>`).join('');
}
function refreshSignalState() {
  diagram.update(null, diagramState());
  $('#stageList').innerHTML = '';
  clearPath();
  lastTrace = null;
}

function showTab(name) {
  $$('.tab').forEach((t) => { const on = t.dataset.tab === name; t.classList.toggle('active', on); t.setAttribute('aria-selected', String(on)); });
  $$('.tab-body').forEach((b) => { b.hidden = b.dataset.body !== name; });
}
$$('.tab').forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));

function readSettingsFromUI() {
  const rotors = ['#rotorL', '#rotorM', '#rotorR'].map((id) => $(id).value);
  if (new Set(rotors).size !== 3) {
    setMsg('Each rotor can only be used once. Pick three different rotors.', 'err');
    ['#rotorL', '#rotorM', '#rotorR'].forEach((id, i) => { $(id).value = settings.rotors[i]; });
    return;
  }
  settings.rotors = rotors;
  settings.rings = ['#ringL', '#ringM', '#ringR'].map((id) => +$(id).value);
  settings.reflector = $('#reflector').value;
  settings.start = machine.positions.slice();
  applySettings();
  setMsg('');
}
['#rotorL', '#rotorM', '#rotorR', '#ringL', '#ringM', '#ringR', '#reflector'].forEach((id) => $(id).addEventListener('change', readSettingsFromUI));

$$('.win-group').forEach((g, i) => {
  g.querySelector('.up').addEventListener('click', () => turnRotor(i, 1));
  g.querySelector('.down').addEventListener('click', () => turnRotor(i, -1));
});

$('#plugApply').addEventListener('click', () => {
  try {
    const t = parsePlugboard($('#plugInput').value);
    commitPlugTable(t, `${plugboardPairs(t).length} cable(s) connected`);
  } catch (err) { setMsg(err.message, 'err'); }
});
$('#plugInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#plugApply').click(); });
$('#plugClear').addEventListener('click', () => commitPlugTable([...Array(26).keys()], 'Plugboard cleared'));
$('#plugRandom').addEventListener('click', () => {
  const letters = [...ALPHABET].sort(() => Math.random() - 0.5).slice(0, 20);
  const t = [...Array(26).keys()];
  for (let i = 0; i < 20; i += 2) { const a = toIndex(letters[i]), b = toIndex(letters[i + 1]); t[a] = b; t[b] = a; }
  commitPlugTable(t, '10 random cables connected');
});

$('#preset').addEventListener('change', (e) => {
  const p = PRESETS[e.target.value];
  if (!p) return;
  stopRun();
  settings.rotors = p.cfg.rotors.slice();
  settings.reflector = p.cfg.reflector;
  settings.rings = [...p.cfg.rings].map(toIndex);
  settings.start = [...p.cfg.positions].map(toIndex);
  settings.plugboard = p.cfg.plugboard;
  applySettings();
  tapeIn = tapeOut = '';
  renderTape();
  $('#presetHint').textContent = p.hint;
  $('#btnTypeCipher').hidden = !p.cipher;
  $('#btnTypeCipher').dataset.cipher = p.cipher || '';
  setMsg('');
});
$('#btnResetPos').addEventListener('click', () => {
  machine.positions = settings.start;
  syncRotorVisuals();
  syncWindows([true, true, true]);
  tapeIn = tapeOut = '';
  renderTape();
  refreshSignalState();
});

// Auto-typing a message.
let runTimer = null;
function runText(text) {
  stopRun();
  const letters = [...text.toUpperCase()].filter((c) => ALPHABET.includes(c));
  if (!letters.length) return;
  $('#btnStop').hidden = false;
  let i = 0;
  const speed = letters.length > 60 ? 110 : 240;
  const tick = () => {
    if (i >= letters.length) { stopRun(); return; }
    pressKey(letters[i++]);
    runTimer = setTimeout(() => { releaseKey(); runTimer = setTimeout(tick, speed * 0.4); }, speed * 0.6);
  };
  tick();
}
function stopRun() {
  clearTimeout(runTimer);
  runTimer = null;
  releaseKey();
  $('#btnStop').hidden = true;
}
$('#btnRun').addEventListener('click', () => { ac(); runText($('#typeInput').value); });
$('#btnStop').addEventListener('click', stopRun);
$('#btnTypeCipher').addEventListener('click', (e) => { ac(); runText(e.target.dataset.cipher); });

$('#btnCopy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(tapeOut.replace(/(.{5})/g, '$1 ').trim()); $('#btnCopy').textContent = 'Copied'; }
  catch { $('#btnCopy').textContent = 'Copy failed'; }
  setTimeout(() => { $('#btnCopy').textContent = 'Copy output'; }, 1200);
});
$('#btnClearTape').addEventListener('click', () => { tapeIn = tapeOut = ''; renderTape(); });

// Toolbar.
$('#btnLid').addEventListener('click', () => { view.lidOpen = !view.lidOpen; setPressed('#btnLid', view.lidOpen); });
$('#btnCover').addEventListener('click', () => { view.coverOpen = !view.coverOpen; setPressed('#btnCover', view.coverOpen); });
$('#btnXray').addEventListener('click', () => setXray(!view.xray));
$('#btnPath').addEventListener('click', () => {
  showPath = !showPath;
  setPressed('#btnPath', showPath);
  if (!showPath) clearPath(); else { setXray(true); if (lastTrace) buildPath(lastTrace); }
});
$('#btnExplode').addEventListener('click', () => {
  view.explodeTarget = view.explodeTarget > 0.5 ? 0 : 1;
  setPressed('#btnExplode', view.explodeTarget > 0.5);
  $('#btnExplode').textContent = view.explodeTarget > 0.5 ? 'Reassemble' : 'Dismantle';
  if (view.explodeTarget > 0.5) goView('inside');
});
$('#explodeSlider').addEventListener('input', (e) => {
  view.explodeTarget = +e.target.value / 1000;
  setPressed('#btnExplode', view.explodeTarget > 0.5);
  $('#btnExplode').textContent = view.explodeTarget > 0.5 ? 'Reassemble' : 'Dismantle';
});
$('#btnView').addEventListener('click', () => goView('overview'));
$('#btnSound').addEventListener('click', () => { soundOn = !soundOn; setPressed('#btnSound', soundOn); });
$('#panelToggle').addEventListener('click', () => {
  const p = $('#panel');
  p.classList.toggle('collapsed');
  $('#panelToggle').setAttribute('aria-expanded', String(!p.classList.contains('collapsed')));
  setTimeout(resize, 50);
});

// Lessons.
let lesson = 0;
function renderLesson() {
  const L = LESSONS[lesson];
  $('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}`;
  $('#lessonCount').textContent = `${lesson + 1} / ${LESSONS.length}`;
  $('#lessonPrev').disabled = lesson === 0;
  $('#lessonNext').disabled = lesson === LESSONS.length - 1;
}
$('#lessonPrev').addEventListener('click', () => { lesson = Math.max(0, lesson - 1); renderLesson(); });
$('#lessonNext').addEventListener('click', () => { lesson = Math.min(LESSONS.length - 1, lesson + 1); renderLesson(); });
$('#lessonShow').addEventListener('click', () => {
  const L = LESSONS[lesson];
  if (L.action === 'openCover') { view.coverOpen = true; setPressed('#btnCover', true); }
  if (L.action === 'explode') { $('#btnExplode').click(); return; }
  if (L.action === 'trace') {
    setXray(true);
    if (!showPath) $('#btnPath').click();
    releaseKey();
    pressKey('A');
    setTimeout(releaseKey, 1200);
  }
  if (view.explodeTarget > 0 && L.action !== 'explode') {
    view.explodeTarget = 0;
    $('#btnExplode').textContent = 'Dismantle';
    setPressed('#btnExplode', false);
  }
  if (L.focus) selectPart(L.focus);
  goView(L.view);
});

// Parts list.
$('#partList').innerHTML = model.parts.map((p) => `<button class="mini" data-id="${p.id}">${p.name}</button>`).join('');
$$('#partList button').forEach((b) => b.addEventListener('click', () => selectPart(b.dataset.id)));

// ---------------------------------------------------------------------------
// Resize & loop
// ---------------------------------------------------------------------------
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = camera.aspect < 1 ? 46 : 34;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);

const clock = new THREE.Clock();
let lastExplode = -1;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);

  // Keys travel.
  for (const k of model.keys.values()) {
    k.pressed += (k.target - k.pressed) * Math.min(1, dt * 30);
    k.group.position.y = -0.75 * k.pressed;
  }
  // Rotors turn smoothly toward their target angles.
  for (const r of model.rotors) {
    r.angle += (r.targetAngle - r.angle) * Math.min(1, dt * 18);
    r.coreAngle += (r.targetCoreAngle - r.coreAngle) * Math.min(1, dt * 18);
    r.outer.rotation.x = r.angle;
    r.core.rotation.x = r.coreAngle;
  }
  // Lamps fade in/out like incandescent bulbs.
  let litPos = null;
  for (const [l, lamp] of model.lamps) {
    const target = l === litLamp.letter ? 1 : 0;
    lamp.level += (target - lamp.level) * Math.min(1, dt * (target ? 22 : 9));
    lamp.glass.emissiveIntensity = lamp.level * 2.6;
    lamp.bulb.emissiveIntensity = lamp.level * 4;
    if (target) litPos = lamp.pos;
  }
  if (litPos) lampLight.position.copy(litPos).add(partOffset('lampPanel')).add(new THREE.Vector3(0, 1.5, 0));
  lampLight.intensity += ((litLamp.letter ? 60 : 0) - lampLight.intensity) * Math.min(1, dt * 15);

  // Lid, cover, explode.
  view.lidAngle += ((view.lidOpen ? LID_OPEN : 0) - view.lidAngle) * Math.min(1, dt * 5);
  view.coverAngle += ((view.coverOpen ? COVER_OPEN : 0) - view.coverAngle) * Math.min(1, dt * 5);
  const dx = view.explodeTarget - view.explode;
  view.explode += Math.sign(dx) * Math.min(Math.abs(dx), dt * 0.45);
  applyExplode();
  if (Math.abs(view.explode - lastExplode) > 1e-4) {
    $('#explodeSlider').value = Math.round(view.explode * 1000);
    if (lastTrace && showPath) { const t = pathAnim.t; buildPath(lastTrace); pathAnim.t = Math.max(t, 0.999); }
    if (selBox.visible && selectedPart) selBox.box.setFromObject(model.parts.find((p) => p.id === selectedPart).group);
    lastExplode = view.explode;
  }
  if (selBox.visible && performance.now() > selBox.userData.until) selBox.visible = false;

  animatePath(dt);
  animateCamera(dt);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
fillSelects();
applySettings();
renderLesson();
renderTape();
resize();
{
  const v = VIEWS.overview;
  const k = camera.aspect < 1 ? 1.2 : 1;
  const tgt = new THREE.Vector3(...v.tgt);
  camera.position.copy(new THREE.Vector3(...v.pos).sub(tgt).multiplyScalar(k).add(tgt));
  controls.target.copy(tgt);
}
requestAnimationFrame(() => {
  frame();
  $('#loading').classList.add('done');
});

// Expose for debugging / tests.
function finishAnimations() {
  view.explode = view.explodeTarget;
  view.lidAngle = view.lidOpen ? LID_OPEN : 0;
  view.coverAngle = view.coverOpen ? COVER_OPEN : 0;
  if (camTween.to) { camTween.t = 1; camera.position.copy(camTween.to.pos); controls.target.copy(camTween.to.tgt); }
  for (const r of model.rotors) { r.angle = r.targetAngle; r.coreAngle = r.targetCoreAngle; }
  applyExplode();
  if (lastTrace && showPath) buildPath(lastTrace);
  pathAnim.t = 0.9999;
}
window.enigmaApp = { machine, model, pressKey, releaseKey, view, goView, settings, setXray, camera, controls, finishAnimations };
