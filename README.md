# Enigma I: a 3D cipher machine you can use, take apart and learn from

A realistic, fully working **3D model of the WWII German Enigma I** that runs in the browser.
Type on it, watch the rotors turn and the lamps light, plug cables into the plugboard, follow
the electrical current through the machine, then dismantle it piece by piece.

- **Accurate cipher:** rotors I–V, reflectors A/B/C, ring settings, plugboard, and the
  middle-rotor *double step*. It decrypts a real 1941 German Army message (see the tests).
- **Playable in 3D:** type on your keyboard or click the keys. Click or scroll a rotor
  thumbwheel to turn it. Click plugboard sockets to connect cables.
- **Dismantle:** a staged exploded view (lid → rotor cover → lampboard → keyboard → plugboard →
  rotors → stepping gear → wiring). Click any part to learn what it does.
- **See the current:** *Current path* draws the signal in 3D (and switches on *X-ray*), amber
  toward the reflector and cyan back to the lamp. The **Signal** tab shows a flat wiring
  diagram and a step-by-step list for every key press.
- **Learn:** nine short guided lessons, each with a "Show me on the machine" button.

No build step and no external requests: Three.js is bundled in `vendor/`.

## Run it

Any static file server works. ES modules don't load from `file://`, so don't just double-click
`index.html`.

```bash
npx http-server -p 8080 .     # or: python3 -m http.server 8080
# open http://localhost:8080
```

### Put it online (GitHub Pages)

The repo includes `.github/workflows/pages.yml`. In **Settings → Pages**, set *Source* to
**GitHub Actions**. Each push to `main` then publishes the site to
`https://<user>.github.io/enigma/`.

### Tests

```bash
npm test      # node --test: textbook vectors, double step, ring settings, a real 1941 message
```

## Controls

| Action | How |
| --- | --- |
| Press a key | Type A–Z, or click/tap a key in 3D. Hold it to keep the lamp lit. |
| Turn a rotor | Click a thumbwheel (shift-click turns it back), scroll over it, or use ▲▼ in the panel |
| Plug a cable | Click one socket, then another. Click a plugged socket to unplug it. |
| Look around | Drag to orbit, scroll to zoom, right-drag to pan |
| Dismantle | **Dismantle** button, or the slider for manual control |
| See inside | **X-ray**, **Rotor cover**, **Lid** |

---

## How the Enigma works

### 1. It's just a circuit that changes

At its core, Enigma is a **battery, 26 keys, 26 lamps, and a maze of wires**. Pressing a key
sends current through the maze and exactly one lamp lights. The maze **changes on every key
press** because the rotors turn, so the same key gives different letters each time.

```
key ─► plugboard ─► entry wheel ─► R ─► M ─► L ─► reflector
                                                     │
lamp ◄─ plugboard ◄─ entry wheel ◄─ R ◄─ M ◄─ L ◄────┘
```

The current passes through **9 scramblers** in total: the plugboard, three rotors, the
reflector, the same three rotors in reverse, and the plugboard again.

### 2. The plugboard (Steckerbrett)

Cables swap pairs of letters before and after the rotors. With the usual 10 cables there are
150,738,274,937,250 possible wirings. The plugboard is what made the military Enigma so much
stronger than the commercial one.

### 3. The rotors (Walzen)

Each rotor is a disc with 26 contacts on each side, cross-wired inside. Rotor I sends A→E,
B→K, C→M and so on. Three of the five rotors go in the machine, in any order (60 orders).

- **Ring setting (Ringstellung):** the lettered ring can be turned relative to the internal
  wiring. This moves the turnover notch relative to the wiring.
- **Start position (Grundstellung):** the letters showing in the windows when you start.

### 4. Stepping and the double step

Before the circuit closes, a key press steps the rotors like an odometer:

- The **right rotor** steps on every key.
- When the right rotor's notch passes, the **middle rotor** steps.
- When the middle rotor's notch passes, the **left rotor** steps. The same pawl also pushes the
  middle rotor, so the middle rotor steps **twice in a row**. This is the famous double step:
  `ADU → ADV → AEW → BFX` with rotors I-II-III.

| Rotor | I | II | III | IV | V |
| --- | --- | --- | --- | --- | --- |
| Turnover after window shows | Q | E | V | J | Z |

### 5. The reflector (Umkehrwalze)

The reflector wires the 26 contacts together in 13 pairs and sends the current back through
the rotors by another route. That has two consequences:

1. **Encryption is reciprocal.** The same settings turn ciphertext back into plaintext, so
   there's no separate "decrypt" mode.
2. **A letter can never encrypt to itself.** This was a fatal weakness: codebreakers could
   slide a guessed word (a *crib*) along the ciphertext and discard every position where any
   letter matched.

### 6. The daily key

Both operators set their machines from the same monthly key sheet: rotor order, ring settings,
plugboard pairs, and a start position. The total key space is about 1.59 × 10²⁰ (≈ 67 bits).

### 7. How it was broken

- **1932, Poland:** Marian Rejewski used permutation theory, plus the German habit of
  enciphering the message key twice, to reconstruct the rotor wirings. With Jerzy Różycki and
  Henryk Zygalski he built the *bomba* and perforated sheets.
- **Bletchley Park:** Alan Turing and Gordon Welchman built the **Bombe**. It tested rotor
  settings for consistency with a crib (e.g. `WETTERVORHERSAGE`, "weather forecast") and used
  the no-self-encryption rule and plugboard logic to throw out wrong settings fast.
- **Human error helped:** predictable openings, lazy keys like `AAA`, and the same message
  resent under different keys.

The lesson for modern security: the algorithm wasn't mathematically "weak". Enigma fell to
structural flaws (the reflector), known-plaintext attacks, and poor operating procedure.

### Try it in the simulator

| Preset | What to do |
| --- | --- |
| *Textbook* (I-II-III, B, AAA) | Type `AAAAA` → `BDZGO` |
| *Double-step demo* | Press any key 3× and watch the windows |
| *1941 Barbarossa message* | Click **Auto-type the ciphertext**. It decrypts to `AUFKLXABTEILUNGXVONXKURTINOWA…` ("Reconnaissance unit from Kurtinowa…") |

---

## Project layout

```
index.html          page shell + import map
css/style.css       UI styles (responsive; the panel becomes a bottom sheet on phones)
js/enigma.js        cipher engine (pure logic, unit-tested)
js/model.js         procedural 3D model (case, keys, lamps, rotors, plugboard, …)
js/textures.js      procedural canvas textures (wood grain, crackle paint, letters)
js/diagram.js       SVG signal-path diagram + stage descriptions
js/learn.js         part descriptions, lessons and presets
js/app.js           rendering, interaction, animation, UI
tests/              node --test suite for the engine
vendor/             three.js r170 (MIT) + OrbitControls + RoomEnvironment
```

The model is built from code, with no downloaded meshes. Dimensions roughly follow the real
machine (34 × 28 × 15 cm). The model is simplified in places, such as the stepping-pawl
geometry and the internal wire routing.
