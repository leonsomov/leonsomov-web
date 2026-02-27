/**
 * generativeSequencer — Musical logic for the ambient generative synth.
 *
 * Controls:
 * - Chord rotation (4 chords, 25-45s cycle) with smooth frequency glides
 * - Melody engine (8 arpeggio patterns + mutation)
 * - Bowl strikes (raw Web Audio API bandpass resonators)
 * - Pad breathing (handled by LFO worklets in the patch)
 * - Full XY parameter mapping (filter, reverb, delay, density, character)
 * - Musical event emission for visual sync
 */

import { audioEngine } from '../engine/AudioEngine'
import type { PatchNodes } from './patchBuilder'

// ── Chord palette ──

interface Chord {
  pad: number[]
  melody: number[]
  drone: number
  name: string
}

const CHORDS: Chord[] = [
  {
    pad: [293.66, 440.00, 554.37],
    melody: [587.33, 659.26, 740.00, 880.00, 987.77, 1108.73, 1174.66],
    drone: 146.83,
    name: 'Dmaj7',
  },
  {
    pad: [392.00, 493.88, 587.33],
    melody: [587.33, 659.26, 784.00, 880.00, 987.77, 1174.66],
    drone: 196.00,
    name: 'Gmaj',
  },
  {
    pad: [329.63, 440.00, 554.37],
    melody: [554.37, 659.26, 740.00, 880.00, 1108.73, 1174.66],
    drone: 110.00,
    name: 'Amaj',
  },
  {
    pad: [293.66, 370.00, 554.37],
    melody: [587.33, 740.00, 880.00, 987.77, 1108.73, 1174.66],
    drone: 146.83,
    name: 'D/F#',
  },
]

const PATTERNS = [
  [0, 2, 4, 2, 0, 1],
  [0, 1, 3, 5, 3, 1],
  [0, 2, 1, 3, 2, 4],
  [4, 3, 1, 0, 1, 3],
  [0, 3, 1, 4, 2, 5],
  [5, 4, 2, 0, 2, 3],
  [0, 1, 2, 3, 4, 5, 4, 3],
  [0, 4, 1, 5, 2, 3],
]

// +4 cents detune ratio for the B oscillators
const DETUNE_RATIO = Math.pow(2, 4 / 1200) // ~1.00231

// ── Musical event types ──

export type MusicalEventType = 'chordChange' | 'bowlStrike' | 'noteOn'

export interface MusicalEvent {
  type: MusicalEventType
  time: number
  data?: {
    chord?: string
    chordIdx?: number
    freq?: number
    noteIdx?: number
  }
}

export class GenerativeSequencer {
  private nodes: PatchNodes
  private currentChordIdx = 0
  private melodyPattern: number[] = []
  private melodyStep = 0
  private melodyMutations = 0
  private running = false

  // Timers
  private melodyTimer: ReturnType<typeof setTimeout> | null = null
  private bowlTimer: ReturnType<typeof setTimeout> | null = null
  private chordTimer: ReturnType<typeof setTimeout> | null = null
  private pendingTimers: ReturnType<typeof setTimeout>[] = []

  // Gate node for melody envelope triggering
  private gateSource: ConstantSourceNode | null = null

  // XY state — start warm and spacious (center-left, lower half)
  private xy = { x: 0.3, y: 0.35 }

  // Throttle reverb decay changes (expensive — regenerates impulse)
  private lastReverbDecay = 4

  // When true, updateParams() skips XY mapping (for manual tweaking)
  bypassXY = false

  // Callbacks
  onChordChange?: (name: string, idx: number) => void
  onMusicalEvent?: (event: MusicalEvent) => void

  constructor(nodes: PatchNodes) {
    this.nodes = nodes
  }

  get chord(): Chord {
    return CHORDS[this.currentChordIdx % CHORDS.length]
  }

  get chordName(): string {
    return this.chord.name
  }

  start() {
    if (this.running) return
    this.running = true

    const ctx = audioEngine.context
    if (!ctx) return

    // ── Gentle fade-in from silence over ~8 seconds ──
    const outputEntry = audioEngine.getNodeEntry(this.nodes.output)
    if (outputEntry?.gainNode) {
      const now = ctx.currentTime
      outputEntry.gainNode.gain.cancelScheduledValues(now)
      outputEntry.gainNode.gain.setValueAtTime(0, now)
      outputEntry.gainNode.gain.setTargetAtTime(0.7, now + 0.05, 2.5)
    }

    // Create gate source for melody envelope
    this.gateSource = ctx.createConstantSource()
    this.gateSource.offset.value = 0
    this.gateSource.start()

    // Connect gate to melody envelope input
    const melodyEnvEntry = audioEngine.getNodeEntry(this.nodes.melodyEnv)
    if (melodyEnvEntry?.workletNode) {
      this.gateSource.connect(melodyEnvEntry.workletNode, 0, 0)
    }

    // Set initial chord (slow glide from default freqs)
    this.applyChord(this.chord, 3)

    // Start melody — delayed so pads establish first (8-14s)
    this.pickPattern()
    this.melodyTimer = setTimeout(() => this.playMelodyNote(), 8000 + Math.random() * 6000)

    // Start bowl strikes — delayed (8-15s)
    this.bowlTimer = setTimeout(() => this.playBowlStrike(), 8000 + Math.random() * 7000)

    // Start chord rotation — first change after 45-75s
    this.chordTimer = setTimeout(() => this.rotateChord(), 45000 + Math.random() * 30000)
  }

  stop() {
    this.running = false
    if (this.melodyTimer) { clearTimeout(this.melodyTimer); this.melodyTimer = null }
    if (this.bowlTimer) { clearTimeout(this.bowlTimer); this.bowlTimer = null }
    if (this.chordTimer) { clearTimeout(this.chordTimer); this.chordTimer = null }
    for (const t of this.pendingTimers) clearTimeout(t)
    this.pendingTimers = []
    if (this.gateSource) {
      try { this.gateSource.stop(); this.gateSource.disconnect() } catch {}
      this.gateSource = null
    }
  }

  setXY(x: number, y: number) {
    this.xy = { x, y }
  }

  /**
   * Full synth morph — called every animation frame.
   *
   * X-axis (left=dark, right=bright):
   *   Filter cutoff: 250Hz → 3500Hz (exponential)
   *   Oscillator shape: 0.35 (warm) → 0.65 (brighter harmonics)
   *   Noise/hiss level: higher left (tape), lower right
   *
   * Y-axis (top=intimate, bottom=vast):
   *   Reverb wet: 0.2 → 0.75
   *   Reverb decay: 1.5s → 7s
   *   Delay wet: 0.15 → 0.45
   *   Delay feedback: 0.2 → 0.5
   *
   * Quadrant blending:
   *   Pad gain, drone level, noise character all shift with XY
   */
  updateParams() {
    if (!this.running) return
    if (this.bypassXY) return
    const { x, y } = this.xy
    const e = audioEngine
    const smooth = 0.3 // time constant for smooth XY transitions

    // ── X-axis: Filter cutoff (exponential 150 → 2800 Hz) ──
    // Starts very dark, only opens up at far right
    const cutoff = 150 * Math.pow(2800 / 150, x)
    for (const vcfId of this.nodes.padVcf) {
      e.setParam(vcfId, 'cutoff', cutoff, smooth)
    }
    // Melody filter follows but stays a bit more open
    e.setParam(this.nodes.melodyVcf, 'cutoff', Math.max(cutoff * 1.2, 500), smooth)

    // Oscillator shape: locked to pure sine (0.5) — any deviation
    // from 0.5 introduces sharkfin harmonics that sound harsh/8-bit.
    // Warmth comes from detune + filter, not waveform shaping.

    // ── Y-axis: Reverb (intimate → vast) ──
    // Generous reverb even at top — this is ambient music
    // wet: 0.4 (top) → 0.85 (bottom). Y=1 is top, Y=0 is bottom.
    const reverbWet = 0.4 + (1 - y) * 0.45
    e.setParam(this.nodes.reverb, 'wet', reverbWet, smooth)

    // Reverb decay: 3s (top) → 9s (bottom) — always lush
    const reverbDecay = 3 + (1 - y) * 6
    if (Math.abs(reverbDecay - this.lastReverbDecay) > 0.5) {
      e.setParam(this.nodes.reverb, 'decay', reverbDecay)
      this.lastReverbDecay = reverbDecay
    }

    // ── Y-axis: Delay (intimate → vast) ──
    // More generous delay throughout
    const delayWet = 0.25 + (1 - y) * 0.35
    const delayFeedback = 0.3 + (1 - y) * 0.35
    e.setParam(this.nodes.delay, 'wet', delayWet, smooth)
    e.setParam(this.nodes.delay, 'feedback', delayFeedback, smooth)

    // ── Pad volume: halved because we doubled oscillators ──
    const padGain = 0.02 + (1 - y) * 0.015
    for (const vcaId of this.nodes.padVca) {
      e.setParam(vcaId, 'gain', padGain, smooth)
    }

    // ── Drone: more at bottom-left (Tibetan), less at top-right (Eno) ──
    const droneGain = 0.015 + (1 - x) * 0.015 + (1 - y) * 0.01
    e.setParam(this.nodes.droneVca, 'gain', droneGain, smooth)

    // ── Noise/hiss: very subtle tape warmth ──
    const noiseGain = 0.003 + (1 - x) * 0.012
    e.setParam(this.nodes.noiseVca, 'gain', noiseGain, smooth)
    const noiseCutoff = 1500 + x * 4000
    e.setParam(this.nodes.noiseVcf, 'cutoff', noiseCutoff, smooth)
  }

  // --- Private ---

  private emitEvent(type: MusicalEventType, data?: MusicalEvent['data']) {
    this.onMusicalEvent?.({
      type,
      time: Date.now(),
      data,
    })
  }

  private applyChord(c: Chord, glideTime: number) {
    const e = audioEngine
    // Very slow glide — chords melt into each other over many seconds
    const glide = glideTime

    // Glide pad VCO frequencies (both main and detuned)
    for (let i = 0; i < 3; i++) {
      if (c.pad[i]) {
        e.setParam(this.nodes.padVco[i], 'tune', c.pad[i], glide)
        e.setParam(this.nodes.padVcoB[i], 'tune', c.pad[i] * DETUNE_RATIO, glide)
      }
    }

    // Glide drone frequency
    e.setParam(this.nodes.droneVco, 'tune', c.drone, glide)

    this.onChordChange?.(c.name, this.currentChordIdx)
    this.emitEvent('chordChange', { chord: c.name, chordIdx: this.currentChordIdx })
  }

  private rotateChord() {
    if (!this.running) return
    this.currentChordIdx = (this.currentChordIdx + 1) % CHORDS.length
    // Glacial glide: 4s time constant = ~12-15s to fully arrive
    this.applyChord(this.chord, 4)
    // Slow rotation: 45-75 seconds between changes
    this.chordTimer = setTimeout(() => this.rotateChord(), 45000 + Math.random() * 30000)
  }

  private pickPattern() {
    this.melodyPattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)].slice()
    this.melodyStep = 0
    this.melodyMutations = 0
  }

  private mutatePattern() {
    const r = Math.random()
    if (r < 0.35) {
      this.melodyPattern.reverse()
    } else if (r < 0.65) {
      const rot = 1 + Math.floor(Math.random() * (this.melodyPattern.length - 1))
      this.melodyPattern = [...this.melodyPattern.slice(rot), ...this.melodyPattern.slice(0, rot)]
    } else {
      this.melodyPattern = this.melodyPattern.map(n => Math.max(0, n + (Math.random() < 0.5 ? 1 : -1)))
    }
  }

  private playMelodyNote() {
    if (!this.running) return
    const ctx = audioEngine.context
    if (!ctx) return

    const { x, y } = this.xy
    const c = this.chord
    const scale = c.melody
    const noteIdx = this.melodyPattern[this.melodyStep % this.melodyPattern.length] % scale.length
    let freq = scale[noteIdx]

    // Quadrant: bottom-left biases lower octave, top-right biases higher
    const lowerBias = (1 - x) * (1 - y)
    if (lowerBias > 0.5 && Math.random() < 0.4) {
      freq *= 0.5 // drop octave in Tibetan zone
    }

    // Set melody VCO frequency
    audioEngine.setParam(this.nodes.melodyVco, 'tune', freq)

    // Trigger gate: long, soft note (gate stays open longer for slow attack)
    if (this.gateSource) {
      const now = ctx.currentTime
      this.gateSource.offset.setValueAtTime(1.0, now)
      this.gateSource.offset.setValueAtTime(0.0, now + 1.5 + Math.random() * 0.8)
    }

    // Belt-and-suspenders with envelope — very gentle
    audioEngine.setParam(this.nodes.melodyVca, 'gain', 0.03)
    const t = setTimeout(() => {
      if (this.running) audioEngine.setParam(this.nodes.melodyVca, 'gain', 0)
    }, 4000)
    this.pendingTimers.push(t)

    // Emit note event
    this.emitEvent('noteOn', { freq, noteIdx })

    // Advance pattern
    this.melodyStep++
    const mutateAt = 16 + Math.floor(Math.random() * 16)
    if (this.melodyStep % mutateAt === 0) {
      this.melodyMutations++
      if (this.melodyMutations > 3) this.pickPattern()
      else this.mutatePattern()
    }

    // Schedule next note — quadrant-dependent timing (slower, more meditative)
    // BL (Tibetan): very slow 6-10s, BR (Glass): gentle 3-5s, TL (Hainbach): 4-7s, TR (Eno): 4-8s
    const baseSlow = 6000 * (1 - x) * (1 - y)   // BL contribution
    const baseFast = 3000 * x * (1 - y)          // BR contribution
    const baseTL = 4500 * (1 - x) * y            // TL contribution
    const baseTR = 5000 * x * y                   // TR contribution
    const baseMs = 3000 + baseSlow + baseFast + baseTL + baseTR
    const nextMs = Math.max(3000, baseMs + Math.random() * 3000)
    this.melodyTimer = setTimeout(() => this.playMelodyNote(), nextMs)
  }

  private playBowlStrike() {
    if (!this.running) return
    const ctx = audioEngine.context
    if (!ctx) return

    // Bowl probability: highest bottom-left, zero top-right
    const bowlProb = (1 - this.xy.x) * (1 - this.xy.y)
    if (bowlProb < 0.15 || Math.random() > bowlProb * 1.5) {
      this.scheduleBowl()
      return
    }

    const now = ctx.currentTime
    const c = this.chord

    // Pick bowl frequency from melody scale (lower register)
    const bowlFreq = c.melody[Math.floor(Math.random() * 3)] * 0.5

    // Noise burst exciter
    const noise = ctx.createBufferSource()
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate)
    const ndata = noiseBuf.getChannelData(0)
    for (let i = 0; i < ndata.length; i++) ndata[i] = Math.random() * 2 - 1
    noise.buffer = noiseBuf

    const exciteEnv = ctx.createGain()
    exciteEnv.gain.setValueAtTime(0.5, now)
    exciteEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.03)
    noise.connect(exciteEnv)

    const bowlOut = ctx.createGain()
    bowlOut.gain.value = 0.25

    // 4 resonant bandpass filters at harmonic ratios
    const ratios = [1, 2.0, 3.0, 4.76]
    for (let i = 0; i < ratios.length; i++) {
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = bowlFreq * ratios[i]
      bp.Q.value = 80 + Math.random() * 60

      const bpGain = ctx.createGain()
      bpGain.gain.value = 0.3 / (i * 0.5 + 1)

      const resEnv = ctx.createGain()
      const decayTime = 6 + Math.random() * 8
      resEnv.gain.setValueAtTime(1, now)
      resEnv.gain.exponentialRampToValueAtTime(0.0001, now + decayTime)

      exciteEnv.connect(bp)
      bp.connect(bpGain).connect(resEnv).connect(bowlOut)
    }

    // Route bowl -> reverb input (via the Tone.js reverb node)
    const reverbEntry = audioEngine.getNodeEntry(this.nodes.reverb)
    const outputEntry = audioEngine.getNodeEntry(this.nodes.output)

    if (reverbEntry?.toneNode) {
      const toneInput = (reverbEntry.toneNode as any).input
      if (toneInput) {
        bowlOut.connect(toneInput)
      }
    }
    if (outputEntry?.gainNode) {
      const dryGain = ctx.createGain()
      dryGain.gain.value = 0.3
      bowlOut.connect(dryGain).connect(outputEntry.gainNode)
    }

    noise.start(now)
    noise.stop(now + 0.05)

    // Emit bowl event
    this.emitEvent('bowlStrike', { freq: bowlFreq })

    noise.onended = () => {
      setTimeout(() => { try { bowlOut.disconnect() } catch {} }, 16000)
    }

    this.scheduleBowl()
  }

  private scheduleBowl() {
    if (!this.running) return
    // Bowl timing: more frequent bottom-left, less frequent elsewhere
    const baseInterval = 12000 + this.xy.x * 10000 + this.xy.y * 8000
    this.bowlTimer = setTimeout(() => this.playBowlStrike(), baseInterval + Math.random() * 15000)
  }
}
