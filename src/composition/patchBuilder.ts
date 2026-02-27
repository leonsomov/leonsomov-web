/**
 * patchBuilder — Programmatically creates the ambient synth patch
 * using the modular AudioEngine.
 *
 * Signal flow:
 *   PAD VOICES (x3):  VCO (sine) → VCF (lowpass) → VCA → Mixer ch1
 *   DRONE VOICE:      VCO (sine, low) → VCA → Mixer ch2
 *   MELODY VOICE:     VCO (triangle) → VCF → VCA ← Envelope → Mixer ch3
 *   NOISE (hiss):     Noise → VCF (lowpass 8kHz) → VCA (low) → Mixer ch4
 *   LFOs:             LFO → pad VCA CV (breathing)
 *                     LFO → pad VCF cutoff CV (sweep)
 *   EFFECTS:          Mixer → Reverb (4s decay) → Output
 *                     Mixer → Delay (0.3s) → Output
 */

import { audioEngine } from '../engine/AudioEngine'

export interface PatchNodes {
  // Pad voices (3 VCO+VCF+VCA chains, each with a detuned pair)
  padVco: string[]
  padVcoB: string[]  // detuned +4 cents for thickness
  padVcf: string[]
  padVca: string[]
  // Drone
  droneVco: string
  droneVca: string
  // Melody
  melodyVco: string
  melodyVcf: string
  melodyVca: string
  melodyEnv: string
  // Noise/hiss
  noise: string
  noiseVcf: string
  noiseVca: string
  // LFOs
  breathLfo: string
  sweepLfo: string
  // Mix + effects
  mixer: string
  reverb: string
  delay: string
  output: string
}

export function buildPatch(): PatchNodes {
  const e = audioEngine

  // --- Pad voices (3x) ---
  const padVco: string[] = []
  const padVcoB: string[] = []  // detuned pair
  const padVcf: string[] = []
  const padVca: string[] = []

  for (let i = 0; i < 3; i++) {
    const vcoId = `pad-vco-${i}`
    const vcoBId = `pad-vco-${i}-b`
    const vcfId = `pad-vcf-${i}`
    const vcaId = `pad-vca-${i}`

    e.createNode(vcoId, 'oscillator')
    e.createNode(vcoBId, 'oscillator')
    e.createNode(vcfId, 'filter')
    e.createNode(vcaId, 'vca')

    // Both VCOs → same VCF → VCA
    e.connect(
      { moduleId: vcoId, portId: 'sine_out' },
      { moduleId: vcfId, portId: 'audio_in' }
    )
    e.connect(
      { moduleId: vcoBId, portId: 'sine_out' },
      { moduleId: vcfId, portId: 'audio_in' }
    )
    e.connect(
      { moduleId: vcfId, portId: 'vcf_out' },
      { moduleId: vcaId, portId: 'audio_in' }
    )

    // Defaults: pure sine, quiet, warm, filtered
    e.setParam(vcoId, 'shape', 0.5)   // pure sine — no sharkfin
    e.setParam(vcoBId, 'shape', 0.5)  // pure sine
    e.setParam(vcfId, 'cutoff', 800)
    e.setParam(vcfId, 'resonance', 0.03)
    e.setParam(vcaId, 'gain', 0.025)  // halved — 2 oscs per voice now

    padVco.push(vcoId)
    padVcoB.push(vcoBId)
    padVcf.push(vcfId)
    padVca.push(vcaId)
  }

  // --- Drone ---
  const droneVco = 'drone-vco'
  const droneVca = 'drone-vca'
  e.createNode(droneVco, 'oscillator')
  e.createNode(droneVca, 'vca')
  e.setParam(droneVco, 'shape', 0.5) // pure sine
  e.setParam(droneVca, 'gain', 0.025)
  e.connect(
    { moduleId: droneVco, portId: 'sine_out' },
    { moduleId: droneVca, portId: 'audio_in' }
  )

  // --- Melody ---
  const melodyVco = 'melody-vco'
  const melodyVcf = 'melody-vcf'
  const melodyVca = 'melody-vca'
  const melodyEnv = 'melody-env'

  e.createNode(melodyVco, 'oscillator')
  e.createNode(melodyVcf, 'filter')
  e.createNode(melodyVca, 'vca')
  e.createNode(melodyEnv, 'envelope')

  // VCO shape: pure sine for soft ambient tones
  e.setParam(melodyVco, 'shape', 0.5)
  e.setParam(melodyVcf, 'cutoff', 600)
  e.setParam(melodyVcf, 'resonance', 0.01)
  e.setParam(melodyVca, 'gain', 0)
  e.setParam(melodyEnv, 'attack', 0.8)
  e.setParam(melodyEnv, 'decay', 1.2)
  e.setParam(melodyEnv, 'sustain', 0.25)
  e.setParam(melodyEnv, 'release', 4.5)

  // VCO → VCF → VCA, Envelope → VCA CV
  e.connect(
    { moduleId: melodyVco, portId: 'sine_out' },
    { moduleId: melodyVcf, portId: 'audio_in' }
  )
  e.connect(
    { moduleId: melodyVcf, portId: 'vcf_out' },
    { moduleId: melodyVca, portId: 'audio_in' }
  )
  e.connect(
    { moduleId: melodyEnv, portId: 'env_out' },
    { moduleId: melodyVca, portId: 'cv_in' }
  )

  // --- Noise (tape hiss) ---
  const noise = 'noise-gen'
  const noiseVcf = 'noise-vcf'
  const noiseVca = 'noise-vca'

  e.createNode(noise, 'noise')
  e.createNode(noiseVcf, 'filter')
  e.createNode(noiseVca, 'vca')

  e.setParam(noiseVcf, 'cutoff', 8000)
  e.setParam(noiseVcf, 'resonance', 0)
  e.setParam(noiseVca, 'gain', 0.01)

  e.connect(
    { moduleId: noise, portId: 'noise_out' },
    { moduleId: noiseVcf, portId: 'audio_in' }
  )
  e.connect(
    { moduleId: noiseVcf, portId: 'vcf_out' },
    { moduleId: noiseVca, portId: 'audio_in' }
  )

  // --- LFOs ---
  const breathLfo = 'breath-lfo'
  const sweepLfo = 'sweep-lfo'

  e.createNode(breathLfo, 'lfo')
  e.createNode(sweepLfo, 'lfo')

  e.setParam(breathLfo, 'rate', 0.03)
  e.setParam(breathLfo, 'depth', 0.015)
  e.setParam(breathLfo, 'shape', 0) // sine

  e.setParam(sweepLfo, 'rate', 0.02)
  e.setParam(sweepLfo, 'depth', 0.3)
  e.setParam(sweepLfo, 'shape', 0) // sine

  // Breath LFO → pad VCA CV (all 3)
  for (const vcaId of padVca) {
    e.connect(
      { moduleId: breathLfo, portId: 'lfo_out' },
      { moduleId: vcaId, portId: 'cv_in' }
    )
  }

  // Sweep LFO → pad VCF CV (all 3)
  for (const vcfId of padVcf) {
    e.connect(
      { moduleId: sweepLfo, portId: 'lfo_out' },
      { moduleId: vcfId, portId: 'cv_in' }
    )
  }

  // --- Mixer ---
  const mixer = 'main-mixer'
  e.createNode(mixer, 'mixer')
  e.setParam(mixer, 'ch1_level', 0.7)  // pads — soft bed
  e.setParam(mixer, 'ch2_level', 0.6)  // drone — undercurrent
  e.setParam(mixer, 'ch3_level', 0.18) // melody — barely there
  e.setParam(mixer, 'ch4_level', 0.2)  // noise — breath of tape

  // Route voices into mixer channels
  // Pad VCAs → ch1 (they all sum into input 0)
  for (const vcaId of padVca) {
    e.connect(
      { moduleId: vcaId, portId: 'vca_out' },
      { moduleId: mixer, portId: 'ch1_in' }
    )
  }
  // Drone → ch2
  e.connect(
    { moduleId: droneVca, portId: 'vca_out' },
    { moduleId: mixer, portId: 'ch2_in' }
  )
  // Melody → ch3
  e.connect(
    { moduleId: melodyVca, portId: 'vca_out' },
    { moduleId: mixer, portId: 'ch3_in' }
  )
  // Noise → ch4
  e.connect(
    { moduleId: noiseVca, portId: 'vca_out' },
    { moduleId: mixer, portId: 'ch4_in' }
  )

  // --- Effects ---
  const reverb = 'main-reverb'
  const delay = 'main-delay'
  const output = 'main-output'

  e.createNode(reverb, 'reverb')
  e.createNode(delay, 'delay')
  e.createNode(output, 'output')

  e.setParam(reverb, 'decay', 6)
  e.setParam(reverb, 'wet', 0.65)
  e.setParam(delay, 'time', 0.45)
  e.setParam(delay, 'feedback', 0.4)
  e.setParam(delay, 'wet', 0.35)
  e.setParam(output, 'volume', 0)  // starts silent — sequencer fades in

  // Mixer → Reverb → Output
  e.connect(
    { moduleId: mixer, portId: 'mix_out' },
    { moduleId: reverb, portId: 'audio_in' }
  )
  e.connect(
    { moduleId: reverb, portId: 'reverb_out' },
    { moduleId: output, portId: 'audio_in' }
  )

  // Mixer → Delay → Output (parallel to reverb)
  e.connect(
    { moduleId: mixer, portId: 'mix_out' },
    { moduleId: delay, portId: 'audio_in' }
  )
  e.connect(
    { moduleId: delay, portId: 'delay_out' },
    { moduleId: output, portId: 'audio_in' }
  )

  return {
    padVco, padVcoB, padVcf, padVca,
    droneVco, droneVca,
    melodyVco, melodyVcf, melodyVca, melodyEnv,
    noise, noiseVcf, noiseVca,
    breathLfo, sweepLfo,
    mixer, reverb, delay, output,
  }
}
