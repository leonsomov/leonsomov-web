// Wavetable engine — create, import, edit, upload to Blofeld
// 64 waves × 128 samples per wave, 21-bit signed, 38 user slots (80-118)

const WAVES_PER_TABLE = 64;
const SAMPLES_PER_WAVE = 128;
const USER_SLOT_START = 80;
const USER_SLOT_END = 118;
const WALDORF_ID = 0x3E;
const BLOFELD_ID = 0x13;

// ── Wavetable Data ───────────────────────────────────────────────

export function createEmptyTable() {
  const waves = [];
  for (let i = 0; i < WAVES_PER_TABLE; i++) {
    waves.push(new Float32Array(SAMPLES_PER_WAVE)); // -1.0 to 1.0
  }
  return { waves, name: 'User WT' };
}

// ── Math Generators ──────────────────────────────────────────────

export function generateSine(harmonics = 1) {
  const wave = new Float32Array(SAMPLES_PER_WAVE);
  for (let i = 0; i < SAMPLES_PER_WAVE; i++) {
    const t = i / SAMPLES_PER_WAVE;
    for (let h = 1; h <= harmonics; h++) {
      wave[i] += Math.sin(2 * Math.PI * h * t) / h;
    }
  }
  normalize(wave);
  return wave;
}

export function generateSaw(harmonics = 32) {
  const wave = new Float32Array(SAMPLES_PER_WAVE);
  for (let i = 0; i < SAMPLES_PER_WAVE; i++) {
    const t = i / SAMPLES_PER_WAVE;
    for (let h = 1; h <= harmonics; h++) {
      wave[i] += Math.sin(2 * Math.PI * h * t) * (h % 2 === 0 ? -1 : 1) / h;
    }
  }
  normalize(wave);
  return wave;
}

export function generateSquare(harmonics = 32) {
  const wave = new Float32Array(SAMPLES_PER_WAVE);
  for (let i = 0; i < SAMPLES_PER_WAVE; i++) {
    const t = i / SAMPLES_PER_WAVE;
    for (let h = 1; h <= harmonics; h += 2) {
      wave[i] += Math.sin(2 * Math.PI * h * t) / h;
    }
  }
  normalize(wave);
  return wave;
}

export function generateFM(carrier, modulator, depth) {
  const wave = new Float32Array(SAMPLES_PER_WAVE);
  for (let i = 0; i < SAMPLES_PER_WAVE; i++) {
    const t = i / SAMPLES_PER_WAVE;
    wave[i] = Math.sin(2 * Math.PI * carrier * t + depth * Math.sin(2 * Math.PI * modulator * t));
  }
  normalize(wave);
  return wave;
}

export function generateAdditive(amplitudes) {
  // amplitudes: array of harmonic amplitudes [fundamental, 2nd, 3rd, ...]
  const wave = new Float32Array(SAMPLES_PER_WAVE);
  for (let i = 0; i < SAMPLES_PER_WAVE; i++) {
    const t = i / SAMPLES_PER_WAVE;
    for (let h = 0; h < amplitudes.length; h++) {
      wave[i] += amplitudes[h] * Math.sin(2 * Math.PI * (h + 1) * t);
    }
  }
  normalize(wave);
  return wave;
}

export function generateNoise() {
  const wave = new Float32Array(SAMPLES_PER_WAVE);
  for (let i = 0; i < SAMPLES_PER_WAVE; i++) {
    wave[i] = Math.random() * 2 - 1;
  }
  return wave;
}

// ── Table generators (fill all 64 waves) ─────────────────────────

export function generateHarmonicSweep() {
  // Sweep from sine to rich harmonics across 64 waves
  const table = createEmptyTable();
  table.name = 'Harmonic Sweep';
  for (let w = 0; w < 64; w++) {
    const harmonics = 1 + Math.floor(w * 63 / 63);
    table.waves[w] = generateSine(harmonics);
  }
  return table;
}

export function generateFMSweep() {
  // Sweep FM depth across 64 waves
  const table = createEmptyTable();
  table.name = 'FM Sweep';
  for (let w = 0; w < 64; w++) {
    const depth = w / 63 * 8;
    table.waves[w] = generateFM(1, 2, depth);
  }
  return table;
}

export function generatePWMSweep() {
  // Pulse width modulation across 64 waves
  const table = createEmptyTable();
  table.name = 'PWM Sweep';
  for (let w = 0; w < 64; w++) {
    const pw = 0.05 + (w / 63) * 0.9;
    const wave = new Float32Array(SAMPLES_PER_WAVE);
    for (let i = 0; i < SAMPLES_PER_WAVE; i++) {
      wave[i] = (i / SAMPLES_PER_WAVE) < pw ? 1 : -1;
    }
    table.waves[w] = wave;
  }
  return table;
}

export function generateFormantSweep() {
  // Formant-like sweep
  const table = createEmptyTable();
  table.name = 'Formant Sweep';
  for (let w = 0; w < 64; w++) {
    const formant = 2 + w / 63 * 14;
    const amps = [];
    for (let h = 0; h < 32; h++) {
      const dist = Math.abs(h + 1 - formant);
      amps.push(Math.exp(-dist * 0.5));
    }
    table.waves[w] = generateAdditive(amps);
  }
  return table;
}

export function generateMorphTable(waveA, waveB) {
  // Morph between two waveforms across 64 frames
  const table = createEmptyTable();
  table.name = 'Morph';
  for (let w = 0; w < 64; w++) {
    const mix = w / 63;
    const wave = new Float32Array(SAMPLES_PER_WAVE);
    for (let i = 0; i < SAMPLES_PER_WAVE; i++) {
      wave[i] = waveA[i] * (1 - mix) + waveB[i] * mix;
    }
    table.waves[w] = wave;
  }
  return table;
}

// ── Import from audio ────────────────────────────────────────────

export async function importFromAudio(arrayBuffer) {
  const ctx = new OfflineAudioContext(1, 1, 44100);
  const audio = await ctx.decodeAudioData(arrayBuffer);
  const samples = audio.getChannelData(0);
  const totalSamples = samples.length;

  const table = createEmptyTable();
  table.name = 'Imported';

  // Slice audio into 64 equal segments, resample each to 128 samples
  const segmentLen = totalSamples / 64;

  for (let w = 0; w < 64; w++) {
    const start = Math.floor(w * segmentLen);
    const wave = new Float32Array(SAMPLES_PER_WAVE);

    for (let i = 0; i < SAMPLES_PER_WAVE; i++) {
      const srcIdx = start + Math.floor(i * segmentLen / SAMPLES_PER_WAVE);
      wave[i] = srcIdx < totalSamples ? samples[srcIdx] : 0;
    }

    normalize(wave);
    table.waves[w] = wave;
  }

  return table;
}

// ── Single-cycle import (one .wav = one waveform, fill table with variations) ──

export async function importSingleCycle(arrayBuffer) {
  const ctx = new OfflineAudioContext(1, 1, 44100);
  const audio = await ctx.decodeAudioData(arrayBuffer);
  const samples = audio.getChannelData(0);

  const table = createEmptyTable();
  table.name = 'Single Cycle';

  // Resample to 128 samples
  const baseWave = new Float32Array(SAMPLES_PER_WAVE);
  for (let i = 0; i < SAMPLES_PER_WAVE; i++) {
    const srcIdx = Math.floor(i * samples.length / SAMPLES_PER_WAVE);
    baseWave[i] = srcIdx < samples.length ? samples[srcIdx] : 0;
  }
  normalize(baseWave);

  // Fill table: progressively filter harmonics
  for (let w = 0; w < 64; w++) {
    const cutoff = 1 + (w / 63) * 63;
    table.waves[w] = filterWave(baseWave, cutoff);
  }

  return table;
}

function filterWave(wave, harmonics) {
  // Simple spectral filtering via additive reconstruction
  const result = new Float32Array(SAMPLES_PER_WAVE);
  const maxH = Math.min(Math.floor(harmonics), 64);

  // Extract harmonics via DFT (simple, not FFT)
  for (let h = 1; h <= maxH; h++) {
    let cosSum = 0, sinSum = 0;
    for (let i = 0; i < SAMPLES_PER_WAVE; i++) {
      const t = i / SAMPLES_PER_WAVE;
      cosSum += wave[i] * Math.cos(2 * Math.PI * h * t);
      sinSum += wave[i] * Math.sin(2 * Math.PI * h * t);
    }
    cosSum *= 2 / SAMPLES_PER_WAVE;
    sinSum *= 2 / SAMPLES_PER_WAVE;

    for (let i = 0; i < SAMPLES_PER_WAVE; i++) {
      const t = i / SAMPLES_PER_WAVE;
      result[i] += cosSum * Math.cos(2 * Math.PI * h * t) + sinSum * Math.sin(2 * Math.PI * h * t);
    }
  }
  normalize(result);
  return result;
}

// ── Utility ──────────────────────────────────────────────────────

function normalize(wave) {
  let max = 0;
  for (let i = 0; i < wave.length; i++) {
    const abs = Math.abs(wave[i]);
    if (abs > max) max = abs;
  }
  if (max > 0) {
    for (let i = 0; i < wave.length; i++) wave[i] /= max;
  }
}

// ── SysEx encode for Blofeld upload ──────────────────────────────

function floatToInt21(f) {
  // Convert -1.0..1.0 to 21-bit signed (-1048576..1048575)
  return Math.round(f * 1048575);
}

function encodeWaveSysEx(deviceId, slot, waveIndex, wave, name) {
  // WTBD: F0 3E 13 DEV 12 WT WN FMT [384 bytes data] [14 bytes name] RSV RSV CHK F7
  const msg = new Uint8Array(410);
  msg[0] = 0xF0;
  msg[1] = WALDORF_ID;
  msg[2] = BLOFELD_ID;
  msg[3] = deviceId;
  msg[4] = 0x12; // WTBD
  msg[5] = slot; // Wavetable slot (0x50-0x76 for user 80-118)
  msg[6] = waveIndex; // Wave number 0-63
  msg[7] = 0x00; // Format

  // Encode 128 samples × 3 bytes = 384 bytes
  for (let i = 0; i < SAMPLES_PER_WAVE; i++) {
    const sample = floatToInt21(wave[i]);
    const unsigned = sample < 0 ? sample + 2097152 : sample; // Convert to unsigned 21-bit
    msg[8 + i * 3]     = (unsigned >> 14) & 0x7F;
    msg[8 + i * 3 + 1] = (unsigned >> 7) & 0x7F;
    msg[8 + i * 3 + 2] = unsigned & 0x7F;
  }

  // Name: 14 ASCII chars
  const padName = (name || 'User WT').padEnd(14, ' ').substring(0, 14);
  for (let i = 0; i < 14; i++) {
    msg[392 + i] = padName.charCodeAt(i) & 0x7F;
  }

  // Reserved
  msg[406] = 0; msg[407] = 0;

  // Checksum: sum of bytes 7-407 masked to 0x7F
  let sum = 0;
  for (let i = 7; i <= 407; i++) sum += msg[i];
  msg[408] = sum & 0x7F;

  msg[409] = 0xF7;
  return msg;
}

export function encodeTableSysEx(deviceId, slot, table) {
  // Encode all 64 waves as array of SysEx messages
  const messages = [];
  for (let w = 0; w < WAVES_PER_TABLE; w++) {
    messages.push(encodeWaveSysEx(deviceId, slot, w, table.waves[w], table.name));
  }
  return messages;
}

export async function uploadTable(midi, slot, table, onProgress) {
  const deviceId = midi.deviceId;
  const messages = encodeTableSysEx(deviceId, slot, table);

  for (let i = 0; i < messages.length; i++) {
    midi.send(messages[i]);
    if (onProgress) onProgress(i + 1, 64);
    // Wait between messages to avoid overwhelming the Blofeld
    await new Promise(r => setTimeout(r, 80));
  }
}

// ── Preview via Web Audio ────────────────────────────────────────

let previewCtx = null;
let previewOsc = null;

export function previewWave(wave, frequency = 220) {
  stopPreview();
  previewCtx = new AudioContext();
  const buffer = previewCtx.createBuffer(1, SAMPLES_PER_WAVE, previewCtx.sampleRate);
  const channel = buffer.getChannelData(0);

  // Resample wave to fill buffer at the correct frequency
  const samplesNeeded = Math.floor(previewCtx.sampleRate / frequency);
  const fullBuffer = previewCtx.createBuffer(1, samplesNeeded, previewCtx.sampleRate);
  const fullChannel = fullBuffer.getChannelData(0);
  for (let i = 0; i < samplesNeeded; i++) {
    const idx = (i / samplesNeeded) * SAMPLES_PER_WAVE;
    const lo = Math.floor(idx);
    const hi = (lo + 1) % SAMPLES_PER_WAVE;
    const frac = idx - lo;
    fullChannel[i] = wave[lo] * (1 - frac) + wave[hi] * frac;
  }

  const source = previewCtx.createBufferSource();
  source.buffer = fullBuffer;
  source.loop = true;

  const gain = previewCtx.createGain();
  gain.gain.value = 0.3;

  source.connect(gain);
  gain.connect(previewCtx.destination);
  source.start();
  previewOsc = { source, gain };
}

export function stopPreview() {
  if (previewOsc) {
    previewOsc.source.stop();
    previewOsc = null;
  }
  if (previewCtx) {
    previewCtx.close();
    previewCtx = null;
  }
}

// ── Drawing ──────────────────────────────────────────────────────

export function drawWaveOnCanvas(canvas, wave, color = '#e8e8e8') {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Center line
  ctx.strokeStyle = '#1e1e1e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  // Waveform
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < SAMPLES_PER_WAVE; i++) {
    const x = (i / (SAMPLES_PER_WAVE - 1)) * w;
    const y = h / 2 - wave[i] * (h / 2 - 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

export function draw3DTable(canvas, table, color = '#e8e8e8') {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const offsetX = 2;
  const offsetY = -1.5;
  const waveH = h * 0.35;
  const baseY = h * 0.85;

  for (let wIdx = 0; wIdx < 64; wIdx += 2) {
    const wave = table.waves[wIdx];
    const alpha = 0.15 + (wIdx / 63) * 0.85;
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i < SAMPLES_PER_WAVE; i++) {
      const x = (i / (SAMPLES_PER_WAVE - 1)) * (w * 0.7) + wIdx * offsetX;
      const y = baseY + wIdx * offsetY - wave[i] * waveH * 0.3;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ── Preset tables ────────────────────────────────────────────────

export const TABLE_PRESETS = [
  { name: 'Harmonic Sweep', fn: generateHarmonicSweep },
  { name: 'FM Sweep', fn: generateFMSweep },
  { name: 'PWM Sweep', fn: generatePWMSweep },
  { name: 'Formant Sweep', fn: generateFormantSweep },
];

export { WAVES_PER_TABLE, SAMPLES_PER_WAVE, USER_SLOT_START, USER_SLOT_END };
