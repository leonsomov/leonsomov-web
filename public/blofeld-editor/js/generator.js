// Blofeld Preset Generator — based on factory init research
// Balance=0 routes to F1 only. Routing=Parallel. F2=Bypass unless needed.
import { PARAMS, createInitSound } from './blofeld-params.js';
import { generateName } from './names.js';
import { generateHarmonicSweep, generateFMSweep, generatePWMSweep,
         generateFormantSweep, generateMorphTable, generateSine, generateSaw,
         generateSquare, generateFM, generateNoise, generateAdditive,
         createEmptyTable, encodeTableSysEx, uploadTable,
         SAMPLES_PER_WAVE } from './wavetable.js';

function R(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function init() { return createInitSound(); }

function setName(d, name) {
  const n = name.padEnd(16, ' ').substring(0, 16);
  for (let i = 0; i < 16; i++) d[363 + i] = n.charCodeAt(i);
}

function mod(d, slot, src, dst, amt) {
  const i = 261 + (slot - 1) * 3;
  d[i] = src; d[i + 1] = dst; d[i + 2] = amt;
}

// ── Curated wavetable shape pools (built-in, no upload needed) ──
// Warm/smooth shapes
const WT_WARM = [2, 3, 4, 14, 24, 37]; // Saw, Tri, Sine, MellowSaw, Polated, Glassy
// Bright/harmonic shapes
const WT_BRIGHT = [11, 16, 21, 22, 29, 33, 37, 66]; // Bellish, AddHarm, OrganSyn, SquareSaw, PercOrgan, Formant2, Glassy, XmasBell
// Dark/complex shapes
const WT_DARK = [15, 17, 18, 20, 27, 28, 31, 35]; // Feedback, Reso3HP, WindSyn, Clipper, Robotic, StrongHrm, ResoHarms, MicroSync
// FM/metallic shapes
const WT_FM = [7, 8, 9, 25, 26, 36, 67]; // Resonant, Resonant2, MalletSyn, Transient, ElectricP, MicroPWM, FMPiano
// Digital/harsh shapes
const WT_DIGITAL = [10, 12, 13, 30, 38, 39, 40, 50, 51, 52]; // SqrSweep, PulSweep, SawSweep, ClipSweep, FuzzWave, Distorted, HeavyFuzz
// Sync shapes
const WT_SYNC = [39, 40, 41, 42, 43, 44, 45, 46, 47]; // SawSync1-3, PulSync1-3, SinSync1-3

function pickWave(pool) { return pool[Math.floor(Math.random() * pool.length)]; }

// Modifier blocks (4 available, indices 245-260)
// Op: 0=+ 1=- 2=* 3=AND 4=OR 5=XOR 6=MAX 7=min
function modifier(d, num, srcA, srcB, op, constant) {
  const base = 245 + (num - 1) * 4;
  d[base] = srcA; d[base + 1] = srcB; d[base + 2] = op; d[base + 3] = constant;
}
// Mod source IDs: 25=Modifier1, 26=Modifier2, 27=Modifier3, 28=Modifier4

// ── Deep Modulation Templates ────────────────────────────────────
// Each returns how many mod slots it used, starting from startSlot

function modPerformance(d, startSlot) {
  // Performance controls: velocity, aftertouch, mod wheel, pitch bend
  mod(d, startSlot,     11, 20, 74);  // Velocity → F1 Cutoff
  mod(d, startSlot + 1, 11, 30, 72);  // Velocity → Volume
  mod(d, startSlot + 2, 16, 20, 74);  // Mod Wheel → F1 Cutoff
  mod(d, startSlot + 3, 15, 20, 68);  // Pitch Bend → F1 Cutoff
  // Modifier1: LFO1 × Mod Wheel (vibrato via wheel only)
  modifier(d, 1, 1, 16, 2, 64); // LFO1 * ModWheel
  mod(d, startSlot + 4, 25, 0, 68);   // Modifier1 → Pitch (controlled vibrato)
  return 5;
}

function modExpressive(d, startSlot) {
  // For keys/plucks: velocity + aftertouch expression
  mod(d, startSlot,     11, 20, 74);  // Velocity → Cutoff
  mod(d, startSlot + 1, 11, 30, 72);  // Velocity → Volume
  mod(d, startSlot + 2, 13, 0, 65);   // Pressure → Pitch (slight bend)
  mod(d, startSlot + 3, 16, 20, 72);  // Mod Wheel → Cutoff
  mod(d, startSlot + 4, 15, 20, 68);  // Pitch Bend → Cutoff
  modifier(d, 1, 1, 16, 2, 64);
  mod(d, startSlot + 5, 25, 0, 67);   // Modifier1 → Pitch (wheel vibrato)
  return 6;
}

function modMovement(d, startSlot) {
  // Slow LFO-based movement for pads/ambient
  d[160] = 0; d[161] = 6;   // LFO1: slow sine
  d[172] = 1; d[173] = 10;  // LFO2: slow triangle
  d[184] = 0; d[185] = 15;  // LFO3: medium sine

  mod(d, startSlot,     1, 3, 78);   // LFO1 → O1 PW/Wave
  mod(d, startSlot + 1, 3, 20, 72);  // LFO2 → F1 Cutoff
  mod(d, startSlot + 2, 5, 24, 70);  // LFO3 → F1 Pan (stereo animation)
  mod(d, startSlot + 3, 1, 0, 64);   // LFO1 → Pitch (micro drift)
  return 4;
}

function modKeyboard(d, startSlot) {
  // Keytrack-based natural behavior
  mod(d, startSlot,     10, 20, 72);  // Keytrack → F1 Cutoff (high notes brighter)
  // Modifier2: Keytrack inverted for decay scaling
  modifier(d, 2, 10, 29, 1, 64); // Keytrack - minimum (inverts)
  mod(d, startSlot + 1, 26, 35, 70);  // Modifier2 → FE Decay (high notes shorter decay)
  mod(d, startSlot + 2, 26, 39, 70);  // Modifier2 → AE Decay
  return 3;
}

function modEnvSculpt(d, startSlot) {
  // Env3/Env4 for timbral sculpting
  // Env3: medium attack/decay for timbral arc
  d[220] = 0; d[223] = 15; d[224] = 127; d[225] = 55; d[226] = 40; d[229] = 45;
  // Env4: slow for long-term evolution
  d[232] = 0; d[235] = 40; d[236] = 127; d[237] = 80; d[238] = 60; d[241] = 65;
  mod(d, startSlot,     8, 3, 78);   // Env3 → O1 PW/Wave
  mod(d, startSlot + 1, 9, 20, 70);  // Env4 → F1 Cutoff
  return 2;
}

// Full deep mod — starts AFTER any generator-specific slots.
// Returns nothing; reads existing slots to find first free one.
function applyDeepMod(d, category) {
  // Find first unused mod slot (source=0 means empty)
  let slot = 1;
  for (let s = 1; s <= 16; s++) {
    const srcIdx = 261 + (s - 1) * 3;
    if (d[srcIdx] === 0) { slot = s; break; }
    if (s === 16) { slot = 16; } else { slot = s + 1; }
  }

  if (category === 'ambient' || category === 'pads') {
    // Only set LFOs if generator didn't already set them
    if (d[161] === 0) { d[160] = 0; d[161] = 6; }
    if (d[173] === 0) { d[172] = 1; d[173] = 10; }
    if (d[185] === 0) { d[184] = 0; d[185] = 15; }

    if (slot <= 12) { mod(d, slot, 1, 3, 78);  slot++; } // LFO1→PW/Wave
    if (slot <= 12) { mod(d, slot, 3, 20, 72); slot++; } // LFO2→F1 Cutoff
    if (slot <= 13) { mod(d, slot, 5, 24, 70); slot++; } // LFO3→Pan
    if (slot <= 14) { mod(d, slot, 11, 20, 74); slot++; } // Velocity→Cutoff
    if (slot <= 14) { mod(d, slot, 11, 30, 72); slot++; } // Velocity→Volume
    if (slot <= 15) { mod(d, slot, 16, 20, 72); slot++; } // ModWheel→Cutoff
    // Modifier1: LFO1 × ModWheel = controlled vibrato
    modifier(d, 1, 1, 16, 2, 64);
    if (slot <= 15) { mod(d, slot, 25, 0, 67); slot++; } // Modifier1→Pitch
    if (slot <= 15) { mod(d, slot, 10, 20, 70); slot++; } // Keytrack→Cutoff
    if (slot <= 16) { mod(d, slot, 15, 20, 68); slot++; } // PitchBend→Cutoff

  } else if (category === 'keys' || category === 'pluck') {
    // Don't touch Env3 if generator already set it (for FM decay)
    const env3Set = d[225] > 0; // decay > 0 means generator set Env3

    if (slot <= 12) { mod(d, slot, 11, 20, 74); slot++; } // Velocity→Cutoff
    if (slot <= 12) { mod(d, slot, 11, 30, 72); slot++; } // Velocity→Volume
    if (slot <= 13) { mod(d, slot, 16, 20, 72); slot++; } // ModWheel→Cutoff
    if (slot <= 13) { mod(d, slot, 15, 20, 68); slot++; } // PitchBend→Cutoff
    modifier(d, 1, 1, 16, 2, 64);
    if (slot <= 14) { mod(d, slot, 25, 0, 67); slot++; } // Modifier1→Pitch
    if (slot <= 14) { mod(d, slot, 10, 20, 72); slot++; } // Keytrack→Cutoff
    // Keytrack→decay scaling via Modifier2
    modifier(d, 2, 10, 29, 1, 64);
    if (slot <= 15) { mod(d, slot, 26, 35, 70); slot++; } // Mod2→FE Decay
    if (slot <= 15) { mod(d, slot, 26, 39, 70); slot++; } // Mod2→AE Decay
    // LFO3→Pan if not already used
    if (d[185] === 0) { d[184] = 0; d[185] = 18; }
    if (slot <= 16) { mod(d, slot, 5, 24, 68); slot++; } // LFO3→Pan

  } else if (category === 'bass') {
    if (slot <= 12) { mod(d, slot, 11, 20, 74); slot++; } // Velocity→Cutoff
    if (slot <= 12) { mod(d, slot, 11, 30, 72); slot++; } // Velocity→Volume
    if (slot <= 13) { mod(d, slot, 16, 20, 74); slot++; } // ModWheel→Cutoff
    if (slot <= 13) { mod(d, slot, 15, 20, 68); slot++; } // PitchBend→Cutoff
    modifier(d, 1, 1, 16, 2, 64);
    if (slot <= 14) { mod(d, slot, 25, 0, 67); slot++; } // Modifier1→Pitch
    if (slot <= 14) { mod(d, slot, 10, 20, 70); slot++; } // Keytrack→Cutoff
    // Velocity × pressure → drive
    modifier(d, 3, 11, 13, 6, 64); // MAX(velocity, pressure)
    if (slot <= 15) { mod(d, slot, 27, 23, 70); slot++; } // Mod3→Drive

  } else if (category === 'techno') {
    if (slot <= 12) { mod(d, slot, 11, 20, 76); slot++; } // Velocity→Cutoff
    if (slot <= 12) { mod(d, slot, 11, 30, 72); slot++; } // Velocity→Volume
    if (slot <= 13) { mod(d, slot, 16, 20, 74); slot++; } // ModWheel→Cutoff
    if (slot <= 13) { mod(d, slot, 15, 20, 68); slot++; } // PitchBend→Cutoff
    if (slot <= 14) { mod(d, slot, 13, 23, 72); slot++; } // Pressure→Drive
    // S&H LFO→Pan for stereo scatter
    if (d[185] === 0) { d[184] = 5; d[185] = 25; }
    modifier(d, 4, 5, 30, 2, 64);
    if (slot <= 15) { mod(d, slot, 28, 24, 70); slot++; } // Mod4→Pan
  }
}

// Enable osc2 with a shape (it's off by default in init)
function osc2(d, octave, semi, shape) {
  d[17] = octave; d[18] = semi; d[21] = 96; d[24] = shape; d[25] = 127;
}

// Enable osc3
function osc3(d, octave, semi, shape) {
  d[33] = octave; d[34] = semi; d[37] = 96; d[40] = shape;
}

// Set filter1
function filt(d, type, cutoff, reso, envAmt) {
  d[77] = type; d[78] = cutoff; d[80] = reso;
  d[87] = 64 + envAmt; // 64=center(0), 64+X = positive env amount
}

// Set amp envelope
function ampEnv(d, atk, dec, sus, rel) {
  d[211] = atk; d[212] = 127; d[213] = dec; d[214] = sus; d[217] = rel;
}

// Set filter envelope
function filtEnv(d, atk, dec, sus, rel) {
  d[199] = atk; d[200] = 127; d[201] = dec; d[202] = sus; d[205] = rel;
}

// ── FX (fixed values, no randomness) ─────────────────────────────

function fxChorusReverb(d) {
  d[128] = 1; d[129] = 35; d[130] = 24; d[131] = 48;  // Chorus
  d[144] = 8; d[145] = 38;                               // Reverb
  d[146] = 72; d[147] = 50; d[148] = 70;
  d[151] = 95; d[152] = 18; d[153] = 82; d[154] = 55;
}

function fxBigReverb(d) {
  d[144] = 8; d[145] = 50;
  d[146] = 105; d[147] = 65; d[148] = 100;
  d[151] = 88; d[152] = 15; d[153] = 95; d[154] = 48;
}

function fxShimmer(d) {
  d[128] = 3; d[129] = 22;  // Phaser
  d[130] = 6; d[131] = 40; d[134] = 30; d[135] = 75; d[136] = 60;
  d[144] = 8; d[145] = 52;  // Reverb
  d[146] = 110; d[147] = 72; d[148] = 112;
  d[151] = 112; d[152] = 32; d[153] = 100; d[154] = 30;
}

function fxWarmRoom(d) {
  d[144] = 8; d[145] = 25;
  d[146] = 48; d[147] = 40; d[148] = 50;
  d[151] = 100; d[152] = 20; d[153] = 75; d[154] = 58;
}

function fxTapeDelay(d) {
  d[128] = 4; d[129] = 15;  // Light overdrive
  d[131] = 28; d[132] = 82; d[135] = 62; d[139] = 1;  // Tube
  d[144] = 6; d[145] = 32;  // Delay
  d[149] = 55; d[150] = 50; d[151] = 48; d[155] = 85;
}

// ═══════════════════════════════════════════════════════════════════
//  AMBIENT
// ═══════════════════════════════════════════════════════════════════

function genAmbient(d) {
  const v = pick(['glass', 'breath', 'drift', 'texture']);

  if (v === 'glass') {
    d[8] = pickWave(WT_WARM);
    d[6] = 2; d[7] = 22;
    osc2(d, 76, 64, 4);
    d[63] = 0;
    filt(d, 2, 95, 0, 5);
    ampEnv(d, 100, 127, 115, 110);
    filtEnv(d, 95, 120, 110, 100);
    fxBigReverb(d);

  } else if (v === 'breath') {
    d[8] = pickWave(WT_WARM); d[3] = 63;
    osc2(d, 64, 64, pickWave(WT_WARM));
    d[19] = 65; d[63] = 75;
    filt(d, 2, 72, 5, 8);
    ampEnv(d, 95, 127, 112, 105);
    filtEnv(d, 88, 115, 105, 95);
    fxChorusReverb(d);

  } else if (v === 'drift') {
    d[8] = 4;
    osc2(d, 76, 64, pickWave(WT_BRIGHT));
    d[63] = 55;
    osc3(d, 88, 64, 4);
    d[65] = 35;
    filt(d, 2, 85, 0, 4);
    ampEnv(d, 105, 127, 115, 112);
    filtEnv(d, 98, 120, 112, 105);
    fxShimmer(d);

  } else {
    // Texture — dark wavetable
    d[8] = pickWave(WT_DARK); d[3] = 62;
    osc2(d, 64, 64, pickWave(WT_DARK));
    d[19] = 66; d[63] = 70;
    d[67] = 18; d[68] = 0; d[69] = 42;
    filt(d, 1, 48, 12, 10);
    ampEnv(d, 98, 127, 112, 108);
    filtEnv(d, 90, 118, 108, 100);
    fxChorusReverb(d);
  }

  d[121] = 100;
  applyDeepMod(d, 'ambient');
  d[58] = 0; d[379] = 2;
}

// ═══════════════════════════════════════════════════════════════════
//  BASS
// ═══════════════════════════════════════════════════════════════════

function genBass(d) {
  const v = pick(['analog', 'sub', 'growl', 'digital']);

  if (v === 'analog') {
    d[1] = 52; d[8] = pick([1, 2]);
    osc2(d, 52, 64, pick([1, 2]));
    d[25] = 68; d[19] = 63; d[63] = 100;
    filt(d, 1, 30, 50, 36);
    ampEnv(d, 0, 45, 5, 22);
    filtEnv(d, 0, 38, 8, 25);
    fxWarmRoom(d);

  } else if (v === 'sub') {
    d[1] = 40; d[8] = 4;
    osc2(d, 52, 64, pick([3, 4]));
    d[63] = 48;
    filt(d, 2, 58, 0, 10);
    ampEnv(d, 0, 58, 72, 38);
    filtEnv(d, 3, 52, 65, 42);
    fxWarmRoom(d);

  } else if (v === 'growl') {
    d[1] = 52; d[3] = 60; d[8] = pickWave(WT_DARK);
    osc2(d, 52, 64, pickWave(WT_DARK));
    d[19] = 68; d[63] = 108;
    osc3(d, 40, 64, 4); d[65] = 88;
    filt(d, 1, 22, 58, 30);
    d[81] = 35; d[82] = 1;
    ampEnv(d, 0, 48, 8, 24);
    filtEnv(d, 0, 40, 5, 28);
    fxTapeDelay(d);

  } else {
    d[1] = 52; d[8] = pickWave(WT_DIGITAL);
    osc2(d, 52, 64, pickWave(WT_SYNC));
    d[19] = 63; d[63] = 90;
    filt(d, 1, 28, 45, 32);
    ampEnv(d, 0, 55, 12, 35);
    filtEnv(d, 0, 45, 8, 28);
    fxTapeDelay(d);
  }

  d[121] = 127; d[122] = 70;
  applyDeepMod(d, 'bass');
  d[58] = 1; d[53] = 1; d[57] = 30; // Mono + glide
  d[379] = 3;
}

// ═══════════════════════════════════════════════════════════════════
//  PLUCK
// ═══════════════════════════════════════════════════════════════════

function genPluck(d) {
  const v = pick(['bell', 'soft', 'bright', 'metallic']);

  if (v === 'bell') {
    d[1] = 76; d[8] = 4;
    d[6] = 2; d[7] = 52;
    osc2(d, 88, 64, 4);
    d[63] = 0;
    filt(d, 0, 127, 0, 0);
    ampEnv(d, 0, 72, 18, 68);
    filtEnv(d, 0, 60, 22, 55);
    d[223] = 0; d[224] = 127; d[225] = 48; d[226] = 8; d[229] = 42;
    mod(d, 1, 8, 2, 84);
    mod(d, 2, 11, 2, 74);
    fxShimmer(d);

  } else if (v === 'soft') {
    d[8] = pickWave(WT_WARM);
    osc2(d, 76, 64, pickWave(WT_WARM));
    d[19] = 63; d[63] = 68;
    filt(d, 2, 65, 5, 16);
    ampEnv(d, 0, 62, 30, 58);
    filtEnv(d, 2, 55, 45, 48);
    mod(d, 1, 11, 20, 72);
    fxChorusReverb(d);

  } else if (v === 'bright') {
    d[8] = pickWave(WT_BRIGHT);
    osc2(d, 76, 64, pickWave(WT_BRIGHT));
    d[19] = 63; d[63] = 82;
    filt(d, 1, 55, 22, 28);
    ampEnv(d, 0, 48, 12, 45);
    filtEnv(d, 0, 32, 15, 25);
    mod(d, 1, 11, 20, 74);
    fxChorusReverb(d);

  } else {
    // Metallic — FM shapes
    d[8] = pickWave(WT_FM);
    d[6] = 2; d[7] = 40;
    osc2(d, pick([76, 88]), pick([64, 71]), 4);
    d[63] = 0;
    filt(d, 2, 80, 10, 18);
    ampEnv(d, 0, 58, 15, 52);
    filtEnv(d, 0, 45, 10, 38);
    d[223] = 0; d[224] = 127; d[225] = 42; d[226] = 5; d[229] = 35;
    mod(d, 1, 8, 2, 80);
    mod(d, 2, 11, 2, 72);
    fxShimmer(d);
  }

  d[121] = 110; d[122] = 72;
  applyDeepMod(d, 'pluck');
  d[58] = 0; d[379] = 10;
}

// ═══════════════════════════════════════════════════════════════════
//  KEYS
// ═══════════════════════════════════════════════════════════════════

function genKeys(d) {
  const v = pick(['rhodes', 'wurli', 'crystal']);

  if (v === 'rhodes') {
    d[8] = 4;                // Sine
    d[6] = 2; d[7] = 36;    // FM from Osc2 (sweet spot)
    osc2(d, 76, 64, 4);     // Sine 4' (2:1)
    d[63] = 0;               // Modulator only
    filt(d, 2, 78, 3, 8);   // LP12, warm
    ampEnv(d, 0, 62, 55, 48);
    filtEnv(d, 2, 55, 50, 42);
    // Bell decay via Env3
    d[223] = 0; d[224] = 127; d[225] = 40; d[226] = 10; d[229] = 35;
    mod(d, 1, 8, 2, 78);    // Env3→FM
    mod(d, 2, 11, 2, 73);   // Velocity→FM
    mod(d, 3, 11, 30, 72);  // Velocity→Volume
    // Chorus + warm room
    d[128] = 1; d[129] = 32; d[130] = 22; d[131] = 45;
    fxWarmRoom(d);

  } else if (v === 'wurli') {
    d[8] = 1; d[25] = 72;   // Pulse
    osc2(d, 64, 64, 4);     // Sine for body
    d[63] = 82;
    filt(d, 2, 75, 8, 14);  // LP12
    d[81] = 15; d[82] = 1;  // Light tube drive
    ampEnv(d, 0, 55, 48, 40);
    filtEnv(d, 0, 48, 40, 35);
    mod(d, 1, 11, 20, 72);
    mod(d, 2, 11, 30, 72);
    // Tremolo
    d[160] = 0; d[161] = 55;
    mod(d, 3, 1, 30, 68);   // LFO→Volume
    fxWarmRoom(d);

  } else {
    d[1] = 76; d[8] = 4;    // Sine 4'
    d[6] = 2; d[7] = 45;    // FM
    osc2(d, 88, 71, 4);     // Sine 3:2 ish
    d[63] = 0;
    osc3(d, 76, 64, 4);     // Extra sine layer
    d[65] = 32;
    filt(d, 0, 127, 0, 0);  // Bypass — let FM through
    ampEnv(d, 0, 75, 25, 70);
    filtEnv(d, 0, 65, 30, 55);
    d[223] = 0; d[224] = 127; d[225] = 50; d[226] = 5; d[229] = 45;
    mod(d, 1, 8, 2, 82);
    mod(d, 2, 11, 2, 72);
    fxShimmer(d);
  }

  d[121] = 108; d[122] = 72;
  applyDeepMod(d, 'keys');
  d[58] = 0; d[379] = 6;
}

// ═══════════════════════════════════════════════════════════════════
//  PADS
// ═══════════════════════════════════════════════════════════════════

function genPads(d) {
  const v = pick(['warm', 'strings', 'space', 'evolving']);

  if (v === 'warm') {
    d[3] = 62; d[8] = pickWave(WT_WARM);
    osc2(d, 64, 64, pickWave(WT_WARM));
    d[19] = 66; d[63] = 100;
    osc3(d, 52, 64, 4); d[65] = 62;
    filt(d, 1, 68, 8, 14);
    ampEnv(d, 65, 85, 108, 78);
    filtEnv(d, 70, 88, 102, 72);
    fxChorusReverb(d);

  } else if (v === 'strings') {
    d[3] = 61; d[8] = pick([2, 14]);
    d[10] = 1; d[11] = 80;
    osc2(d, 64, 64, pick([2, 14]));
    d[19] = 67; d[63] = 98;
    d[26] = 3; d[27] = 82;
    filt(d, 2, 75, 5, 8);
    d[160] = 0; d[161] = 30;
    d[172] = 1; d[173] = 26;
    ampEnv(d, 55, 78, 105, 72);
    filtEnv(d, 60, 80, 98, 65);
    fxChorusReverb(d);

  } else if (v === 'space') {
    d[8] = pickWave(WT_BRIGHT); d[3] = 63;
    osc2(d, 76, 64, pickWave(WT_BRIGHT));
    d[19] = 65; d[63] = 70;
    osc3(d, 88, 64, 4); d[65] = 38;
    filt(d, 2, 88, 0, 4);
    ampEnv(d, 80, 95, 112, 88);
    filtEnv(d, 78, 98, 108, 82);
    d[160] = 0; d[161] = 4;
    mod(d, 1, 1, 0, 64);
    fxShimmer(d);

  } else {
    // Evolving — wavetable morphing pad
    d[8] = pickWave(WT_FM); d[3] = 62;
    osc2(d, 64, 64, pickWave(WT_DARK));
    d[19] = 66; d[63] = 82;
    d[10] = 1; d[11] = 85; // LFO1 → PW/wave scanning
    filt(d, 1, 55, 12, 12);
    d[160] = 0; d[161] = 5;
    d[172] = 1; d[173] = 8;
    ampEnv(d, 72, 90, 110, 82);
    filtEnv(d, 68, 85, 105, 75);
    mod(d, 1, 1, 3, 80); // LFO1→wave position
    mod(d, 2, 3, 20, 70); // LFO2→cutoff
    fxChorusReverb(d);
  }

  d[121] = 98;
  applyDeepMod(d, 'pads');
  d[58] = 0; d[379] = 9;
}

// ═══════════════════════════════════════════════════════════════════
//  TECHNO
// ═══════════════════════════════════════════════════════════════════

function fxHardDelay(d) {
  d[128] = 4; d[129] = 22;  // Overdrive
  d[131] = 38; d[132] = 78; d[135] = 55; d[139] = 0; // Clipping
  d[144] = 7; d[145] = 40;  // Clocked delay
  d[150] = 62; d[151] = 42; d[155] = 90; d[156] = 8; // 1/8
}

function fxIndustrial(d) {
  d[128] = 4; d[129] = 28;  // Overdrive
  d[131] = 50; d[132] = 72; d[135] = 48; d[139] = 7; // Rectifier
  d[144] = 8; d[145] = 22;  // Short reverb
  d[146] = 35; d[147] = 30; d[148] = 35;
  d[151] = 70; d[152] = 30; d[153] = 60; d[154] = 65;
}

function genTechno(d) {
  const v = pick(['stab', 'acid', 'noise', 'chord', 'perc']);

  if (v === 'stab') {
    d[8] = pickWave(pick([WT_BRIGHT, WT_DIGITAL]));
    osc2(d, 64, 64, pick([1, 2]));
    d[25] = 64; d[19] = 63; d[63] = 105;
    filt(d, 1, 42, 30, 32); // LP24, snappy
    ampEnv(d, 0, 62, 20, 45);
    filtEnv(d, 0, 52, 10, 35);
    mod(d, 1, 11, 20, 76);
    d[121] = 127; d[122] = 75;
    fxHardDelay(d);

  } else if (v === 'acid') {
    // 303-style acid — saw, high res, filter sweep
    d[1] = 52; d[8] = 2; // Saw 16'
    filt(d, 1, 25, 65, 40); // LP24, low cut, resonance, big env
    d[81] = 28; d[82] = 0; // Clipping drive
    ampEnv(d, 0, 68, 30, 42);
    filtEnv(d, 0, 55, 8, 30);
    mod(d, 1, 11, 20, 78);
    d[121] = 127; d[122] = 68;
    d[58] = 1; d[53] = 1; d[57] = 35; // Mono + glide
    d[144] = 7; d[145] = 30;
    d[150] = 55; d[151] = 38; d[155] = 85; d[156] = 5;

  } else if (v === 'noise') {
    // Industrial noise hit
    d[1] = 52; d[8] = pick([4, pickWave(WT_DARK)]);
    d[67] = 95; d[68] = 0; d[69] = 72;
    d[61] = 80;
    filt(d, 1, 55, 35, 25);
    d[81] = 42; d[82] = 7; // Rectifier
    ampEnv(d, 0, 58, 10, 40);
    filtEnv(d, 0, 48, 5, 32);
    d[121] = 120;
    fxIndustrial(d);

  } else if (v === 'chord') {
    // Techno chord
    d[3] = 61; d[8] = pick([2, pickWave(WT_BRIGHT)]);
    osc2(d, 64, 64, 2); d[19] = 67; d[63] = 108;
    osc3(d, 52, 64, 4); d[65] = 55;
    filt(d, 1, 52, 18, 22);
    ampEnv(d, 0, 65, 25, 48);
    filtEnv(d, 0, 55, 12, 38);
    d[121] = 115; d[122] = 72;
    fxHardDelay(d);

  } else {
    // Percussive hit — pitch sweep + noise
    d[1] = 52; d[8] = 4;
    d[67] = 60; d[68] = 0; d[69] = 55;
    d[61] = 110;
    filt(d, 1, 65, 20, 30);
    ampEnv(d, 0, 52, 0, 30);
    filtEnv(d, 0, 42, 0, 22);
    d[223] = 0; d[224] = 127; d[225] = 28; d[226] = 0; d[229] = 15;
    mod(d, 1, 8, 0, 90);
    d[121] = 127;
    fxIndustrial(d);
  }

  applyDeepMod(d, 'techno');
  d[58] = v === 'acid' ? 1 : 0;
  d[379] = 12;
}

// ═══════════════════════════════════════════════════════════════════
//  WAVETABLE GENERATORS — create unique tables + matching presets
// ═══════════════════════════════════════════════════════════════════

// Wavetable shapes for Blofeld user slots start at shape index 80
// User slot 80 = osc shape value 80, etc.

const WT_GENERATORS = [
  {
    name: 'Spectral Sweep',
    makeTable() {
      // Sweep from pure fundamental to complex spectrum
      const table = createEmptyTable();
      table.name = 'Spectral';
      for (let w = 0; w < 64; w++) {
        const numH = 1 + Math.floor((w / 63) * 31);
        const amps = [];
        for (let h = 0; h < numH; h++) {
          // Each harmonic fades in progressively, with spectral tilt
          const brightness = w / 63;
          amps.push(Math.pow(1 / (h + 1), 1.5 - brightness));
        }
        table.waves[w] = generateAdditive(amps);
      }
      return table;
    }
  },
  {
    name: 'FM Metallic',
    makeTable() {
      // FM with increasing modulation — clean to metallic
      const table = createEmptyTable();
      table.name = 'FM Metal';
      for (let w = 0; w < 64; w++) {
        const depth = (w / 63) * 12;
        const ratio = 1 + Math.floor(w / 16) * 0.5; // Shifts ratio every 16 waves
        table.waves[w] = generateFM(1, ratio, depth);
      }
      return table;
    }
  },
  {
    name: 'Vowel Morph',
    makeTable() {
      // Morph through vowel-like formant positions
      const table = createEmptyTable();
      table.name = 'Vowels';
      const formants = [3, 5, 8, 12, 18]; // A E I O U-ish
      for (let w = 0; w < 64; w++) {
        const pos = (w / 63) * (formants.length - 1);
        const idx = Math.floor(pos);
        const frac = pos - idx;
        const f1 = formants[Math.min(idx, formants.length - 1)];
        const f2 = formants[Math.min(idx + 1, formants.length - 1)];
        const formant = f1 + (f2 - f1) * frac;
        const amps = [];
        for (let h = 0; h < 32; h++) {
          const dist = Math.abs(h + 1 - formant);
          amps.push(Math.exp(-dist * 0.4));
        }
        table.waves[w] = generateAdditive(amps);
      }
      return table;
    }
  },
  {
    name: 'Digital Chaos',
    makeTable() {
      // Bit-crushed, aliased, glitchy waves
      const table = createEmptyTable();
      table.name = 'DigiChaos';
      for (let w = 0; w < 64; w++) {
        const wave = new Float32Array(SAMPLES_PER_WAVE);
        const bits = 2 + Math.floor((w / 63) * 6); // 2-bit to 8-bit
        const steps = Math.pow(2, bits);
        // Base wave: mix of saw and square
        const mix = w / 63;
        for (let i = 0; i < SAMPLES_PER_WAVE; i++) {
          const t = i / SAMPLES_PER_WAVE;
          const saw = 2 * t - 1;
          const sq = t < 0.5 ? 1 : -1;
          const val = saw * (1 - mix) + sq * mix;
          // Quantize (bit crush)
          wave[i] = Math.round(val * steps) / steps;
        }
        table.waves[w] = wave;
      }
      return table;
    }
  },
  {
    name: 'Organ Drawbars',
    makeTable() {
      // Simulates organ drawbar combinations
      const table = createEmptyTable();
      table.name = 'Organ';
      // 9 drawbar harmonics: 16' 5⅓' 8' 4' 2⅔' 2' 1⅗' 1⅓' 1'
      const drawbarH = [0.5, 1.5, 1, 2, 3, 4, 5, 6, 8];
      for (let w = 0; w < 64; w++) {
        const wave = new Float32Array(SAMPLES_PER_WAVE);
        for (let i = 0; i < SAMPLES_PER_WAVE; i++) {
          const t = i / SAMPLES_PER_WAVE;
          for (let db = 0; db < 9; db++) {
            // Each drawbar fades in at different points across the table
            const onset = db / 9;
            const level = Math.max(0, Math.min(1, (w / 63 - onset) * 4));
            wave[i] += level * Math.sin(2 * Math.PI * drawbarH[db] * t);
          }
        }
        // Normalize
        let max = 0;
        for (let i = 0; i < SAMPLES_PER_WAVE; i++) max = Math.max(max, Math.abs(wave[i]));
        if (max > 0) for (let i = 0; i < SAMPLES_PER_WAVE; i++) wave[i] /= max;
        table.waves[w] = wave;
      }
      return table;
    }
  },
  {
    name: 'Noise Texture',
    makeTable() {
      // Filtered noise — dark to bright across the table
      const table = createEmptyTable();
      table.name = 'NoiseTex';
      // Generate base noise
      const noise = new Float32Array(SAMPLES_PER_WAVE);
      for (let i = 0; i < SAMPLES_PER_WAVE; i++) noise[i] = Math.random() * 2 - 1;
      for (let w = 0; w < 64; w++) {
        const harmonics = 1 + Math.floor((w / 63) * 63);
        // Mix noise with filtered version
        const wave = new Float32Array(SAMPLES_PER_WAVE);
        const noiseAmt = 0.3 + (w / 63) * 0.7;
        for (let i = 0; i < SAMPLES_PER_WAVE; i++) {
          const t = i / SAMPLES_PER_WAVE;
          let tonal = 0;
          for (let h = 1; h <= Math.min(harmonics, 32); h++) {
            tonal += Math.sin(2 * Math.PI * h * t) / (h * h);
          }
          wave[i] = tonal * (1 - noiseAmt) + noise[i] * noiseAmt;
        }
        let max = 0;
        for (let i = 0; i < SAMPLES_PER_WAVE; i++) max = Math.max(max, Math.abs(wave[i]));
        if (max > 0) for (let i = 0; i < SAMPLES_PER_WAVE; i++) wave[i] /= max;
        table.waves[w] = wave;
      }
      return table;
    }
  },
];

// Track which user slot to use next (rotates through 80-87 for generated tables)
let nextWTSlot = 80;

function getNextSlot() {
  const slot = nextWTSlot;
  nextWTSlot = 80 + ((nextWTSlot - 80 + 1) % 8); // Cycle through first 8 user slots
  return slot;
}

// Generate a wavetable preset: creates table + uploads + returns preset using it
async function generateWithWavetable(midi) {
  const gen = pick(WT_GENERATORS);
  const table = gen.makeTable();
  const slot = getNextSlot();
  const shapeValue = slot; // Blofeld osc shape value = slot number for user WTs

  // Upload if connected
  if (midi && midi.isConnected) {
    await uploadTable(midi, slot, table);
  }

  // Create a preset that uses this wavetable
  const d = init();
  const style = pick(['pad', 'texture', 'pluck', 'sweep']);

  // Osc1 = the custom wavetable
  d[8] = shapeValue;
  d[5] = 96;

  if (style === 'pad') {
    // Wavetable pad with slow LFO scanning the wave position
    osc2(d, 64, 64, shapeValue); // Same WT on osc2, detuned
    d[19] = 65; d[63] = 85;
    d[10] = 1; d[11] = 82; // LFO1→PW/Wave position
    filt(d, 2, 75, 5, 10);
    ampEnv(d, 70, 90, 110, 80);
    filtEnv(d, 65, 85, 105, 72);
    d[160] = 0; d[161] = 8; // Slow LFO
    mod(d, 1, 1, 3, 80); // LFO1→O1 PW/Wave
    mod(d, 2, 1, 6, 78); // LFO1→O2 PW/Wave
    d[121] = 98;
    // Chorus + reverb
    d[128] = 1; d[129] = 35; d[130] = 22; d[131] = 48;
    d[144] = 8; d[145] = 48;
    d[146] = 95; d[147] = 60; d[148] = 90;
    d[151] = 90; d[152] = 15; d[153] = 88; d[154] = 50;

  } else if (style === 'texture') {
    // Evolving texture — env scanning wave position
    d[67] = 20; d[68] = 0; d[69] = 45; // Quiet noise
    filt(d, 1, 55, 18, 18);
    ampEnv(d, 85, 110, 108, 90);
    filtEnv(d, 80, 100, 102, 82);
    // Env3 → wave position
    d[223] = 0; d[224] = 127; d[225] = 80; d[226] = 60; d[229] = 70;
    mod(d, 1, 8, 3, 90); // Env3→O1 PW/Wave
    d[160] = 4; d[161] = 5; // Random LFO
    mod(d, 2, 1, 20, 70); // LFO→cutoff
    d[121] = 95;
    // Phaser + big reverb
    d[128] = 3; d[129] = 20;
    d[130] = 5; d[131] = 38; d[134] = 28; d[135] = 72; d[136] = 58;
    d[144] = 8; d[145] = 55;
    d[146] = 110; d[147] = 70; d[148] = 108;
    d[151] = 85; d[152] = 12; d[153] = 98; d[154] = 42;

  } else if (style === 'pluck') {
    // WT pluck — env sweeps wave position fast
    filt(d, 1, 62, 12, 22);
    ampEnv(d, 0, 65, 20, 55);
    filtEnv(d, 0, 50, 15, 42);
    // Fast Env3 → wave scan
    d[223] = 0; d[224] = 127; d[225] = 45; d[226] = 10; d[229] = 38;
    mod(d, 1, 8, 3, 88); // Env3→wave
    mod(d, 2, 11, 20, 74); // Velocity→cutoff
    d[121] = 112; d[122] = 72;
    // Chorus + warm reverb
    d[128] = 1; d[129] = 30; d[130] = 20; d[131] = 42;
    d[144] = 8; d[145] = 35;
    d[146] = 65; d[147] = 45; d[148] = 60;
    d[151] = 95; d[152] = 18; d[153] = 78; d[154] = 55;

  } else {
    // Sweep — slow filter + wave position movement
    osc2(d, 76, 64, 4); // Sine octave up
    d[63] = 45;
    filt(d, 2, 82, 3, 8);
    ampEnv(d, 60, 95, 112, 85);
    filtEnv(d, 55, 88, 108, 78);
    d[160] = 1; d[161] = 6; // Tri LFO slow
    d[172] = 0; d[173] = 10;
    mod(d, 1, 1, 3, 82); // LFO1→wave
    mod(d, 2, 3, 20, 72); // LFO2→cutoff
    d[121] = 95;
    // Shimmer
    d[128] = 3; d[129] = 22;
    d[130] = 6; d[131] = 40; d[134] = 30; d[135] = 75; d[136] = 60;
    d[144] = 8; d[145] = 50;
    d[146] = 108; d[147] = 72; d[148] = 112;
    d[151] = 112; d[152] = 30; d[153] = 100; d[154] = 30;
  }

  d[58] = 0; d[379] = 2; // Poly, Atmo category
  return { data: d, table, slot, tableName: gen.name };
}

// ── API ──────────────────────────────────────────────────────────

const GENERATORS = {
  Ambient: genAmbient,
  Bass: genBass,
  Pluck: genPluck,
  Keys: genKeys,
  Pads: genPads,
  Techno: genTechno,
};

export function getCategories() { return Object.keys(GENERATORS); }

export function generate(category) {
  const d = init();
  GENERATORS[category](d);
  const name = generateName();
  setName(d, name);
  return { data: d, name };
}

export function generateRandom() {
  return generate(pick(Object.keys(GENERATORS)));
}

export { generateWithWavetable };

export function mutate(sdata, amount = 0.08) {
  const d = new Uint8Array(sdata);
  const safe = [3, 7, 9, 19, 25, 78, 80, 87, 121, 129, 145, 161,
                199, 201, 202, 205, 211, 213, 214, 217];
  for (const idx of safe) {
    if (Math.random() < amount * 3) {
      d[idx] = clamp(d[idx] + Math.round((Math.random() - 0.5) * 10), 0, 127);
    }
  }
  d[62] = 0; d[64] = 0; d[66] = 0; // Keep balance=F1
  d[93] = 64; d[113] = 64;          // Keep pan center
  const name = generateName();
  setName(d, name);
  return { data: d, name };
}
