// Procedural 3D model of an Enigma I. Units are centimetres; +z faces the operator.
import * as THREE from 'three';
import * as T from './textures.js';

export const KEY_ROWS = ['QWERTZUIO', 'ASDFGHJK', 'PYXCVBNML'];

// ---- Layout -----------------------------------------------------------------
const BOX = { x: 17, z: 14, h: 12, wall: 1.1 };
const DECK_Y = 9.4;             // keyboard deck plate
const TOP_Y = 12;               // lamp panel + rotor cover
const PLATE_T = 0.3;
const KEY_Z = [5.0, 7.9, 10.8];
const KEY_DX = 3.1;
const LAMP_Z = [-3.4, -1.1, 1.2];
const LAMP_DX = 2.85;
const PLUG_Y = [7.2, 5.0, 2.8];
const PLUG_DX = 3.1;
const FRONT_Z = BOX.z;

export const AXIS = { y: 8.2, z: -8.7 };          // rotor spindle
export const CONTACT_R = 2.5;                      // radius of the contact circle
export const SLOTS = {                             // x centre + half-width of each wheel
  ukw:   { x: -8.6, hw: 1.0 },
  left:  { x: -5.2, hw: 1.5 },
  middle:{ x: -1.8, hw: 1.5 },
  right: { x: 1.6,  hw: 1.5 },
  etw:   { x: 4.9,  hw: 1.0 },
};
const TYRE_R = 3.9;
const THUMB_R = 4.9;
const BODY_R = 3.65;
// Local x-extent of the sub-parts of a rotor (thumbwheel on the left).
const R_THUMB = [-1.5, -1.0];
const R_TYRE = [-1.0, -0.1];
const R_BODY = [-0.1, 1.5];

const STEP = (Math.PI * 2) / 26;

function keyXY(letter, rows, dx, zs) {
  for (let r = 0; r < rows.length; r++) {
    const i = rows[r].indexOf(letter);
    if (i >= 0) return { x: (i - (rows[r].length - 1) / 2) * dx, z: zs[r], row: r };
  }
  return null;
}
export const keyPos = (l) => keyXY(l, KEY_ROWS, KEY_DX, KEY_Z);
export const lampPos = (l) => keyXY(l, KEY_ROWS, LAMP_DX, LAMP_Z);
export function plugPos(l) {
  const p = keyXY(l, KEY_ROWS, PLUG_DX, PLUG_Y);
  return { x: p.x, y: p.z, row: p.row };
}

/** Angle (around the spindle) of absolute contact k, and its 3D point at a given x. */
export function contactPoint(x, k, r = CONTACT_R) {
  const b = Math.PI / 2 - k * STEP;
  return new THREE.Vector3(x, AXIS.y + r * Math.sin(b), AXIS.z + r * Math.cos(b));
}

// ---- Materials ----------------------------------------------------------------
function makeMaterials() {
  const wood = T.woodTextures();
  const crackle = T.crackleTextures();
  const brushed = T.brushedTexture();
  return {
    wood: new THREE.MeshStandardMaterial({ map: wood.map, roughnessMap: wood.roughnessMap, bumpMap: wood.bumpMap, bumpScale: 0.6, roughness: 0.62, metalness: 0 }),
    woodInside: new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 0.9 }),
    paint: new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.78, metalness: 0.15, bumpMap: crackle.bumpMap, bumpScale: 1.2, roughnessMap: crackle.roughnessMap }),
    bakelite: new THREE.MeshStandardMaterial({ color: 0x121110, roughness: 0.32, metalness: 0.05 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc19a5b, roughness: 0.32, metalness: 1 }),
    nickel: new THREE.MeshStandardMaterial({ color: 0xcfd2d4, roughness: 0.28, metalness: 1, roughnessMap: brushed }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8d9296, roughness: 0.45, metalness: 1 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.4, metalness: 0.9, roughnessMap: brushed }),
    tyre: (() => { const t = T.alphabetRingTexture(); return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.35, roughness: 0.45, metalness: 0.1 }); })(),
    knurl: new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.35, metalness: 0.9, bumpMap: T.knurlTexture(), bumpScale: 2 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.85 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.55 }),
    wire: new THREE.MeshStandardMaterial({ color: 0x7a3b1d, roughness: 0.5, metalness: 0.4 }),
    felt: new THREE.MeshStandardMaterial({ color: 0x2c2f22, roughness: 1 }),
    bulb: new THREE.MeshPhysicalMaterial({ color: 0xfff4d6, roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.7, emissive: 0xffb640, emissiveIntensity: 0 }),
    battery: new THREE.MeshStandardMaterial({ color: 0x3e5c3a, roughness: 0.6 }),
  };
}

// ---- Geometry helpers ------------------------------------------------------------
function mesh(geo, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

/** Cylinder whose axis runs along X from x0 to x1. */
function xCyl(r, x0, x1, mat, segs = 64, open = false) {
  const g = new THREE.CylinderGeometry(r, r, x1 - x0, segs, 1, open);
  g.rotateZ(-Math.PI / 2);
  g.translate((x0 + x1) / 2, 0, 0);
  return mesh(g, mat);
}

/** Horizontal plate (top at y + t) with circular / rectangular holes. Coordinates are x/z. */
function plate(x0, x1, z0, z1, y, t, mat, holes = []) {
  const s = new THREE.Shape();
  s.moveTo(x0, -z0); s.lineTo(x1, -z0); s.lineTo(x1, -z1); s.lineTo(x0, -z1); s.lineTo(x0, -z0);
  for (const h of holes) {
    const p = new THREE.Path();
    if (h.r) {
      p.absarc(h.x, -h.z, h.r, 0, Math.PI * 2, true);
    } else {
      const [ax, bx, az, bz] = [h.x - h.w / 2, h.x + h.w / 2, h.z - h.d / 2, h.z + h.d / 2];
      p.moveTo(ax, -az); p.lineTo(ax, -bz); p.lineTo(bx, -bz); p.lineTo(bx, -az); p.lineTo(ax, -az);
    }
    s.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 24 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return mesh(g, mat);
}

function disc(r, mat, segs = 48) {
  const g = new THREE.CircleGeometry(r, segs);
  g.rotateX(-Math.PI / 2);
  return mesh(g, mat, { cast: false });
}

/** Screw head (slotted) facing +y. */
function screw(x, y, z, mats, r = 0.22) {
  const g = new THREE.Group();
  const head = mesh(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.nickel);
  head.scale.y = 0.45;
  g.add(head);
  const slot = box(r * 1.8, 0.05, 0.05, mats.bakelite, 0, r * 0.42, 0);
  slot.rotation.y = Math.random() * Math.PI;
  g.add(slot);
  g.position.set(x, y, z);
  return g;
}

// ---- Model -------------------------------------------------------------------
export function buildEnigma() {
  const M = makeMaterials();
  const root = new THREE.Group();
  root.name = 'Enigma';
  const parts = [];
  const pickables = [];

  function part(id, name, group, explode, order) {
    group.userData.partId = id;
    group.traverse((o) => { if (o.isMesh) o.userData.partId = id; });
    group.userData.base = group.position.clone();
    group.userData.baseRot = group.rotation.clone();
    const p = { id, name, group, explode: explode.offset, rot: explode.rot || null, order };
    parts.push(p);
    root.add(group);
    return p;
  }

  // ---- Case ----
  const caseG = new THREE.Group();
  {
    const { x, z, h, wall } = BOX;
    caseG.add(box(2 * x, 0.8, 2 * z, M.wood, 0, 0.4, 0));                               // base
    caseG.add(box(2 * x, h, wall, M.wood, 0, h / 2, -z + wall / 2));                   // back
    caseG.add(box(wall, h, 2 * z, M.wood, -x + wall / 2, h / 2, 0));                   // left
    caseG.add(box(wall, h, 2 * z, M.wood, x - wall / 2, h / 2, 0));                    // right
    // Front: split around the plugboard opening.
    caseG.add(box(2 * x, 1.0, wall, M.wood, 0, 0.5, z - wall / 2));
    caseG.add(box(2 * x, h - 9.0, wall, M.wood, 0, 9.0 + (h - 9.0) / 2, z - wall / 2));
    caseG.add(box(1.6, 8, wall, M.wood, -x + 0.8, 5, z - wall / 2));
    caseG.add(box(1.6, 8, wall, M.wood, x - 0.8, 5, z - wall / 2));
    // Brass corner guards.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      caseG.add(box(1.4, 1.2, 1.4, M.brass, sx * (x - 0.55), 0.6, sz * (z - 0.55)));
      caseG.add(box(1.4, 1.2, 1.4, M.brass, sx * (x - 0.55), h - 0.6, sz * (z - 0.55)));
    }
    // Carry handles.
    for (const sx of [-1, 1]) {
      const hg = new THREE.TorusGeometry(2.2, 0.22, 12, 32, Math.PI);
      const hm = mesh(hg, M.steel);
      hm.rotation.set(0, Math.PI / 2, 0);
      hm.position.set(sx * (x + 0.25), 8.5, 0);
      caseG.add(hm);
      caseG.add(box(0.3, 1, 1, M.steel, sx * (x + 0.1), 8.5, -2.2));
      caseG.add(box(0.3, 1, 1, M.steel, sx * (x + 0.1), 8.5, 2.2));
    }
    // Lid latches on the front.
    for (const sx of [-1, 1]) caseG.add(box(1.6, 1.8, 0.4, M.nickel, sx * 12.5, h - 1.2, z + 0.15));
    // Interior floor felt.
    const felt = box(2 * x - 2.4, 0.1, 2 * z - 2.4, M.felt, 0, 0.85, 0);
    felt.castShadow = false;
    caseG.add(felt);
  }
  part('case', 'Wooden case', caseG, { offset: new THREE.Vector3(0, 0, 0) }, 99);

  // ---- Lid (hinged at the back top edge) ----
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, BOX.h, -BOX.z);
  {
    const lid = new THREE.Group();
    const lh = 6.5, { x, z, wall } = BOX;
    lid.add(box(2 * x, 0.9, 2 * z, M.wood, 0, lh - 0.45, z));
    lid.add(box(2 * x, lh, wall, M.wood, 0, lh / 2, wall / 2));
    lid.add(box(2 * x, lh, wall, M.wood, 0, lh / 2, 2 * z - wall / 2));
    lid.add(box(wall, lh, 2 * z, M.wood, -x + wall / 2, lh / 2, z));
    lid.add(box(wall, lh, 2 * z, M.wood, x - wall / 2, lh / 2, z));
    const inner = box(2 * x - 2.4, 0.1, 2 * z - 2.4, M.felt, 0, lh - 0.95, z);
    lid.add(inner);
    for (const sx of [-1, 1]) for (const sz of [0, 1]) lid.add(box(1.4, 1.2, 1.4, M.brass, sx * (x - 0.55), lh - 0.6, sz * 2 * z + (sz ? -0.55 : 0.55)));
    // Hinges.
    for (const sx of [-1, 1]) lid.add(xCyl(0.35, sx * 10 - 1.5, sx * 10 + 1.5, M.nickel, 16));
    // Spare-bulb/instruction plate on the lid interior.
    const note = mesh(new THREE.PlaneGeometry(14, 5), new THREE.MeshStandardMaterial({ map: T.labelTexture('Chiffriermaschine · Enigma I', { w: 1024, h: 128, bg: '#cfc6a8', fg: '#2a2418', font: 'italic 58px Georgia, serif' }), roughness: 0.9 }));
    note.rotation.x = Math.PI / 2;
    note.position.set(0, lh - 1.02, z);
    lid.add(note);
    lidPivot.add(lid);
  }
  lidPivot.rotation.x = -1.75;
  const lidPart = part('lid', 'Lid', lidPivot, { offset: new THREE.Vector3(0, 4, -12) }, 0);

  // ---- Keyboard ----
  const keys = new Map();
  const keyboardG = new THREE.Group();
  const deckG = new THREE.Group();
  {
    const holes = [];
    for (const row of KEY_ROWS) for (const l of row) { const p = keyPos(l); holes.push({ x: p.x, z: p.z, r: 0.42 }); }
    deckG.add(plate(-BOX.x + BOX.wall, BOX.x - BOX.wall, 3.4, BOX.z - BOX.wall, DECK_Y, PLATE_T, M.paint, holes));
    for (const [sx, sz] of [[-14.8, 4], [14.8, 4], [-14.8, 12.3], [14.8, 12.3]]) deckG.add(screw(sx, DECK_Y + PLATE_T + 0.04, sz, M));
    // Key levers underneath (visible when dismantled).
    for (const row of KEY_ROWS) for (const l of row) {
      const p = keyPos(l);
      deckG.add(box(0.25, 0.25, 6, M.steel, p.x, DECK_Y - 1.2, p.z - 3 + 1));
    }
  }
  part('deck', 'Keyboard deck & key levers', deckG, { offset: new THREE.Vector3(0, 3, 14) }, 3);

  const capGeo = new THREE.CylinderGeometry(1.05, 1.1, 0.45, 40);
  const rimGeo = new THREE.TorusGeometry(1.08, 0.12, 10, 40);
  rimGeo.rotateX(Math.PI / 2);
  const stemGeo = new THREE.CylinderGeometry(0.28, 0.28, 2.3, 12);
  const faceGeo = new THREE.CircleGeometry(0.93, 40);
  faceGeo.rotateX(-Math.PI / 2);
  for (const row of KEY_ROWS) for (const l of row) {
    const p = keyPos(l);
    const k = new THREE.Group();
    const stem = mesh(stemGeo, M.steel); stem.position.y = DECK_Y + 1.0; k.add(stem);
    const cap = mesh(capGeo, M.bakelite); cap.position.y = DECK_Y + 2.35; k.add(cap);
    const rim = mesh(rimGeo, M.nickel); rim.position.y = DECK_Y + 2.52; k.add(rim);
    const face = mesh(faceGeo, new THREE.MeshStandardMaterial({ map: T.keyCapTexture(l), roughness: 0.3 }), { cast: false });
    face.position.y = DECK_Y + 2.58; k.add(face);
    k.position.set(p.x, 0, p.z);
    k.traverse((o) => { if (o.isMesh) { o.userData.key = l; pickables.push(o); } });
    keyboardG.add(k);
    keys.set(l, { group: k, baseY: 0, pressed: 0, target: 0 });
  }
  part('keys', 'Keyboard (26 keys)', keyboardG, { offset: new THREE.Vector3(0, 8, 14) }, 2);

  // ---- Lampboard ----
  const lamps = new Map();
  const lampPanelG = new THREE.Group();
  const bulbsG = new THREE.Group();
  {
    const holes = [];
    for (const row of KEY_ROWS) for (const l of row) { const p = lampPos(l); holes.push({ x: p.x, z: p.z, r: 0.95 }); }
    lampPanelG.add(plate(-BOX.x + BOX.wall, BOX.x - BOX.wall, -4.7, 3.4, TOP_Y, PLATE_T, M.paint, holes));
    const glassGeo = new THREE.CircleGeometry(0.95, 40);
    glassGeo.rotateX(-Math.PI / 2);
    const bezelGeo = new THREE.TorusGeometry(0.98, 0.09, 8, 40);
    bezelGeo.rotateX(Math.PI / 2);
    for (const row of KEY_ROWS) for (const l of row) {
      const p = lampPos(l);
      const tex = T.lampTexture(l);
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, emissive: 0xffb23a, emissiveMap: tex, emissiveIntensity: 0 });
      const g = mesh(glassGeo, mat, { cast: false });
      g.position.set(p.x, TOP_Y + 0.18, p.z);
      lampPanelG.add(g);
      const bz = mesh(bezelGeo, M.nickel); bz.position.set(p.x, TOP_Y + PLATE_T, p.z); lampPanelG.add(bz);
      // Bulb + socket below the panel.
      const bulb = mesh(new THREE.SphereGeometry(0.42, 16, 12), M.bulb.clone(), { cast: false });
      bulb.position.set(p.x, TOP_Y - 0.9, p.z);
      bulbsG.add(bulb);
      bulbsG.add(box(0.7, 0.9, 0.7, M.brass, p.x, TOP_Y - 1.7, p.z));
      lamps.set(l, { glass: mat, bulb: bulb.material, pos: new THREE.Vector3(p.x, TOP_Y + 0.4, p.z), level: 0 });
    }
    bulbsG.add(box(2 * BOX.x - 3, 0.2, 6.2, M.bakelite, 0, TOP_Y - 2.25, -0.8));
    // Riser between the keyboard deck and the lamp panel.
    lampPanelG.add(box(2 * BOX.x - 2 * BOX.wall, TOP_Y - DECK_Y, 0.3, M.paint, 0, (TOP_Y + DECK_Y) / 2 + 0.15, 3.3));
    for (const [sx, sz] of [[-15, -4.2], [15, -4.2], [-15, 2.9], [15, 2.9]]) lampPanelG.add(screw(sx, TOP_Y + PLATE_T + 0.04, sz, M));
  }
  part('lampPanel', 'Lampboard cover', lampPanelG, { offset: new THREE.Vector3(0, 14, 6) }, 1.5);
  part('bulbs', 'Lamps (bulbs & sockets)', bulbsG, { offset: new THREE.Vector3(0, 7, 6) }, 4);

  // ---- Rotor cover (inner lid, hinged at its back edge) ----
  const coverPivot = new THREE.Group();
  coverPivot.position.set(0, TOP_Y, -BOX.z + BOX.wall);
  {
    const zc = AXIS.z - coverPivot.position.z;
    const holes = [];
    for (const s of ['left', 'middle', 'right']) {
      const x = SLOTS[s].x;
      holes.push({ x: x + (R_TYRE[0] + R_TYRE[1]) / 2 + 0.05, z: zc, w: 0.7, d: 1.2 }); // letter window
      holes.push({ x: x + (R_THUMB[0] + R_THUMB[1]) / 2, z: zc, w: 0.6, d: 5.6 });     // thumbwheel slot
    }
    const cz0 = 0, cz1 = -4.7 - coverPivot.position.z;
    const cov = plate(-BOX.x + BOX.wall, BOX.x - BOX.wall, cz0, cz1, 0, PLATE_T, M.paint, holes);
    coverPivot.add(cov);
    // Window bezels.
    for (const s of ['left', 'middle', 'right']) {
      const x = SLOTS[s].x + (R_TYRE[0] + R_TYRE[1]) / 2 + 0.05;
      const fr = new THREE.Group();
      fr.add(box(0.96, 0.1, 0.12, M.nickel, 0, 0, -0.66));
      fr.add(box(0.96, 0.1, 0.12, M.nickel, 0, 0, 0.66));
      fr.add(box(0.12, 0.1, 1.44, M.nickel, -0.42, 0, 0));
      fr.add(box(0.12, 0.1, 1.44, M.nickel, 0.42, 0, 0));
      fr.position.set(x, PLATE_T + 0.05, zc);
      coverPivot.add(fr);
    }
    coverPivot.add(xCyl(0.25, -12, 12, M.nickel, 16));
    coverPivot.add(box(3, 0.4, 0.6, M.nickel, 0, PLATE_T + 0.2, cz1 - 0.2));  // finger latch
  }
  part('cover', 'Rotor cover', coverPivot, { offset: new THREE.Vector3(0, 30, -2) }, 1);

  // ---- Rotors ----
  const knurlGeo = new THREE.CylinderGeometry(THUMB_R, THUMB_R, R_THUMB[1] - R_THUMB[0], 96);
  knurlGeo.rotateZ(-Math.PI / 2);
  knurlGeo.translate((R_THUMB[0] + R_THUMB[1]) / 2, 0, 0);
  const rotors = [];
  const rotorSlots = ['left', 'middle', 'right'];
  rotorSlots.forEach((slot, i) => {
    const g = new THREE.Group();
    g.position.set(SLOTS[slot].x, AXIS.y, AXIS.z);
    // Outer (tyre + thumbwheel + notch) turns with the window letter.
    const outer = new THREE.Group();
    const thumb = mesh(knurlGeo, M.knurl);
    thumb.userData.thumb = i;
    pickables.push(thumb);
    outer.add(thumb);
    outer.add(xCyl(TYRE_R, R_TYRE[0], R_TYRE[1], [M.tyre, M.alu, M.alu], 96));
    const notch = box(0.25, 0.3, 0.6, M.brass, R_TYRE[1] + 0.1, 0, 0);
    outer.add(notch);
    g.add(outer);
    // Inner core (wiring) turns with position − ring setting.
    const core = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x151412, roughness: 0.4 });
    core.add(xCyl(BODY_R, R_BODY[0], R_BODY[1], bodyMat, 64));
    core.add(xCyl(1.0, R_THUMB[0] - 0.25, R_BODY[1] + 0.25, M.brass, 24));
    // Contacts: flat plates on the left, spring pins on the right.
    const pinGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.35, 8); pinGeo.rotateZ(Math.PI / 2);
    const padGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.08, 12); padGeo.rotateZ(Math.PI / 2);
    for (let k = 0; k < 26; k++) {
      const b = Math.PI / 2 - k * STEP;
      const y = CONTACT_R * Math.sin(b), z = CONTACT_R * Math.cos(b);
      const pin = mesh(pinGeo, M.brass, { cast: false }); pin.position.set(R_BODY[1] + 0.17, y, z); core.add(pin);
      const pad = mesh(padGeo, M.brass, { cast: false }); pad.position.set(R_THUMB[0] - 0.04, y, z); core.add(pad);
    }
    g.add(core);
    rotors.push({ slot, group: g, outer, core, notch, bodyMat, angle: 0, coreAngle: 0, targetAngle: 0, targetCoreAngle: 0 });
    part('rotor' + i, ['Left', 'Middle', 'Right'][i] + ' rotor', g,
      { offset: new THREE.Vector3([-6, 0, 6][i], 20, 0) }, 5 + i * 0.2);
  });

  // ---- Reflector (UKW) ----
  const ukwG = new THREE.Group();
  ukwG.position.set(SLOTS.ukw.x, AXIS.y, AXIS.z);
  {
    const hw = SLOTS.ukw.hw;
    ukwG.add(xCyl(3.9, -hw, hw, M.paint, 64));
    ukwG.add(xCyl(1.0, -hw - 0.3, hw + 0.2, M.brass, 24));
    const lbl = mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshStandardMaterial({ map: T.labelTexture('UKW B', { w: 256, h: 128, bg: '#1b1b1b', font: 'bold 64px Georgia, serif' }), roughness: 0.6 }));
    lbl.position.set(0, 0.2, 3.95);
    ukwG.add(lbl);
    ukwG.userData.label = lbl;
    const pinGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 8); pinGeo.rotateZ(Math.PI / 2);
    for (let k = 0; k < 26; k++) {
      const b = Math.PI / 2 - k * STEP;
      const pin = mesh(pinGeo, M.brass, { cast: false });
      pin.position.set(hw + 0.15, CONTACT_R * Math.sin(b), CONTACT_R * Math.cos(b));
      ukwG.add(pin);
    }
    // Clamp lever.
    ukwG.add(box(0.4, 5, 0.6, M.nickel, -hw - 0.4, -1.5, 2.8));
  }
  part('ukw', 'Reflector (UKW)', ukwG, { offset: new THREE.Vector3(-11, 20, 0) }, 5.6);

  // ---- Entry wheel (ETW) ----
  const etwG = new THREE.Group();
  etwG.position.set(SLOTS.etw.x, AXIS.y, AXIS.z);
  {
    const hw = SLOTS.etw.hw;
    etwG.add(xCyl(3.9, -hw, hw, M.paint, 64));
    const padGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.08, 12); padGeo.rotateZ(Math.PI / 2);
    for (let k = 0; k < 26; k++) {
      const b = Math.PI / 2 - k * STEP;
      const pad = mesh(padGeo, M.brass, { cast: false });
      pad.position.set(-hw - 0.04, CONTACT_R * Math.sin(b), CONTACT_R * Math.cos(b));
      etwG.add(pad);
    }
    // Wire bundle leaving the ETW.
    for (let k = 0; k < 8; k++) {
      const c = new THREE.CatmullRomCurve3([
        new THREE.Vector3(hw, -1 + k * 0.25, -1 + k * 0.25),
        new THREE.Vector3(hw + 2, -2 - k * 0.2, 0),
        new THREE.Vector3(hw + 2.5, -6.5, 3 + k * 0.3),
      ]);
      etwG.add(mesh(new THREE.TubeGeometry(c, 20, 0.08, 6), M.wire));
    }
  }
  part('etw', 'Entry wheel (ETW)', etwG, { offset: new THREE.Vector3(11, 20, 0) }, 5.4);

  // ---- Spindle & stepping mechanism ----
  const mechG = new THREE.Group();
  {
    const axle = xCyl(0.35, SLOTS.ukw.x - 1.6, SLOTS.etw.x + 1.6, M.steel, 20);
    axle.position.set(0, AXIS.y, AXIS.z);
    mechG.add(axle);
    // Side frames holding the spindle.
    for (const x of [SLOTS.ukw.x - 1.8, SLOTS.etw.x + 1.8]) {
      mechG.add(box(0.4, AXIS.y - 0.8, 3, M.alu, x, (AXIS.y + 0.8) / 2, AXIS.z));
    }
    // Stepping pawls (one per rotor) and the common bail bar.
    for (const s of ['left', 'middle', 'right']) {
      const x = SLOTS[s].x + R_TYRE[1] + 0.2;
      const pawl = box(0.25, 4, 0.4, M.nickel, x, AXIS.y - 4.8, AXIS.z + 3.2);
      pawl.rotation.x = -0.35;
      mechG.add(pawl);
    }
    const bail = xCyl(0.3, -8, 4, M.steel, 12);
    bail.position.set(0, AXIS.y - 6.6, AXIS.z + 4.2);
    mechG.add(bail);
    // Ratchet wheels on the thumbwheel side (26 teeth).
    for (const s of ['left', 'middle', 'right']) {
      const rw = mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.15, 26), M.steel);
      rw.rotation.z = Math.PI / 2;
      rw.position.set(SLOTS[s].x + R_THUMB[0] - 0.2, AXIS.y, AXIS.z);
      mechG.add(rw);
    }
  }
  part('mech', 'Spindle & stepping pawls', mechG, { offset: new THREE.Vector3(0, 8, 0) }, 6);

  // ---- Battery ----
  const batG = new THREE.Group();
  {
    batG.add(box(6.2, 6.5, 2.2, M.battery, 0, 0, 0));
    const lbl = mesh(new THREE.PlaneGeometry(5, 2), new THREE.MeshStandardMaterial({ map: T.labelTexture('4,5 V', { w: 256, h: 100, bg: '#d8c889', fg: '#1d1a12', font: 'bold 64px Georgia, serif' }), roughness: 0.8 }));
    lbl.position.set(0, 0.8, 1.11);
    batG.add(lbl);
    batG.add(box(0.4, 1, 0.1, M.brass, -1.5, 3.7, 0));
    batG.add(box(0.4, 1.6, 0.1, M.brass, 1.5, 4.0, 0));
    batG.add(box(7, 0.4, 3, M.alu, 0, -3.45, 0));
    batG.position.set(11.8, 4.5, AXIS.z);
  }
  part('battery', 'Battery (4.5 V)', batG, { offset: new THREE.Vector3(10, 9, 2) }, 6.2);

  // ---- Wiring harness under the deck ----
  const harnessG = new THREE.Group();
  {
    const r = (() => { let s = 5; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
    for (let i = 0; i < 26; i++) {
      const l = KEY_ROWS.join('')[i];
      const pp = plugPos(l);
      const kp = keyPos(l);
      const c = new THREE.CatmullRomCurve3([
        new THREE.Vector3(pp.x, pp.y, FRONT_Z - 1.4),
        new THREE.Vector3(pp.x * 0.8, 3 + r() * 1.5, 9),
        new THREE.Vector3(kp.x * 0.5, 2.5 + r(), 2),
        new THREE.Vector3(SLOTS.etw.x + 2.5, 2 + r(), AXIS.z + 3),
        new THREE.Vector3(SLOTS.etw.x + 2.5, AXIS.y - 6.5, AXIS.z + 3.5),
      ]);
      harnessG.add(mesh(new THREE.TubeGeometry(c, 40, 0.07, 5), i % 3 ? M.wire : M.cable, { cast: false }));
    }
  }
  part('harness', 'Internal wiring', harnessG, { offset: new THREE.Vector3(0, 2, 0) }, 7);

  // ---- Plugboard ----
  const plugG = new THREE.Group();
  const sockets = new Map();
  let cablesG = new THREE.Group();
  {
    const panelCanvas = document.createElement('canvas');
    panelCanvas.width = 1024; panelCanvas.height = 256;
    const g = panelCanvas.getContext('2d');
    g.fillStyle = '#1a1a1a'; g.fillRect(0, 0, 1024, 256);
    g.fillStyle = '#e6dcc0';
    g.font = 'bold 20px "Courier New", monospace';
    g.textAlign = 'center';
    const PW = 30, PH = 7.5, PY = 5.0;  // panel size and centre
    for (const row of KEY_ROWS) for (const l of row) {
      const p = plugPos(l);
      const u = (p.x + PW / 2) / PW * 1024;
      const v = (PY + PH / 2 - (p.y + 0.95)) / PH * 256;
      g.fillText(l, u, v + 7);
    }
    const panelTex = new THREE.CanvasTexture(panelCanvas);
    panelTex.colorSpace = THREE.SRGBColorSpace;
    const panelMat = new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.7, metalness: 0.1, bumpMap: M.paint.bumpMap, bumpScale: 0.6 });
    const panel = mesh(new THREE.BoxGeometry(PW, PH, 0.4), [M.paint, M.paint, M.paint, M.paint, panelMat, M.paint]);
    panel.position.set(0, PY, FRONT_Z - 0.3);
    plugG.add(panel);
    const holeGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12); holeGeo.rotateX(Math.PI / 2);
    const rimGeo = new THREE.TorusGeometry(0.62, 0.07, 8, 24);
    for (const row of KEY_ROWS) for (const l of row) {
      const p = plugPos(l);
      const s = new THREE.Group();
      s.position.set(p.x, p.y, FRONT_Z - 0.08);
      const rim = mesh(rimGeo, M.nickel); s.add(rim);
      const back = mesh(new THREE.CircleGeometry(0.6, 24), M.bakelite); back.position.z = 0.01; s.add(back);
      for (const dy of [-0.22, 0.22]) { const h = mesh(holeGeo, M.brass); h.position.set(0, dy, 0.03); s.add(h); }
      s.traverse((o) => { if (o.isMesh) { o.userData.socket = l; pickables.push(o); } });
      plugG.add(s);
      sockets.set(l, { group: s, front: new THREE.Vector3(p.x, p.y, FRONT_Z + 1.3) });
    }
    plugG.add(cablesG);
  }
  const plugPart = part('plugboard', 'Plugboard (Steckerbrett)', plugG, { offset: new THREE.Vector3(0, 0, 24) }, 2.5);

  function setPlugboard(pairs) {
    plugG.remove(cablesG);
    cablesG.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); } });
    cablesG = new THREE.Group();
    const plugGeo = new THREE.CylinderGeometry(0.42, 0.46, 1.3, 20); plugGeo.rotateX(Math.PI / 2);
    const gripGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 20); gripGeo.rotateX(Math.PI / 2);
    pairs.forEach(([a, b], idx) => {
      const A = sockets.get(a).front, B = sockets.get(b).front;
      for (const P of [A, B]) {
        const pl = mesh(plugGeo, M.bakelite); pl.position.set(P.x, P.y, P.z - 0.65); cablesG.add(pl);
        const gr = mesh(gripGeo, M.rubber); gr.position.set(P.x, P.y, P.z - 0.2); cablesG.add(gr);
        pl.userData.socket = gr.userData.socket = P === A ? a : b;
      }
      const sag = 2.5 + Math.abs(A.x - B.x) * 0.12 + (idx % 3) * 0.6;
      const curve = new THREE.CatmullRomCurve3([
        A.clone(),
        A.clone().add(new THREE.Vector3(0, -0.6, 1.2)),
        new THREE.Vector3((A.x + B.x) / 2, Math.max(0.5, Math.min(A.y, B.y) - sag), FRONT_Z + 3 + (idx % 4) * 0.4),
        B.clone().add(new THREE.Vector3(0, -0.6, 1.2)),
        B.clone(),
      ]);
      const cab = mesh(new THREE.TubeGeometry(curve, 64, 0.16, 8), M.cable);
      cab.userData.cable = [a, b];
      cablesG.add(cab);
      cablesG.userData[a + b] = curve;
    });
    cablesG.traverse((o) => { if (o.isMesh) o.userData.partId = 'plugboard'; });
    plugG.add(cablesG);
  }

  function cableCurve(a, b) {
    return cablesG.userData[a + b] || cablesG.userData[b + a] || null;
  }

  // ---- Rotor state → angles ----
  // Tyre shows letter `pos` in the window; core is offset by the ring setting.
  function tyreAngle(pos) { return -((pos + 0.5) * STEP) - Math.PI / 2; }
  function setRotorState(i, pos, ring, instant = false) {
    const r = rotors[i];
    const t = tyreAngle(pos);
    // Keep angles continuous so the wheel always turns the short way.
    const unwrap = (cur, target) => cur + ((((target - cur) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
    r.targetAngle = unwrap(r.targetAngle, t);
    r.targetCoreAngle = unwrap(r.targetCoreAngle, -(pos - ring) * STEP);
    if (instant) { r.angle = r.targetAngle; r.coreAngle = r.targetCoreAngle; }
  }

  function setRotorTypes(names, notches, reflector) {
    names.forEach((n, i) => {
      const r = rotors[i];
      // Label the rotor body with its Roman numeral.
      const c = document.createElement('canvas'); c.width = 512; c.height = 64;
      const g = c.getContext('2d');
      g.fillStyle = '#151412'; g.fillRect(0, 0, 512, 64);
      g.fillStyle = '#d9cfb2'; g.font = 'bold 40px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let k = 0; k < 4; k++) g.fillText(n, 64 + k * 128, 34);
      if (r.bodyMat.map) r.bodyMat.map.dispose();
      r.bodyMat.map = new THREE.CanvasTexture(c);
      r.bodyMat.map.colorSpace = THREE.SRGBColorSpace;
      r.bodyMat.color.set(0xffffff);
      r.bodyMat.needsUpdate = true;
      // Notch tab sits on the tyre at the notch letter.
      const b = (notches[i] + 0.5) * STEP;
      r.notch.position.set(R_TYRE[1] + 0.12, (TYRE_R - 0.05) * -Math.sin(b), (TYRE_R - 0.05) * Math.cos(b));
      r.notch.rotation.x = -b;
    });
    const lbl = ukwG.userData.label;
    lbl.material.map.dispose();
    lbl.material.map = T.labelTexture('UKW ' + reflector, { w: 256, h: 128, bg: '#1b1b1b', font: 'bold 64px Georgia, serif' });
    lbl.material.needsUpdate = true;
  }

  // X positions of the faces the signal crosses, used by the path visualiser.
  const faces = {
    etwOuter: SLOTS.etw.x + SLOTS.etw.hw,
    etwInner: SLOTS.etw.x - SLOTS.etw.hw,
    rightR: SLOTS.right.x + R_BODY[1], rightL: SLOTS.right.x + R_THUMB[0],
    middleR: SLOTS.middle.x + R_BODY[1], middleL: SLOTS.middle.x + R_THUMB[0],
    leftR: SLOTS.left.x + R_BODY[1], leftL: SLOTS.left.x + R_THUMB[0],
    ukwR: SLOTS.ukw.x + SLOTS.ukw.hw, ukwMid: SLOTS.ukw.x - 0.3,
  };

  return {
    root, parts, pickables, keys, lamps, rotors, sockets, faces,
    lidPart, plugPart, lidPivot, coverPivot,
    setPlugboard, cableCurve, setRotorState, setRotorTypes,
    keyPos, lampPos, plugPos,
    materials: M,
    deckY: DECK_Y, topY: TOP_Y, box: BOX, axis: AXIS,
  };
}
