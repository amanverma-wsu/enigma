// Educational content: descriptions for every part and a guided lesson series.

export const PART_INFO = {
  case: {
    title: 'Wooden case',
    text: 'The Enigma I lived in an oak box of about 34 × 28 × 15 cm and weighed about 12 kg. Everything electrical sits inside it, so the machine could be carried and used in the field.',
  },
  lid: {
    title: 'Lid',
    text: 'The hinged lid protected the machine in transport. Inside it was a spare-parts compartment holding bulbs and filter screens, often with a small instruction card.',
  },
  keys: {
    title: 'Keyboard',
    text: 'There are 26 keys in the German QWERTZ order: QWERTZUIO / ASDFGHJK / PYXCVBNML. There are no digits, spaces or punctuation: numbers were spelled out and X was used as a full stop. Pressing a key does two things. It mechanically steps the rotors, and then it closes a switch that sends current from the battery into the cipher circuit.',
  },
  deck: {
    title: 'Keyboard deck & key levers',
    text: 'Each key sits on a long lever. Its first few millimetres of travel push a common bail bar that drives the stepping pawls, so the rotors always move before the circuit closes. That is why the first letter you type is already enciphered with the rotors one step past the start position.',
  },
  lampPanel: {
    title: 'Lampboard',
    text: 'There are 26 small windows arranged like the keyboard. When a key is held down, exactly one lamp lights to show the enciphered letter. The operator read the lamps while a second person wrote the letters down.',
  },
  bulbs: {
    title: 'Lamps',
    text: 'These are small 3.5 V bulbs under the lampboard windows. Because of the reflector, the current path always returns to a different letter, so the lamp that lights is never the key you pressed.',
  },
  cover: {
    title: 'Rotor cover',
    text: 'This hinged inner lid covers the rotors. Only three small windows show one letter of each rotor, and three slots let the thumbwheels stick out so the operator could set the start position without opening the cover.',
  },
  rotor0: {
    title: 'Left (slow) rotor',
    text: 'This rotor moves least often. It only steps when the middle rotor passes its notch, about once every 650 key presses.',
  },
  rotor1: {
    title: 'Middle rotor',
    text: 'This rotor steps once every 26 key presses, when the right rotor passes its notch. It also has the famous double-step quirk: when it reaches its own notch, it steps again on the very next key press and takes the left rotor with it.',
  },
  rotor2: {
    title: 'Right (fast) rotor',
    text: 'This rotor steps on every key press, so even pressing the same key twice gives different letters. Each rotor is a disc with 26 contacts per side, cross-wired inside, so it is a fixed scramble (a permutation) that changes as the disc turns.',
  },
  ukw: {
    title: 'Reflector (Umkehrwalze, UKW)',
    text: 'The reflector pairs up the 26 contacts with 13 wires, so the current is sent back through the rotors by a different route. This makes the machine self-reciprocal: with the same settings, enciphering the ciphertext gives back the plaintext. It also means no letter can ever encrypt to itself. That flaw was a key weakness that codebreakers exploited.',
  },
  etw: {
    title: 'Entry wheel (Eintrittswalze, ETW)',
    text: 'The fixed wheel between the plugboard wiring and the rotors. On the military Enigma I its wiring is straight through (A→A, B→B…). The commercial machines scrambled it in keyboard order, and the Polish codebreakers had to guess this.',
  },
  mech: {
    title: 'Spindle & stepping mechanism',
    text: 'The rotors sit on a common spindle. Three spring-loaded pawls rest against the ratchets and notch rings. On every key press they push forward. The right pawl always catches, while the middle and left pawls only catch when they fall into a notch.',
  },
  battery: {
    title: 'Battery',
    text: 'A 4.5 V flat battery powers the lamps. Some machines could also run from an external 4 V supply.',
  },
  harness: {
    title: 'Internal wiring',
    text: 'Wires run from every key switch to the plugboard, then to the entry wheel, and back again to the lamps. Each key switch is a changeover contact: at rest it connects its wire to the lamp, and when pressed it connects to the battery. That is why a pressed key can never light its own lamp.',
  },
  plugboard: {
    title: 'Plugboard (Steckerbrett)',
    text: 'Double-ended cables swap pairs of letters before the signal enters the rotors and again after it comes back. The Wehrmacht normally used 10 cables. The plugboard alone adds about 150 trillion possible settings, which made Enigma far harder to break than the commercial version.',
  },
};

// Each lesson can point the camera at a part and trigger a machine action.
export const LESSONS = [
  {
    title: '1 · What is Enigma?',
    view: 'overview',
    body: `<p>Enigma is an <b>electro-mechanical rotor cipher machine</b>. German forces used it from the late 1920s through WWII. This model is the <b>Enigma I</b> (Wehrmacht/Luftwaffe) with 5 rotors to choose from and reflector B.</p>
<p>It is really just a <b>battery, 26 keys, 26 lamps and a maze of wires</b>. Pressing a key sends current through the maze and one lamp lights. The trick is that the maze <b>changes after every key press</b>.</p>
<p class="tip">Try it now: type on your keyboard (or click the keys) and watch a lamp light up.</p>`,
  },
  {
    title: '2 · Keyboard and lamps',
    view: 'keyboard',
    focus: 'keys',
    body: `<p>The operator types the plaintext one letter at a time and reads the ciphertext from the <b>lampboard</b>. There is no printer. A second operator wrote each lit letter down.</p>
<p>A key press is <b>mechanical first, electrical second</b>. The lever steps the rotors, and only then does its contact close the circuit.</p>`,
  },
  {
    title: '3 · The plugboard',
    view: 'plugboard',
    focus: 'plugboard',
    body: `<p>Before and after the rotors, the signal passes through the <b>Steckerbrett</b>. Each cable swaps two letters, for example <code>A↔M</code>. An unplugged letter passes straight through.</p>
<p>Click one socket on the front panel, then another, to connect a cable. Click a plugged socket to remove its cable.</p>
<p>With 10 cables there are <b>150,738,274,937,250</b> ways to wire the board.</p>`,
  },
  {
    title: '4 · Inside a rotor',
    view: 'rotors',
    action: 'openCover',
    focus: 'rotor2',
    body: `<p>Each rotor has 26 contacts on each side. Inside, <b>26 wires cross-connect them</b> in a fixed, secret pattern. For rotor I, A→E, B→K, C→M and so on.</p>
<p>The <b>alphabet ring</b> (the letters you see in the window) can be turned relative to the wiring core. This is the <b>ring setting (Ringstellung)</b>. It changes where the notch sits compared to the wiring.</p>
<p>Three rotors are chosen from five and placed in any order: 5 × 4 × 3 = <b>60 rotor orders</b>.</p>`,
  },
  {
    title: '5 · Stepping and the double step',
    view: 'rotors',
    action: 'openCover',
    focus: 'mech',
    body: `<p>Like an odometer, the <b>right rotor steps on every key</b>. When its notch passes the window, it pushes the middle rotor one step. When the middle rotor's notch passes, it pushes the left rotor.</p>
<p><b>The double step:</b> the pawl that moves the left rotor pushes on the <i>middle</i> rotor's notch, so the middle rotor moves as well. The result is that the middle rotor steps twice in a row.</p>
<p class="tip">Set the positions to <code>A D U</code> with rotors I-II-III and press a key 3 times. The windows go <code>ADV → AEW → BFX</code>.</p>`,
  },
  {
    title: '6 · The reflector',
    view: 'xray',
    action: 'trace',
    focus: 'ukw',
    body: `<p>After the left rotor, the current hits the <b>reflector (UKW)</b>, which sends it back through all three rotors on a different path. So the signal crosses <b>9 scramblers</b>: plugboard, 3 rotors, reflector, 3 rotors, plugboard.</p>
<p>Two consequences:</p>
<ul><li><b>Reciprocal:</b> if A→Q then Q→A at that position. The same settings decrypt what they encrypted.</li>
<li><b>No letter maps to itself.</b> Codebreakers used this to rule out positions for guessed plaintext (a "crib").</li></ul>
<p class="tip">Open the <b>Signal</b> tab to follow the current, then press any key.</p>`,
  },
  {
    title: '7 · The daily key',
    view: 'overview',
    body: `<p>Both stations needed identical settings, which were printed on a monthly key sheet:</p>
<ol><li><b>Walzenlage</b> is the rotor order, e.g. II IV V</li>
<li><b>Ringstellung</b> is the ring settings, e.g. B U L</li>
<li><b>Steckerverbindungen</b> is the plugboard pairs, e.g. AV BS CG DL…</li>
<li><b>Grundstellung</b> is the start positions, later chosen per message.</li></ol>
<p>The total key space is about <b>1.59 × 10<sup>20</sup></b> (≈ 67 bits).</p>
<p class="tip">Load the <b>1941 Barbarossa message</b> preset in the Machine tab and type the ciphertext to decrypt a real wartime message.</p>`,
  },
  {
    title: '8 · How it was broken',
    view: 'overview',
    body: `<p><b>Poland, 1932:</b> Marian Rejewski used group theory and the repeated message key procedure to reconstruct the rotor wirings. With Różycki and Zygalski he built the <i>bomba</i> and the perforated sheets.</p>
<p><b>Bletchley Park:</b> Alan Turing and Gordon Welchman designed the <b>Bombe</b>. It tested rotor settings against a <b>crib</b>, a guessed piece of plaintext such as <code>WETTERVORHERSAGE</code> (weather forecast). The rule that no letter encrypts to itself showed where a crib could and could not sit.</p>
<p>Operator mistakes made it easier: predictable phrases, lazy message keys like <code>AAA</code>, and resending the same text under different keys.</p>
<p class="tip">Enigma was not broken because the maths was weak. It was broken because of procedure, cribs and flaws like the reflector.</p>`,
  },
  {
    title: '9 · Take it apart',
    view: 'inside',
    action: 'explode',
    body: `<p>Use <b>Dismantle</b> (or the slider) to pull the machine apart layer by layer. Click any part to learn what it does.</p>
<p>The disassembly order is how a technician would go: lid, rotor cover, lampboard, keyboard, plugboard, then the rotor pack, reflector and entry wheel, and finally the stepping gear and wiring.</p>`,
  },
];

export const PRESETS = {
  textbook: {
    label: 'Textbook: I-II-III, B, AAA',
    cfg: { rotors: ['I', 'II', 'III'], reflector: 'B', rings: 'AAA', positions: 'AAA', plugboard: '' },
    hint: 'Type AAAAA → BDZGO',
  },
  doublestep: {
    label: 'Double-step demo: ADU',
    cfg: { rotors: ['I', 'II', 'III'], reflector: 'B', rings: 'AAA', positions: 'ADU', plugboard: '' },
    hint: 'Press any key 3× and watch the windows: ADV → AEW → BFX',
  },
  barbarossa: {
    label: '1941 Barbarossa message',
    cfg: { rotors: ['II', 'IV', 'V'], reflector: 'B', rings: 'BUL', positions: 'BLA', plugboard: 'AV BS CG DL FU HZ IN KM OW RX' },
    hint: 'Type: EDPUD NRGYS ZRCXN UYTPO MRMBO → AUFKL XABTE ILUNG XVONX KURTI (Aufklärung Abteilung von Kurtinowa…)',
    cipher: 'EDPUDNRGYSZRCXNUYTPOMRMBOFKTBZREZKMLXLVEFGUEYSIOZVEQMIKUBPMMYLKLTTDEISMDICAGYKUACTCDOMOHWXMUUIAUBSTSLRNBZSZWNRFXWFYSSXJZVIJHIDISHPRKLKAYUPADTXQSPINQMATLPIFSVKDASCTACDPBOPVHJK',
  },
};
