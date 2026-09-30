// Enigma I cipher engine.
// Pure logic, no DOM or 3D, so it can be unit-tested in Node and reused by the UI.
// Historically accurate wirings, notches, ring settings, plugboard and the
// middle-rotor "double step" anomaly.

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const ROTORS = {
  I:   { wiring: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', notch: 'Q' },
  II:  { wiring: 'AJDKSIRUXBLHWTMCQGZNPYFVOE', notch: 'E' },
  III: { wiring: 'BDFHJLCPRTXVZNYEIWGAKMUSQO', notch: 'V' },
  IV:  { wiring: 'ESOVPZJAYQUIRHXLNFTGKDCMWB', notch: 'J' },
  V:   { wiring: 'VZBRGITYUPSDNHLXAWMJQOFECK', notch: 'Z' },
};

export const REFLECTORS = {
  A: 'EJMZALYXVBWFCRQUONTSPIKHGD',
  B: 'YRUHQSLDPXNGOKMIEBFZCWVJAT',
  C: 'FVPJIAOYEDRZXWGCTKUQSBNMHL',
};

const mod = (n, m = 26) => ((n % m) + m) % m;
export const toIndex = (ch) => ALPHABET.indexOf(ch.toUpperCase());
export const toLetter = (i) => ALPHABET[mod(i)];

/** Parse "AB CD EF" into a 26-entry swap table. Throws on invalid input. */
export function parsePlugboard(spec = '') {
  const table = [...Array(26).keys()];
  const pairs = spec.toUpperCase().split(/[^A-Z]+/).filter(Boolean);
  const used = new Set();
  for (const p of pairs) {
    if (p.length !== 2) throw new Error(`Plugboard pair "${p}" must be exactly two letters`);
    const [a, b] = [toIndex(p[0]), toIndex(p[1])];
    if (a === b) throw new Error(`Cannot plug ${p[0]} into itself`);
    if (used.has(a) || used.has(b)) throw new Error(`Letter used twice in plugboard: ${p}`);
    used.add(a); used.add(b);
    table[a] = b; table[b] = a;
  }
  if (pairs.length > 13) throw new Error('At most 13 plugboard cables');
  return table;
}

export function plugboardPairs(table) {
  const out = [];
  table.forEach((b, a) => { if (a < b) out.push(toLetter(a) + toLetter(b)); });
  return out;
}

class Rotor {
  constructor(name, ring = 0, position = 0) {
    const def = ROTORS[name];
    if (!def) throw new Error(`Unknown rotor ${name}`);
    this.name = name;
    this.forwardMap = [...def.wiring].map(toIndex);
    this.backwardMap = Array(26);
    this.forwardMap.forEach((o, i) => { this.backwardMap[o] = i; });
    this.notch = toIndex(def.notch);
    this.ring = ring;
    this.position = position;
  }
  atNotch() { return this.position === this.notch; }
  // `contact` is an absolute contact position relative to the machine body.
  forward(contact) {
    const shift = this.position - this.ring;
    return mod(this.forwardMap[mod(contact + shift)] - shift);
  }
  backward(contact) {
    const shift = this.position - this.ring;
    return mod(this.backwardMap[mod(contact + shift)] - shift);
  }
}

export class Enigma {
  /**
   * @param {object} cfg
   * @param {string[]} cfg.rotors     left→right, e.g. ['I','II','III']
   * @param {string}   cfg.reflector  'A' | 'B' | 'C'
   * @param {number[]} cfg.rings      Ringstellung, 0-based, left→right
   * @param {number[]} cfg.positions  Grundstellung, 0-based, left→right
   * @param {string}   cfg.plugboard  "AB CD ..."
   */
  constructor(cfg = {}) {
    this.configure({
      rotors: ['I', 'II', 'III'],
      reflector: 'B',
      rings: [0, 0, 0],
      positions: [0, 0, 0],
      plugboard: '',
      ...cfg,
    });
  }

  configure(cfg) {
    const names = cfg.rotors;
    if (new Set(names).size !== 3) throw new Error('Each rotor can only be used once');
    this.rotors = names.map((n, i) => new Rotor(n, cfg.rings[i], cfg.positions[i]));
    this.reflectorName = cfg.reflector;
    this.reflector = [...REFLECTORS[cfg.reflector]].map(toIndex);
    this.plugboard = parsePlugboard(cfg.plugboard);
  }

  get positions() { return this.rotors.map((r) => r.position); }
  set positions(p) { p.forEach((v, i) => { this.rotors[i].position = mod(v); }); }
  get rings() { return this.rotors.map((r) => r.ring); }
  get windowLetters() { return this.rotors.map((r) => toLetter(r.position)).join(''); }

  setPlugboardTable(table) { this.plugboard = table.slice(); }

  /** Advance rotors as a key press does. Returns which rotors moved (L,M,R). */
  step() {
    const [L, M, R] = this.rotors;
    const moved = [false, false, true];
    // Double step: if the middle rotor sits on its notch it steps itself
    // AND the left rotor on this key press.
    if (M.atNotch()) {
      M.position = mod(M.position + 1);
      L.position = mod(L.position + 1);
      moved[0] = moved[1] = true;
    } else if (R.atNotch()) {
      M.position = mod(M.position + 1);
      moved[1] = true;
    }
    R.position = mod(R.position + 1);
    return moved;
  }

  /**
   * Pass a signal through the machine without stepping.
   * Returns the full path so the UI can visualise every stage.
   */
  trace(letter) {
    const [L, M, R] = this.rotors;
    const k = toIndex(letter);
    const path = [];
    const add = (stage, index, detail) => path.push({ stage, index, letter: toLetter(index), detail });

    add('key', k);
    let c = this.plugboard[k];                  add('plugIn', c, this.plugboard[k] !== k ? 'swapped by cable' : 'no cable');
    add('etwIn', c);
    c = R.forward(c);                           add('rightFwd', c);
    c = M.forward(c);                           add('middleFwd', c);
    c = L.forward(c);                           add('leftFwd', c);
    c = this.reflector[c];                      add('reflector', c);
    c = L.backward(c);                          add('leftBack', c);
    c = M.backward(c);                          add('middleBack', c);
    c = R.backward(c);                          add('rightBack', c);
    add('etwOut', c);
    const out = this.plugboard[c];              add('plugOut', out, out !== c ? 'swapped by cable' : 'no cable');
    add('lamp', out);
    return { input: toLetter(k), output: toLetter(out), path };
  }

  /** Press one key: step the rotors, then encipher. */
  press(letter) {
    const moved = this.step();
    const result = this.trace(letter);
    return { ...result, moved, positions: this.positions };
  }

  /** Encipher a whole string (non-letters are dropped). */
  encrypt(text) {
    return [...text.toUpperCase()].filter((ch) => toIndex(ch) >= 0).map((ch) => this.press(ch).output).join('');
  }
}
