// Waldorf Blofeld Complete Parameter Map
// Source: Official SysEx Specification v1.04
// All byte offsets relative to SDATA start (byte 7 of SNDD message)

// ─── Enumerated Values ───────────────────────────────────────────────

export const OSC_SHAPES = [
  'off', 'Pulse', 'Saw', 'Triangle', 'Sine',
  'Alt 1', 'Alt 2', 'Resonant', 'Resonant2', 'MalletSyn',
  'Sqr-Sweep', 'Bellish', 'Pul-Sweep', 'Saw-Sweep', 'MellowSaw',
  'Feedback', 'Add Harm', 'Reso 3 HP', 'Wind Syn', 'High Harm',
  'Clipper', 'Organ Syn', 'SquareSaw', 'Formant 1', 'Polated',
  'Transient', 'ElectricP', 'Robotic', 'StrongHrm', 'PercOrgan',
  'ClipSweep', 'ResoHarms', '2 Echoes', 'Formant 2', 'FmntVocal',
  'MicroSync', 'Micro PWM', 'Glassy', 'Square HP', 'SawSync 1',
  'SawSync 2', 'SawSync 3', 'PulSync 1', 'PulSync 2', 'PulSync 3',
  'SinSync 1', 'SinSync 2', 'SinSync 3', 'PWM Pulse', 'PWM Saw',
  'Fuzz Wave', 'Distorted', 'HeavyFuzz', 'Fuzz Sync', 'K+Strong1',
  'K+Strong2', 'K+Strong3', '1-2-3-4-5', '19/twenty', 'Wavetrip1',
  'Wavetrip2', 'Wavetrip3', 'Wavetrip4', 'MaleVoice', 'Low Piano',
  'ResoSweep', 'Xmas Bell', 'FM Piano', 'Fat Organ', 'Vibes',
  'Chorus 2', 'True PWM', 'UpperWaves'
];

export const OSC3_SHAPES = ['off', 'Pulse', 'Saw', 'Triangle', 'Sine'];

export const FM_SOURCES = [
  'off', 'Osc 1', 'Osc 2', 'Osc 3', 'Noise',
  'LFO 1', 'LFO 2', 'LFO 3', 'FilterEnv', 'AmpEnv', 'Env3', 'Env4'
];

export const MOD_SOURCES = [
  'off', 'LFO 1', 'LFO1*MW', 'LFO 2', 'LFO2*Press', 'LFO 3',
  'FilterEnv', 'AmpEnv', 'Env3', 'Env4', 'Keytrack', 'Velocity',
  'Rel. Velo', 'Pressure', 'Poly Press', 'Pitch Bend', 'Mod Wheel',
  'Sustain', 'Foot Ctrl', 'BreathCtrl', 'Control W', 'Control X',
  'Control Y', 'Control Z', 'Unisono V.', 'Modifier 1', 'Modifier 2',
  'Modifier 3', 'Modifier 4', 'minimum', 'MAXIMUM'
];

export const MOD_DESTINATIONS = [
  'Pitch', 'O1 Pitch', 'O1 FM', 'O1 PW/Wave', 'O2 Pitch', 'O2 FM',
  'O2 PW/Wave', 'O3 Pitch', 'O3 FM', 'O3 PW', 'O1 Level', 'O1 Balance',
  'O2 Level', 'O2 Balance', 'O3 Level', 'O3 Balance', 'RMod Level',
  'RMod Bal.', 'NoiseLevel', 'Noise Bal.', 'F1 Cutoff', 'F1 Reson.',
  'F1 FM', 'F1 Drive', 'F1 Pan', 'F2 Cutoff', 'F2 Reson.', 'F2 FM',
  'F2 Drive', 'F2 Pan', 'Volume', 'LFO1Speed', 'LFO2Speed', 'LFO3Speed',
  'FE Attack', 'FE Decay', 'FE Sustain', 'FE Release',
  'AE Attack', 'AE Decay', 'AE Sustain', 'AE Release',
  'E3 Attack', 'E3 Decay', 'E3 Sustain', 'E3 Release',
  'E4 Attack', 'E4 Decay', 'E4 Sustain', 'E4 Release',
  'M1 Amount', 'M2 Amount', 'M3 Amount', 'M4 Amount'
];

export const FILTER_TYPES = [
  'Bypass', 'LP 24dB', 'LP 12dB', 'BP 24dB', 'BP 12dB',
  'HP 24dB', 'HP 12dB', 'Notch 24dB', 'Notch 12dB',
  'Comb+', 'Comb-', 'PPG LP'
];

export const LFO_SHAPES = ['Sine', 'Triangle', 'Square', 'Saw', 'Random', 'S&H'];

export const GLIDE_MODES = ['Portamento', 'Fingered Port.', 'Glissando', 'Fingered Gliss.'];

export const DRIVE_CURVES = [
  'Clipping', 'Tube', 'Hard', 'Medium', 'Soft', 'Pickup 1',
  'Pickup 2', 'Rectifier', 'Square', 'Binary', 'Overflow',
  'Sine Shaper', 'Osc 1 Mod'
];

export const MODIFIER_OPS = ['+', '-', '*', 'AND', 'OR', 'XOR', 'MAX', 'min'];

export const ENV_MODES = ['ADSR', 'ADS1DS2R', 'One Shot', 'Loop S1S2', 'Loop All'];
export const ENV_TRIGGERS = ['normal', 'single'];

export const ARP_MODES = ['off', 'on', 'One Shot', 'Hold'];
export const ARP_DIRECTIONS = ['Up', 'Down', 'Alt Up', 'Alt Down'];
export const ARP_SORT_ORDERS = ['as played', 'reversed', 'Key Lo>Hi', 'Key Hi>Lo', 'Vel Lo>Hi', 'Vel Hi>Lo'];
export const ARP_VELOCITY_MODES = ['Each Note', 'First Note', 'Last Note', 'fix 32', 'fix 64', 'fix 100', 'fix 127'];

export const ARP_CLOCKS = [
  '1/96', '1/48', '1/32', '1/16T', '1/32.', '1/16', '1/8T', '1/16.',
  '1/8', '1/4T', '1/8.', '1/4', '1/2T', '1/4.', '1/2', '1/1T',
  '1/2.', '1 bar', '1.5 bars', '2 bars', '2.5 bars', '3 bars',
  '3.5 bars', '4 bars', '5 bars', '6 bars', '7 bars', '8 bars',
  '9 bars', '10 bars', '12 bars', '14 bars', '16 bars', '18 bars',
  '20 bars', '24 bars', '28 bars', '32 bars', '36 bars', '40 bars',
  '48 bars', '56 bars', '64 bars'
];

export const CATEGORIES = [
  'Init', 'Arp', 'Atmo', 'Bass', 'Drum', 'FX', 'Keys',
  'Lead', 'Mono', 'Pad', 'Perc', 'Poly', 'Seq'
];

export const FX_TYPES_1 = ['Bypass', 'Chorus', 'Flanger', 'Phaser', 'Overdrive', 'Triple FX'];
export const FX_TYPES_2 = ['Bypass', 'Chorus', 'Flanger', 'Phaser', 'Overdrive', 'Triple FX', 'Delay', 'Clk.Delay', 'Reverb'];

export const FILTER_ROUTING = ['parallel', 'serial'];

export const OCTAVE_VALUES = {16: "128'", 28: "64'", 40: "32'", 52: "16'", 64: "8'", 76: "4'", 88: "2'", 100: "1'", 112: "1/2'"};

// ─── Display Formatters ──────────────────────────────────────────────

const fmt = {
  raw:     v => v,
  signed:  v => v - 64,
  octave:  v => OCTAVE_VALUES[v] || `${v}`,
  semi:    v => v - 64,
  detune:  v => v - 64,
  bend:    v => v - 64,
  keytrack: v => `${Math.round((v - 64) * 200 / 64)}%`,
  pan:     v => v === 64 ? 'center' : v < 64 ? `L${64 - v}` : `R${v - 64}`,
  balance: v => v === 64 ? 'center' : v < 64 ? `F1 ${64 - v}` : `F2 ${v - 64}`,
  onOff:   v => v ? 'on' : 'off',
  phase:   v => v === 0 ? 'free' : `${Math.round(v * 355 / 127)}°`,
  tempo:   v => Math.round(40 + v * (300 - 40) / 127),
};

// ─── Parameter Definition Helper ─────────────────────────────────────

// type: 'knob' | 'dropdown' | 'toggle' | 'name' | 'bitfield'
// section: UI grouping
function p(index, name, min, max, type, options = {}) {
  return { index, name, min, max, type, ...options };
}

// ─── Complete Parameter Map (383 bytes) ──────────────────────────────

export const PARAMS = {
  // ── Oscillator 1 ──
  osc1: {
    label: 'Oscillator 1',
    params: [
      p(1,  'Octave',     16, 112, 'knob',     { step: 12, fmt: fmt.octave }),
      p(2,  'Semitone',   52,  76, 'knob',     { fmt: fmt.semi }),
      p(3,  'Detune',      0, 127, 'knob',     { fmt: fmt.detune }),
      p(4,  'Bend Range', 40,  88, 'knob',     { fmt: fmt.bend }),
      p(5,  'Keytrack',    0, 127, 'knob',     { fmt: fmt.keytrack }),
      p(6,  'FM Source',   0,  11, 'dropdown', { values: FM_SOURCES }),
      p(7,  'FM Amount',   0, 127, 'knob'),
      p(8,  'Shape',       0,  72, 'dropdown', { values: OSC_SHAPES }),
      p(9,  'Pulsewidth',  0, 127, 'knob'),
      p(10, 'PWM Source',  0,  30, 'dropdown', { values: MOD_SOURCES }),
      p(11, 'PWM Amount',  0, 127, 'knob',     { fmt: fmt.signed }),
      p(14, 'Limit WT',    0,   1, 'toggle'),
      p(16, 'Brilliance',  0, 127, 'knob'),
    ]
  },

  // ── Oscillator 2 ──
  osc2: {
    label: 'Oscillator 2',
    params: [
      p(17, 'Octave',     16, 112, 'knob',     { step: 12, fmt: fmt.octave }),
      p(18, 'Semitone',   52,  76, 'knob',     { fmt: fmt.semi }),
      p(19, 'Detune',      0, 127, 'knob',     { fmt: fmt.detune }),
      p(20, 'Bend Range', 40,  88, 'knob',     { fmt: fmt.bend }),
      p(21, 'Keytrack',    0, 127, 'knob',     { fmt: fmt.keytrack }),
      p(22, 'FM Source',   0,  11, 'dropdown', { values: FM_SOURCES }),
      p(23, 'FM Amount',   0, 127, 'knob'),
      p(24, 'Shape',       0,  72, 'dropdown', { values: OSC_SHAPES }),
      p(25, 'Pulsewidth',  0, 127, 'knob'),
      p(26, 'PWM Source',  0,  30, 'dropdown', { values: MOD_SOURCES }),
      p(27, 'PWM Amount',  0, 127, 'knob',     { fmt: fmt.signed }),
      p(30, 'Limit WT',    0,   1, 'toggle'),
      p(32, 'Brilliance',  0, 127, 'knob'),
    ]
  },

  // ── Oscillator 3 ──
  osc3: {
    label: 'Oscillator 3',
    params: [
      p(33, 'Octave',     16, 112, 'knob',     { step: 12, fmt: fmt.octave }),
      p(34, 'Semitone',   52,  76, 'knob',     { fmt: fmt.semi }),
      p(35, 'Detune',      0, 127, 'knob',     { fmt: fmt.detune }),
      p(36, 'Bend Range', 40,  88, 'knob',     { fmt: fmt.bend }),
      p(37, 'Keytrack',    0, 127, 'knob',     { fmt: fmt.keytrack }),
      p(38, 'FM Source',   0,  11, 'dropdown', { values: FM_SOURCES }),
      p(39, 'FM Amount',   0, 127, 'knob'),
      p(40, 'Shape',       0,   4, 'dropdown', { values: OSC3_SHAPES }),
      p(41, 'Pulsewidth',  0, 127, 'knob'),
      p(42, 'PWM Source',  0,  30, 'dropdown', { values: MOD_SOURCES }),
      p(43, 'PWM Amount',  0, 127, 'knob',     { fmt: fmt.signed }),
      p(48, 'Brilliance',  0, 127, 'knob'),
    ]
  },

  // ── Oscillator Common ──
  oscCommon: {
    label: 'Osc Common',
    params: [
      p(49, 'Osc2→3 Sync', 0,   1, 'toggle'),
      p(50, 'Pitch Src',   0,  30, 'dropdown', { values: MOD_SOURCES }),
      p(51, 'Pitch Amt',   0, 127, 'knob',     { fmt: fmt.signed }),
      p(53, 'Glide',       0,   1, 'toggle'),
      p(56, 'Glide Mode',  0,   3, 'dropdown', { values: GLIDE_MODES }),
      p(57, 'Glide Rate',  0, 127, 'knob'),
      p(58, 'Voice Mode',  0,   1, 'dropdown', { values: ['Poly', 'Mono'] }),
      p(59, 'Uni Detune',  0, 127, 'knob'),
    ]
  },

  // ── Mixer ──
  mixer: {
    label: 'Mixer',
    params: [
      p(61, 'Osc 1 Level',   0, 127, 'knob'),
      p(62, 'Osc 1 Balance', 0, 127, 'knob', { fmt: fmt.balance }),
      p(63, 'Osc 2 Level',   0, 127, 'knob'),
      p(64, 'Osc 2 Balance', 0, 127, 'knob', { fmt: fmt.balance }),
      p(65, 'Osc 3 Level',   0, 127, 'knob'),
      p(66, 'Osc 3 Balance', 0, 127, 'knob', { fmt: fmt.balance }),
      p(67, 'Noise Level',   0, 127, 'knob'),
      p(68, 'Noise Balance', 0, 127, 'knob', { fmt: fmt.balance }),
      p(69, 'Noise Colour',  0, 127, 'knob', { fmt: fmt.signed }),
      p(71, 'RingMod Level', 0, 127, 'knob'),
      p(72, 'RingMod Bal.',  0, 127, 'knob', { fmt: fmt.balance }),
    ]
  },

  // ── Filter 1 ──
  filter1: {
    label: 'Filter 1',
    params: [
      p(77,  'Type',       0,  11, 'dropdown', { values: FILTER_TYPES }),
      p(78,  'Cutoff',     0, 127, 'knob'),
      p(80,  'Resonance',  0, 127, 'knob'),
      p(81,  'Drive',      0, 127, 'knob'),
      p(82,  'Drive Curve',0,  12, 'dropdown', { values: DRIVE_CURVES }),
      p(86,  'Keytrack',   0, 127, 'knob',     { fmt: fmt.keytrack }),
      p(87,  'Env Amount', 0, 127, 'knob',     { fmt: fmt.signed }),
      p(88,  'Env Velocity',0,127, 'knob',     { fmt: fmt.signed }),
      p(89,  'Mod Source', 0,  30, 'dropdown', { values: MOD_SOURCES }),
      p(90,  'Mod Amount', 0, 127, 'knob',     { fmt: fmt.signed }),
      p(91,  'FM Source',  0,  11, 'dropdown', { values: FM_SOURCES }),
      p(92,  'FM Amount',  0, 127, 'knob'),
      p(93,  'Pan',        0, 127, 'knob',     { fmt: fmt.pan }),
      p(94,  'Pan Source', 0,  30, 'dropdown', { values: MOD_SOURCES }),
      p(95,  'Pan Amount', 0, 127, 'knob',     { fmt: fmt.signed }),
    ]
  },

  // ── Filter 2 ──
  filter2: {
    label: 'Filter 2',
    params: [
      p(97,  'Type',       0,  11, 'dropdown', { values: FILTER_TYPES }),
      p(98,  'Cutoff',     0, 127, 'knob'),
      p(100, 'Resonance',  0, 127, 'knob'),
      p(101, 'Drive',      0, 127, 'knob'),
      p(102, 'Drive Curve',0,  12, 'dropdown', { values: DRIVE_CURVES }),
      p(106, 'Keytrack',   0, 127, 'knob',     { fmt: fmt.keytrack }),
      p(107, 'Env Amount', 0, 127, 'knob',     { fmt: fmt.signed }),
      p(108, 'Env Velocity',0,127, 'knob',     { fmt: fmt.signed }),
      p(109, 'Mod Source', 0,  30, 'dropdown', { values: MOD_SOURCES }),
      p(110, 'Mod Amount', 0, 127, 'knob',     { fmt: fmt.signed }),
      p(111, 'FM Source',  0,  11, 'dropdown', { values: FM_SOURCES }),
      p(112, 'FM Amount',  0, 127, 'knob'),
      p(113, 'Pan',        0, 127, 'knob',     { fmt: fmt.pan }),
      p(114, 'Pan Source', 0,  30, 'dropdown', { values: MOD_SOURCES }),
      p(115, 'Pan Amount', 0, 127, 'knob',     { fmt: fmt.signed }),
    ]
  },

  // ── Filter Routing ──
  filterRouting: {
    label: 'Filter Routing',
    params: [
      p(117, 'Routing', 0, 1, 'dropdown', { values: FILTER_ROUTING }),
    ]
  },

  // ── Amplifier ──
  amplifier: {
    label: 'Amplifier',
    params: [
      p(121, 'Volume',     0, 127, 'knob'),
      p(122, 'Velocity',   0, 127, 'knob', { fmt: fmt.signed }),
      p(123, 'Mod Source',  0,  30, 'dropdown', { values: MOD_SOURCES }),
      p(124, 'Mod Amount', 0, 127, 'knob', { fmt: fmt.signed }),
    ]
  },

  // ── Effect 1 ──
  fx1: {
    label: 'Effect 1',
    params: [
      p(128, 'Type', 0, 5, 'dropdown', { values: FX_TYPES_1 }),
      p(129, 'Mix',  0, 127, 'knob'),
      p(130, 'Param 1', 0, 127, 'knob'),
      p(131, 'Param 2', 0, 127, 'knob'),
      p(132, 'Param 3', 0, 127, 'knob'),
      p(133, 'Param 4', 0, 127, 'knob'),
      p(134, 'Param 5', 0, 127, 'knob'),
      p(135, 'Param 6', 0, 127, 'knob'),
      p(136, 'Param 7', 0, 127, 'knob'),
      p(137, 'Param 8', 0, 127, 'knob'),
      p(138, 'Param 9', 0, 127, 'knob'),
      p(139, 'Param 10', 0, 127, 'knob'),
      p(140, 'Param 11', 0, 127, 'knob'),
      p(141, 'Param 12', 0, 127, 'knob'),
      p(142, 'Param 13', 0, 127, 'knob'),
      p(143, 'Param 14', 0, 127, 'knob'),
    ]
  },

  // ── Effect 2 ──
  fx2: {
    label: 'Effect 2',
    params: [
      p(144, 'Type', 0, 8, 'dropdown', { values: FX_TYPES_2 }),
      p(145, 'Mix',  0, 127, 'knob'),
      p(146, 'Param 1', 0, 127, 'knob'),
      p(147, 'Param 2', 0, 127, 'knob'),
      p(148, 'Param 3', 0, 127, 'knob'),
      p(149, 'Param 4', 0, 127, 'knob'),
      p(150, 'Param 5', 0, 127, 'knob'),
      p(151, 'Param 6', 0, 127, 'knob'),
      p(152, 'Param 7', 0, 127, 'knob'),
      p(153, 'Param 8', 0, 127, 'knob'),
      p(154, 'Param 9', 0, 127, 'knob'),
      p(155, 'Param 10', 0, 127, 'knob'),
      p(156, 'Param 11', 0, 127, 'knob'),
      p(157, 'Param 12', 0, 127, 'knob'),
      p(158, 'Param 13', 0, 127, 'knob'),
      p(159, 'Param 14', 0, 127, 'knob'),
    ]
  },

  // ── LFO 1 ──
  lfo1: {
    label: 'LFO 1',
    params: [
      p(160, 'Shape',       0,   5, 'dropdown', { values: LFO_SHAPES }),
      p(161, 'Speed',       0, 127, 'knob'),
      p(163, 'Sync',        0,   1, 'toggle'),
      p(164, 'Clocked',     0,   1, 'toggle'),
      p(165, 'Start Phase', 0, 127, 'knob', { fmt: fmt.phase }),
      p(166, 'Delay',       0, 127, 'knob'),
      p(167, 'Fade',        0, 127, 'knob', { fmt: fmt.signed }),
      p(170, 'Keytrack',    0, 127, 'knob', { fmt: fmt.keytrack }),
    ]
  },

  // ── LFO 2 ──
  lfo2: {
    label: 'LFO 2',
    params: [
      p(172, 'Shape',       0,   5, 'dropdown', { values: LFO_SHAPES }),
      p(173, 'Speed',       0, 127, 'knob'),
      p(175, 'Sync',        0,   1, 'toggle'),
      p(176, 'Clocked',     0,   1, 'toggle'),
      p(177, 'Start Phase', 0, 127, 'knob', { fmt: fmt.phase }),
      p(178, 'Delay',       0, 127, 'knob'),
      p(179, 'Fade',        0, 127, 'knob', { fmt: fmt.signed }),
      p(182, 'Keytrack',    0, 127, 'knob', { fmt: fmt.keytrack }),
    ]
  },

  // ── LFO 3 ──
  lfo3: {
    label: 'LFO 3',
    params: [
      p(184, 'Shape',       0,   5, 'dropdown', { values: LFO_SHAPES }),
      p(185, 'Speed',       0, 127, 'knob'),
      p(187, 'Sync',        0,   1, 'toggle'),
      p(188, 'Clocked',     0,   1, 'toggle'),
      p(189, 'Start Phase', 0, 127, 'knob', { fmt: fmt.phase }),
      p(190, 'Delay',       0, 127, 'knob'),
      p(191, 'Fade',        0, 127, 'knob', { fmt: fmt.signed }),
      p(194, 'Keytrack',    0, 127, 'knob', { fmt: fmt.keytrack }),
    ]
  },

  // ── Filter Envelope ──
  envFilter: {
    label: 'Filter Envelope',
    params: [
      p(196, 'Mode',         0,   4, 'dropdown', { values: ENV_MODES }),
      p(199, 'Attack',       0, 127, 'knob'),
      p(200, 'Attack Level', 0, 127, 'knob'),
      p(201, 'Decay',        0, 127, 'knob'),
      p(202, 'Sustain',      0, 127, 'knob'),
      p(203, 'Decay 2',      0, 127, 'knob'),
      p(204, 'Sustain 2',    0, 127, 'knob'),
      p(205, 'Release',      0, 127, 'knob'),
    ]
  },

  // ── Amplifier Envelope ──
  envAmp: {
    label: 'Amp Envelope',
    params: [
      p(208, 'Mode',         0,   4, 'dropdown', { values: ENV_MODES }),
      p(211, 'Attack',       0, 127, 'knob'),
      p(212, 'Attack Level', 0, 127, 'knob'),
      p(213, 'Decay',        0, 127, 'knob'),
      p(214, 'Sustain',      0, 127, 'knob'),
      p(215, 'Decay 2',      0, 127, 'knob'),
      p(216, 'Sustain 2',    0, 127, 'knob'),
      p(217, 'Release',      0, 127, 'knob'),
    ]
  },

  // ── Envelope 3 ──
  env3: {
    label: 'Envelope 3',
    params: [
      p(220, 'Mode',         0,   4, 'dropdown', { values: ENV_MODES }),
      p(223, 'Attack',       0, 127, 'knob'),
      p(224, 'Attack Level', 0, 127, 'knob'),
      p(225, 'Decay',        0, 127, 'knob'),
      p(226, 'Sustain',      0, 127, 'knob'),
      p(227, 'Decay 2',      0, 127, 'knob'),
      p(228, 'Sustain 2',    0, 127, 'knob'),
      p(229, 'Release',      0, 127, 'knob'),
    ]
  },

  // ── Envelope 4 ──
  env4: {
    label: 'Envelope 4',
    params: [
      p(232, 'Mode',         0,   4, 'dropdown', { values: ENV_MODES }),
      p(235, 'Attack',       0, 127, 'knob'),
      p(236, 'Attack Level', 0, 127, 'knob'),
      p(237, 'Decay',        0, 127, 'knob'),
      p(238, 'Sustain',      0, 127, 'knob'),
      p(239, 'Decay 2',      0, 127, 'knob'),
      p(240, 'Sustain 2',    0, 127, 'knob'),
      p(241, 'Release',      0, 127, 'knob'),
    ]
  },

  // ── Modifiers ──
  modifiers: {
    label: 'Modifiers',
    params: [
      p(245, 'Mod1 Src A',  0, 30, 'dropdown', { values: MOD_SOURCES }),
      p(246, 'Mod1 Src B',  0, 30, 'dropdown', { values: MOD_SOURCES }),
      p(247, 'Mod1 Op',     0,  7, 'dropdown', { values: MODIFIER_OPS }),
      p(248, 'Mod1 Const',  0, 127, 'knob',    { fmt: fmt.signed }),
      p(249, 'Mod2 Src A',  0, 30, 'dropdown', { values: MOD_SOURCES }),
      p(250, 'Mod2 Src B',  0, 30, 'dropdown', { values: MOD_SOURCES }),
      p(251, 'Mod2 Op',     0,  7, 'dropdown', { values: MODIFIER_OPS }),
      p(252, 'Mod2 Const',  0, 127, 'knob',    { fmt: fmt.signed }),
      p(253, 'Mod3 Src A',  0, 30, 'dropdown', { values: MOD_SOURCES }),
      p(254, 'Mod3 Src B',  0, 30, 'dropdown', { values: MOD_SOURCES }),
      p(255, 'Mod3 Op',     0,  7, 'dropdown', { values: MODIFIER_OPS }),
      p(256, 'Mod3 Const',  0, 127, 'knob',    { fmt: fmt.signed }),
      p(257, 'Mod4 Src A',  0, 30, 'dropdown', { values: MOD_SOURCES }),
      p(258, 'Mod4 Src B',  0, 30, 'dropdown', { values: MOD_SOURCES }),
      p(259, 'Mod4 Op',     0,  7, 'dropdown', { values: MODIFIER_OPS }),
      p(260, 'Mod4 Const',  0, 127, 'knob',    { fmt: fmt.signed }),
    ]
  },

  // ── Modulation Matrix (16 slots) ──
  modMatrix: {
    label: 'Mod Matrix',
    slots: 16,
    params: Array.from({ length: 16 }, (_, i) => ({
      source: p(261 + i * 3, `Slot ${i + 1} Src`, 0, 30, 'dropdown', { values: MOD_SOURCES }),
      dest:   p(262 + i * 3, `Slot ${i + 1} Dst`, 0, 53, 'dropdown', { values: MOD_DESTINATIONS }),
      amount: p(263 + i * 3, `Slot ${i + 1} Amt`, 0, 127, 'knob',    { fmt: fmt.signed }),
    }))
  },

  // ── Arpeggiator ──
  arpeggiator: {
    label: 'Arpeggiator',
    params: [
      p(311, 'Mode',        0,   3, 'dropdown', { values: ARP_MODES }),
      p(312, 'Pattern',     0,  16, 'knob'),
      p(314, 'Clock',       0,  42, 'dropdown', { values: ARP_CLOCKS }),
      p(315, 'Length',       0,  43, 'knob'),
      p(316, 'Octave',      0,   9, 'knob'),
      p(317, 'Direction',   0,   3, 'dropdown', { values: ARP_DIRECTIONS }),
      p(318, 'Sort Order',  0,   5, 'dropdown', { values: ARP_SORT_ORDERS }),
      p(319, 'Velocity',    0,   6, 'dropdown', { values: ARP_VELOCITY_MODES }),
      p(320, 'Timing',      0, 127, 'knob'),
      p(322, 'Ptn Reset',   0,   1, 'toggle'),
      p(323, 'Ptn Length',  0,  15, 'knob'),
      p(326, 'Tempo',       0, 127, 'knob',     { fmt: fmt.tempo }),
    ],
    // Pattern step data (indices 327-358) handled separately
    steps: Array.from({ length: 16 }, (_, i) => ({
      stepGlideAccent:  327 + i,  // 0sssgaaa
      timingLength:     343 + i,  // 0lll0ttt
    }))
  },

  // ── Name & Category ──
  meta: {
    label: 'Patch Info',
    params: [
      p(379, 'Category', 0, 12, 'dropdown', { values: CATEGORIES }),
    ],
    name: { start: 363, length: 16 }  // 16 ASCII chars
  },
};

// ── FX Parameter Names by Type ────────────────────────────────────────

export const FX_PARAM_NAMES = {
  0: {}, // Bypass - no params
  1: { // Chorus
    0: 'Speed', 1: 'Depth'
  },
  2: { // Flanger
    0: 'Speed', 1: 'Depth', 4: 'Feedback', 8: 'Polarity'
  },
  3: { // Phaser
    0: 'Speed', 1: 'Depth', 4: 'Feedback', 5: 'Center', 6: 'Spacing', 8: 'Polarity'
  },
  4: { // Overdrive
    1: 'Drive', 2: 'Post Gain', 5: 'Cutoff', 9: 'Curve'
  },
  5: { // Triple FX
    0: 'Speed', 1: 'Depth', 3: 'Chorus Mix', 4: 'S&H', 5: 'Overdrive'
  },
  6: { // Delay (FX2 only)
    3: 'Length', 4: 'Feedback', 5: 'Cutoff', 8: 'Polarity', 9: 'Spread'
  },
  7: { // Clk.Delay (FX2 only)
    4: 'Feedback', 5: 'Cutoff', 8: 'Polarity', 9: 'Spread', 10: 'Length'
  },
  8: { // Reverb (FX2 only)
    0: 'Size', 1: 'Shape', 2: 'Decay', 5: 'Lowpass', 6: 'Highpass', 7: 'Diffusion', 8: 'Damping'
  },
};

// ── Build flat index for fast lookup ──────────────────────────────────

export const PARAM_BY_INDEX = {};
for (const [sectionKey, section] of Object.entries(PARAMS)) {
  if (section.params) {
    for (const param of section.params) {
      PARAM_BY_INDEX[param.index] = { ...param, section: sectionKey };
    }
  }
  if (section.slots && section.params) {
    // Mod matrix
    for (const slot of section.params) {
      for (const param of Object.values(slot)) {
        PARAM_BY_INDEX[param.index] = { ...param, section: sectionKey };
      }
    }
  }
}

// ── Default init sound (383 bytes) ───────────────────────────────────

export function createInitSound() {
  const data = new Uint8Array(383);

  // Osc 1: Saw, 8'
  data[1] = 64;   // Octave 8'
  data[2] = 64;   // Semitone 0
  data[3] = 64;   // Detune 0
  data[4] = 66;   // Bend Range +2
  data[5] = 96;   // Keytrack 100%
  data[8] = 2;    // Shape: Saw
  data[9] = 127;  // Pulsewidth max

  // Osc 2: off but ready
  data[17] = 64; data[18] = 64; data[19] = 64; data[20] = 66; data[21] = 96;
  data[24] = 0;  // Shape: off
  data[25] = 127;

  // Osc 3: off
  data[33] = 52; data[34] = 64; data[35] = 64; data[36] = 66; data[37] = 96;
  data[40] = 0;  // Shape: off

  // Allocation: Poly
  data[58] = 0;

  // Mixer — all to Filter 1 only (balance=0)
  data[61] = 127; // Osc 1 Level
  data[62] = 0;   // Osc 1 Balance = F1 ONLY (not 64!)
  data[63] = 127; // Osc 2 Level (ready if shape enabled)
  data[64] = 0;   // Osc 2 Balance = F1 only
  data[65] = 127; // Osc 3 Level
  data[66] = 0;   // Osc 3 Balance = F1 only
  data[68] = 0;   // Noise Balance = F1 only
  data[72] = 0;   // RingMod Balance = F1 only

  // Filter 1: LP 24dB, wide open
  data[77] = 1;   // LP 24dB
  data[78] = 127; // Cutoff wide open
  data[80] = 0;   // Resonance 0
  data[86] = 64;  // Filter Keytrack 0% (factory default)
  data[87] = 64;  // Env Amount = center (no effect)
  data[88] = 64;  // Env Velocity = center
  data[93] = 64;  // Pan center

  // Filter 2: Bypass
  data[97] = 0;   // Bypass
  data[98] = 127; // Cutoff open
  data[106] = 64; // Keytrack 0%
  data[113] = 64; // Pan center

  // Filter routing: Parallel (factory default)
  data[117] = 0;  // PARALLEL (not serial!)

  // Amplifier
  data[121] = 127; // Volume max
  data[122] = 114; // Velocity +50 (factory default)

  // Amp Envelope
  data[211] = 0;   // Attack instant
  data[212] = 127; // Attack Level MAX (critical!)
  data[213] = 52;  // Decay medium
  data[214] = 127; // Sustain MAX
  data[216] = 127; // Sustain 2 MAX
  data[217] = 0;   // Release instant

  // Filter Envelope (neutral)
  data[199] = 0;   data[200] = 127; data[201] = 52; data[202] = 64;
  data[205] = 0;

  // Modifier constants at center
  data[248] = 64; data[252] = 64; data[256] = 64; data[260] = 64;

  // Patch name
  const name = 'Init            ';
  for (let i = 0; i < 16; i++) data[363 + i] = name.charCodeAt(i);
  data[379] = 0;
  return data;
}

// ── Arp pattern step encode/decode ───────────────────────────────────

export const ARP_STEP_TYPES = ['normal', 'pause', 'previous', 'first', 'last', 'first+last', 'chord', 'random'];

export function decodeArpStep(byte) {
  return {
    stepType: (byte >> 4) & 0x07,
    glide: (byte >> 3) & 0x01,
    accent: byte & 0x07,
  };
}

export function encodeArpStep(stepType, glide, accent) {
  return ((stepType & 0x07) << 4) | ((glide & 0x01) << 3) | (accent & 0x07);
}

export function decodeArpTiming(byte) {
  return {
    length: (byte >> 4) & 0x07,
    timing: byte & 0x07,
  };
}

export function encodeArpTiming(length, timing) {
  return ((length & 0x07) << 4) | (timing & 0x07);
}

// ── Envelope mode bitfield ───────────────────────────────────────────

export function decodeEnvMode(byte) {
  return {
    trigger: (byte >> 5) & 0x03,
    mode: byte & 0x1F,
  };
}

export function encodeEnvMode(trigger, mode) {
  return ((trigger & 0x03) << 5) | (mode & 0x1F);
}

// ── Allocation/Unisono bitfield ──────────────────────────────────────

export function decodeAllocation(byte) {
  return {
    allocation: byte & 0x01,  // 0=Poly, 1=Mono
    unisono: (byte >> 4) & 0x07,
  };
}

export function encodeAllocation(allocation, unisono) {
  return ((unisono & 0x07) << 4) | (allocation & 0x01);
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
