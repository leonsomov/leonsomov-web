// Waldorf Blofeld SysEx Engine
// Encode/decode all SysEx message types per spec v1.04

const WALDORF_ID = 0x3E;
const BLOFELD_ID = 0x13;

// Message IDs
const MSG = {
  SNDR: 0x00,  // Sound Request
  SNDD: 0x10,  // Sound Dump
  SNDP: 0x20,  // Sound Parameter Change
  MULR: 0x01,  // Multi Request
  MULD: 0x11,  // Multi Dump
  GLBR: 0x04,  // Global Request
  GLBD: 0x14,  // Global Dump
  WTBR: 0x02,  // Wavetable Request
  WTBD: 0x12,  // Wavetable Dump
};

// Banks
export const BANKS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function checksum(data) {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  return sum & 0x7F;
}

// ── Sound Request ────────────────────────────────────────────────────

export function soundRequest(deviceId, bank, program) {
  return new Uint8Array([
    0xF0, WALDORF_ID, BLOFELD_ID, deviceId,
    MSG.SNDR, bank, program,
    0xF7
  ]);
}

export function editBufferRequest(deviceId) {
  return soundRequest(deviceId, 0x7F, 0x00);
}

// ── Sound Dump ───────────────────────────────────────────────────────

export function encodeSoundDump(deviceId, bank, program, sdata) {
  if (sdata.length !== 383) throw new Error(`SDATA must be 383 bytes, got ${sdata.length}`);
  const msg = new Uint8Array(392);
  msg[0] = 0xF0;
  msg[1] = WALDORF_ID;
  msg[2] = BLOFELD_ID;
  msg[3] = deviceId;
  msg[4] = MSG.SNDD;
  msg[5] = bank;
  msg[6] = program;
  msg.set(sdata, 7);
  msg[390] = checksum(sdata);
  msg[391] = 0xF7;
  return msg;
}

export function encodeSoundToEditBuffer(deviceId, sdata) {
  return encodeSoundDump(deviceId, 0x7F, 0x00, sdata);
}

export function decodeSoundDump(msg) {
  if (msg.length < 392) return null;
  if (msg[0] !== 0xF0 || msg[1] !== WALDORF_ID || msg[2] !== BLOFELD_ID) return null;
  if (msg[4] !== MSG.SNDD) return null;

  const bank = msg[5];
  const program = msg[6];
  const sdata = msg.slice(7, 390);
  const chk = msg[390];
  const computed = checksum(sdata);

  if (chk !== 0x7F && chk !== computed) {
    console.warn(`Checksum mismatch: expected ${computed}, got ${chk}`);
  }

  return {
    deviceId: msg[3],
    bank,
    program,
    data: sdata,
    name: decodePatchName(sdata),
    isEditBuffer: bank === 0x7F,
  };
}

// ── Sound Parameter Change (real-time) ───────────────────────────────

export function parameterChange(deviceId, location, paramIndex, value) {
  const hh = (paramIndex >> 7) & 0x7F;
  const pp = paramIndex & 0x7F;
  return new Uint8Array([
    0xF0, WALDORF_ID, BLOFELD_ID, deviceId,
    MSG.SNDP, location, hh, pp, value,
    0xF7
  ]);
}

export function decodeParameterChange(msg) {
  if (msg.length < 10) return null;
  if (msg[4] !== MSG.SNDP) return null;
  return {
    deviceId: msg[3],
    location: msg[5],
    paramIndex: (msg[6] << 7) | msg[7],
    value: msg[8],
  };
}

// ── Global Request / Dump ────────────────────────────────────────────

export function globalRequest(deviceId) {
  return new Uint8Array([
    0xF0, WALDORF_ID, BLOFELD_ID, deviceId,
    MSG.GLBR,
    0xF7
  ]);
}

export function decodeGlobalDump(msg) {
  if (msg[4] !== MSG.GLBD) return null;
  return {
    deviceId: msg[3],
    data: msg.slice(5, 77),
  };
}

// ── Multi Request / Dump ─────────────────────────────────────────────

export function multiRequest(deviceId, slot) {
  return new Uint8Array([
    0xF0, WALDORF_ID, BLOFELD_ID, deviceId,
    MSG.MULR, 0x00, slot,
    0xF7
  ]);
}

export function multiEditBufferRequest(deviceId) {
  return new Uint8Array([
    0xF0, WALDORF_ID, BLOFELD_ID, deviceId,
    MSG.MULR, 0x20, 0x00,
    0xF7
  ]);
}

// ── Patch Name ───────────────────────────────────────────────────────

export function decodePatchName(sdata) {
  let name = '';
  for (let i = 363; i < 379; i++) {
    name += String.fromCharCode(sdata[i] || 32);
  }
  return name.trimEnd();
}

export function encodePatchName(sdata, name) {
  const padded = name.padEnd(16, ' ').substring(0, 16);
  for (let i = 0; i < 16; i++) {
    sdata[363 + i] = padded.charCodeAt(i) & 0x7F;
  }
}

// ── SysEx Message Parser ─────────────────────────────────────────────

export function parseMessage(msg) {
  if (!(msg instanceof Uint8Array)) msg = new Uint8Array(msg);
  if (msg[0] !== 0xF0 || msg[1] !== WALDORF_ID || msg[2] !== BLOFELD_ID) {
    return null;
  }

  const idm = msg[4];
  switch (idm) {
    case MSG.SNDD: return { type: 'soundDump', ...decodeSoundDump(msg) };
    case MSG.SNDP: return { type: 'paramChange', ...decodeParameterChange(msg) };
    case MSG.GLBD: return { type: 'globalDump', ...decodeGlobalDump(msg) };
    case MSG.MULD: return { type: 'multiDump', deviceId: msg[3], data: msg.slice(7, msg.length - 2) };
    default: return { type: 'unknown', idm };
  }
}

// ── .syx file handling ───────────────────────────────────────────────

export function parseSyxFile(buffer) {
  const data = new Uint8Array(buffer);
  const sounds = [];
  let i = 0;

  while (i < data.length) {
    if (data[i] !== 0xF0) { i++; continue; }

    // Find the end of this SysEx message
    let end = i + 1;
    while (end < data.length && data[end] !== 0xF7) end++;
    if (end >= data.length) break;
    end++; // include F7

    const msg = data.slice(i, end);
    if (msg.length >= 392 && msg[1] === WALDORF_ID && msg[2] === BLOFELD_ID && msg[4] === MSG.SNDD) {
      const parsed = decodeSoundDump(msg);
      if (parsed) sounds.push(parsed);
    }

    i = end;
  }

  return sounds;
}

export function buildSyxFile(sounds) {
  // Calculate total size
  let totalSize = 0;
  for (const s of sounds) totalSize += 392;

  const buffer = new Uint8Array(totalSize);
  let offset = 0;
  for (const s of sounds) {
    const msg = encodeSoundDump(s.deviceId || 0x00, s.bank, s.program, s.data);
    buffer.set(msg, offset);
    offset += 392;
  }
  return buffer;
}
