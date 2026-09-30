import test from 'node:test';
import assert from 'node:assert/strict';
import { Enigma, parsePlugboard, toIndex } from '../js/enigma.js';

const pos = (s) => [...s].map(toIndex);

test('textbook vector: I-II-III, UKW-B, rings AAA, start AAA', () => {
  const m = new Enigma({ rotors: ['I', 'II', 'III'], reflector: 'B' });
  assert.equal(m.encrypt('AAAAA'), 'BDZGO');
});

test('encryption is reciprocal', () => {
  const cfg = { rotors: ['IV', 'II', 'V'], reflector: 'C', rings: pos('GMY'), positions: pos('DHO'), plugboard: 'DN GR IS KC QX TM PV HY FW BJ' };
  const plain = 'THEQUICKBROWNFOXJUMPSOVERTHELAZYDOG';
  const cipher = new Enigma(cfg).encrypt(plain);
  assert.notEqual(cipher, plain);
  assert.equal(new Enigma(cfg).encrypt(cipher), plain);
});

test('no letter ever encrypts to itself', () => {
  const m = new Enigma({ plugboard: 'AB CD EF' });
  for (let i = 0; i < 2000; i++) {
    const ch = String.fromCharCode(65 + (i % 26));
    assert.notEqual(m.press(ch).output, ch);
  }
});

test('double step: ADU -> ADV -> AEW -> BFX', () => {
  const m = new Enigma({ rotors: ['I', 'II', 'III'], positions: pos('ADU') });
  const seen = [];
  for (let i = 0; i < 3; i++) { m.step(); seen.push(m.windowLetters); }
  assert.deepEqual(seen, ['ADV', 'AEW', 'BFX']);
});

test('ring settings: rings BBB, start AAA gives EWTYX', () => {
  const m = new Enigma({ rings: pos('BBB') });
  assert.equal(m.encrypt('AAAAA'), 'EWTYX');
});

test('known message (Operation Barbarossa style settings)', () => {
  // Rotors II IV V, UKW-B, rings BUL, plugboard AV BS CG DL FU HZ IN KM OW RX, start BLA
  const m = new Enigma({ rotors: ['II', 'IV', 'V'], reflector: 'B', rings: pos('BUL'), positions: pos('BLA'), plugboard: 'AV BS CG DL FU HZ IN KM OW RX' });
  assert.equal(m.encrypt('EDPUDNRGYSZRCXNUYTPOMRMBOFKTBZREZKMLXLVEFGUEYSIOZVEQMIKUBPMMYLKLTTDEISMDICAGYKUACTCDOMOHWXMUUIAUBSTSLRNBZSZWNRFXWFYSSXJZVIJHIDISHPRKLKAYUPADTXQSPINQMATLPIFSVKDASCTACDPBOPVHJK'),
    'AUFKLXABTEILUNGXVONXKURTINOWAXKURTINOWAXNORDWESTLXSEBEZXSEBEZXUAFFLIEGERSTRASZERIQTUNGXDUBROWKIXDUBROWKIXOPOTSCHKAXOPOTSCHKAXUMXEINSAQTDREINULLXUHRANGETRETENXANGRIFFXINFXRGTX');
});

test('plugboard validation', () => {
  assert.throws(() => parsePlugboard('AB AC'));
  assert.throws(() => parsePlugboard('AA'));
  assert.throws(() => parsePlugboard('ABC'));
  const t = parsePlugboard('az');
  assert.equal(t[0], 25);
  assert.equal(t[25], 0);
});

test('all wirings are permutations; reflectors are involutions without fixed points', async () => {
  const { ROTORS, REFLECTORS, ALPHABET } = await import('../js/enigma.js');
  for (const { wiring } of Object.values(ROTORS)) assert.equal([...wiring].sort().join(''), ALPHABET);
  for (const w of Object.values(REFLECTORS)) {
    assert.equal([...w].sort().join(''), ALPHABET);
    [...w].forEach((ch, i) => {
      assert.notEqual(toIndex(ch), i);
      assert.equal(toIndex(w[toIndex(ch)]), i);
    });
  }
});
