// Flat wiring diagram of the current signal path (SVG), drawn in the side panel.
import { ALPHABET } from './enigma.js';

const NS = 'http://www.w3.org/2000/svg';
const ROW = 13;
const TOP = 34;
const W = 340;
// Boundaries (x) between the stages, right to left like the real machine.
const B = { key: 318, plug: 262, etw: 216, rm: 166, ml: 116, lu: 66, ukw: 26 };
const COLS = [
  { id: 'ukw', label: 'UKW', x0: B.ukw - 10, x1: B.lu },
  { id: 'left', label: 'L', x0: B.lu, x1: B.ml },
  { id: 'middle', label: 'M', x0: B.ml, x1: B.rm },
  { id: 'right', label: 'R', x0: B.rm, x1: B.etw },
  { id: 'etw', label: 'ETW', x0: B.etw, x1: B.plug - 16 },
  { id: 'plug', label: 'Plug', x0: B.plug - 16, x1: B.plug + 18 },
];

function el(name, attrs = {}, text) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
}

const y = (i) => TOP + i * ROW + ROW / 2;

export function createDiagram(container) {
  const svg = el('svg', { viewBox: `0 0 ${W} ${TOP + 26 * ROW + 8}`, class: 'wiring', role: 'img', 'aria-label': 'Signal path through the Enigma' });
  container.appendChild(svg);
  const labelEls = [];

  // Static background.
  const bg = el('g');
  for (const c of COLS) {
    bg.appendChild(el('rect', { x: c.x0 + 2, y: TOP - 4, width: c.x1 - c.x0 - 4, height: 26 * ROW + 8, rx: 5, class: 'col-bg' }));
    const t = el('text', { x: (c.x0 + c.x1) / 2, y: 13, class: 'col-label' }, c.label);
    bg.appendChild(t);
    labelEls.push({ id: c.id, t });
  }
  const sub = el('text', { x: (B.key + B.plug + 18) / 2 + 4, y: 13, class: 'col-label' }, 'Key');
  bg.appendChild(sub);
  for (const bx of [B.lu, B.ml, B.rm, B.etw]) {
    for (let i = 0; i < 26; i++) bg.appendChild(el('circle', { cx: bx, cy: y(i), r: 1.4, class: 'pin' }));
  }
  for (let i = 0; i < 26; i++) {
    bg.appendChild(el('text', { x: B.key + 4, y: y(i) + 4, class: 'row-letter', 'data-i': i }, ALPHABET[i]));
  }
  svg.appendChild(bg);

  const winText = el('text', { x: W / 2, y: 27, class: 'win-label' }, '');
  svg.appendChild(winText);

  const dyn = el('g');
  svg.appendChild(dyn);

  function update(trace, state) {
    dyn.replaceChildren();
    svg.querySelectorAll('.row-letter').forEach((t) => t.classList.remove('in', 'out'));
    if (state) {
      labelEls.find((l) => l.id === 'left').t.textContent = `L ${state.rotors[0]}`;
      labelEls.find((l) => l.id === 'middle').t.textContent = `M ${state.rotors[1]}`;
      labelEls.find((l) => l.id === 'right').t.textContent = `R ${state.rotors[2]}`;
      labelEls.find((l) => l.id === 'ukw').t.textContent = `UKW ${state.reflector}`;
      winText.textContent = `windows ${state.windows}`;
    }
    if (!trace) return;
    const p = Object.fromEntries(trace.path.map((s) => [s.stage, s.index]));
    const fwd = [
      [B.key, p.key], [B.plug, p.key], [B.plug - 16, p.plugIn], [B.etw, p.etwIn],
      [B.rm, p.rightFwd], [B.ml, p.middleFwd], [B.lu, p.leftFwd], [B.ukw, p.leftFwd],
    ];
    const back = [
      [B.ukw, p.reflector], [B.lu, p.reflector], [B.ml, p.leftBack], [B.rm, p.middleBack],
      [B.etw, p.rightBack], [B.plug - 16, p.etwOut], [B.plug, p.plugOut], [B.key, p.plugOut],
    ];
    const pts = (arr) => arr.map(([x, i]) => `${x},${y(i)}`).join(' ');
    dyn.appendChild(el('polyline', { points: pts(fwd), class: 'path fwd' }));
    dyn.appendChild(el('path', { d: `M${B.ukw},${y(p.leftFwd)} C${B.ukw - 16},${y(p.leftFwd)} ${B.ukw - 16},${y(p.reflector)} ${B.ukw},${y(p.reflector)}`, class: 'path ukw' }));
    dyn.appendChild(el('polyline', { points: pts(back), class: 'path back' }));
    // Letters at each boundary crossing.
    const marks = [
      [B.etw, p.etwIn, 'fwd'], [B.rm, p.rightFwd, 'fwd'], [B.ml, p.middleFwd, 'fwd'], [B.lu, p.leftFwd, 'fwd'],
      [B.lu, p.reflector, 'back'], [B.ml, p.leftBack, 'back'], [B.rm, p.middleBack, 'back'], [B.etw, p.rightBack, 'back'],
    ];
    for (const [x, i, cls] of marks) {
      dyn.appendChild(el('circle', { cx: x, cy: y(i), r: 5.2, class: `node ${cls}` }));
      dyn.appendChild(el('text', { x, y: y(i) + 3, class: 'node-letter' }, ALPHABET[i]));
    }
    svg.querySelector(`.row-letter[data-i="${p.key}"]`).classList.add('in');
    svg.querySelector(`.row-letter[data-i="${p.plugOut}"]`).classList.add('out');
  }

  return { update };
}

const STAGE_TEXT = {
  key: (s) => `Key <b>${s.letter}</b> pressed. The rotors step first, then current flows.`,
  plugIn: (s, prev) => s.detail === 'swapped by cable' ? `Plugboard cable swaps <b>${prev.letter}→${s.letter}</b>` : `Plugboard: no cable on ${s.letter}, passes straight through`,
  etwIn: (s) => `Entry wheel (straight wiring): contact <b>${s.letter}</b>`,
  rightFwd: (s, prev) => `Right rotor: <b>${prev.letter}→${s.letter}</b>`,
  middleFwd: (s, prev) => `Middle rotor: <b>${prev.letter}→${s.letter}</b>`,
  leftFwd: (s, prev) => `Left rotor: <b>${prev.letter}→${s.letter}</b>`,
  reflector: (s, prev) => `Reflector bounces <b>${prev.letter}→${s.letter}</b>`,
  leftBack: (s, prev) => `Left rotor (reverse): <b>${prev.letter}→${s.letter}</b>`,
  middleBack: (s, prev) => `Middle rotor (reverse): <b>${prev.letter}→${s.letter}</b>`,
  rightBack: (s, prev) => `Right rotor (reverse): <b>${prev.letter}→${s.letter}</b>`,
  etwOut: (s) => `Entry wheel: contact <b>${s.letter}</b>`,
  plugOut: (s, prev) => s.detail === 'swapped by cable' ? `Plugboard cable swaps <b>${prev.letter}→${s.letter}</b>` : `Plugboard: no cable, stays <b>${s.letter}</b>`,
  lamp: (s) => `Lamp <b>${s.letter}</b> lights up`,
};

export function describeTrace(trace) {
  return trace.path.map((s, i) => STAGE_TEXT[s.stage](s, trace.path[i - 1] || s));
}
