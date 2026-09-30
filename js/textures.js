// Procedural canvas textures so the model needs no image assets.
import * as THREE from 'three';

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

// Small deterministic PRNG so textures look identical on every load.
function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function tex(c, { repeat = [1, 1], srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Oak-like wood grain for the case: returns { map, roughnessMap, bumpMap }. */
export function woodTextures() {
  const W = 1024, H = 512;
  const [c, g] = canvas(W, H);
  const [rc, rg] = canvas(W, H);
  const r = rng(7);
  g.fillStyle = '#6b4526';
  g.fillRect(0, 0, W, H);
  rg.fillStyle = '#9a9a9a';
  rg.fillRect(0, 0, W, H);
  // Long wavy grain lines.
  for (let i = 0; i < 260; i++) {
    const y0 = r() * H;
    const amp = 2 + r() * 10;
    const freq = 0.002 + r() * 0.01;
    const phase = r() * 10;
    const dark = r() < 0.55;
    const alpha = 0.05 + r() * 0.2;
    g.strokeStyle = dark ? `rgba(40,22,10,${alpha})` : `rgba(170,120,70,${alpha * 0.7})`;
    rg.strokeStyle = dark ? `rgba(200,200,200,${alpha})` : `rgba(90,90,90,${alpha})`;
    g.lineWidth = rg.lineWidth = 0.5 + r() * 2.5;
    g.beginPath(); rg.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const y = y0 + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 3.1) * amp * 0.3;
      if (x === 0) { g.moveTo(x, y); rg.moveTo(x, y); } else { g.lineTo(x, y); rg.lineTo(x, y); }
    }
    g.stroke(); rg.stroke();
  }
  // Pores / flecks.
  for (let i = 0; i < 5000; i++) {
    g.fillStyle = `rgba(30,15,5,${r() * 0.25})`;
    g.fillRect(r() * W, r() * H, 1 + r() * 3, 1);
  }
  return {
    map: tex(c, { repeat: [1, 1] }),
    roughnessMap: tex(rc, { srgb: false }),
    bumpMap: tex(rc, { srgb: false }),
  };
}

/** Wrinkle / crackle finish typical of Enigma black paint. */
export function crackleTextures() {
  const S = 512;
  const [c, g] = canvas(S);
  const r = rng(11);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) {
    const v = Math.floor(90 + r() * 90);
    g.fillStyle = `rgba(${v},${v},${v},0.5)`;
    const x = r() * S, y = r() * S, rad = 1 + r() * 4;
    g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 600; i++) {
    g.strokeStyle = `rgba(20,20,20,${0.2 + r() * 0.3})`;
    g.lineWidth = 0.6;
    g.beginPath();
    let x = r() * S, y = r() * S;
    g.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 14; y += (r() - 0.5) * 14; g.lineTo(x, y); }
    g.stroke();
  }
  const t = tex(c, { repeat: [3, 3], srgb: false });
  return { bumpMap: t, roughnessMap: t };
}

/** Faint brushed-metal streaks. */
export function brushedTexture() {
  const [c, g] = canvas(256, 256);
  const r = rng(3);
  g.fillStyle = '#9c9c9c';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1200; i++) {
    const v = Math.floor(120 + r() * 80);
    g.fillStyle = `rgba(${v},${v},${v},0.35)`;
    g.fillRect(0, r() * 256, 256, 0.6 + r());
  }
  return tex(c, { repeat: [2, 2], srgb: false });
}

const letterCache = new Map();

/** White letter on dark background – used for key caps. */
export function keyCapTexture(letter) {
  const k = 'key' + letter;
  if (letterCache.has(k)) return letterCache.get(k);
  const [c, g] = canvas(128);
  const grad = g.createRadialGradient(64, 58, 10, 64, 64, 64);
  grad.addColorStop(0, '#2b2b2b');
  grad.addColorStop(1, '#0d0d0d');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#f1ead8';
  g.font = 'bold 72px "Courier New", monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(letter, 64, 68);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  letterCache.set(k, t);
  return t;
}

/** Lamp window: letter stencilled on frosted glass. */
export function lampTexture(letter) {
  const k = 'lamp' + letter;
  if (letterCache.has(k)) return letterCache.get(k);
  const [c, g] = canvas(128);
  g.fillStyle = '#d8d2bf';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#1b1a17';
  g.font = 'bold 76px "Courier New", monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(letter, 64, 70);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  letterCache.set(k, t);
  return t;
}

/**
 * Alphabet tyre wrapped around a rotor. Letters run around the U axis,
 * index i centred at u = (i + 0.5) / 26.
 */
export function alphabetRingTexture() {
  const W = 26 * 64, H = 96;
  const [c, g] = canvas(W, H);
  g.fillStyle = '#e8e0c8';
  g.fillRect(0, 0, W, H);
  g.font = 'bold 50px "Courier New", monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < 26; i++) {
    const cx = i * 64 + 32;
    g.save();
    g.translate(cx, H / 2);
    g.rotate(-Math.PI / 2);
    g.fillStyle = '#111';
    g.fillText(String.fromCharCode(65 + i), 0, 2);
    g.restore();
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(i * 64, 0, 1.5, H);
  }
  const t = tex(c);
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Serrated thumbwheel grip. */
export function knurlTexture() {
  const [c, g] = canvas(1024, 32);
  g.fillStyle = '#444';
  g.fillRect(0, 0, 1024, 32);
  for (let i = 0; i < 128; i++) {
    const x = i * 8;
    const grad = g.createLinearGradient(x, 0, x + 8, 0);
    grad.addColorStop(0, '#222');
    grad.addColorStop(0.5, '#ddd');
    grad.addColorStop(1, '#222');
    g.fillStyle = grad;
    g.fillRect(x, 0, 8, 32);
  }
  const t = tex(c, { srgb: false });
  return t;
}

/** Small label plate text, e.g. the plugboard legend. */
export function labelTexture(text, { w = 512, h = 64, bg = '#141414', fg = '#e8e0c8', font = 'bold 40px Georgia, serif' } = {}) {
  const [c, g] = canvas(w, h);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Soft radial glow sprite. */
export function glowTexture() {
  const [c, g] = canvas(128);
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,240,190,1)');
  grad.addColorStop(0.3, 'rgba(255,200,90,0.6)');
  grad.addColorStop(1, 'rgba(255,160,40,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
