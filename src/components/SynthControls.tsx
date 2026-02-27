/**
 * SynthControls — Visible tweaking panel for sound design.
 * Temporary: will be hidden once the sound is dialed in.
 */

import { useState, useCallback, useEffect } from 'react'
import { audioEngine } from '../engine/AudioEngine'
import { useCompositionStore } from '../composition/useCompositionStore'

interface ParamDef {
  label: string
  min: number
  max: number
  step: number
  default: number
  unit?: string
  log?: boolean // use exponential scaling
}

const PARAMS: Record<string, ParamDef> = {
  // Filter
  filterCutoff:  { label: 'Filter Cutoff',   min: 40,    max: 8000, step: 1,    default: 800,  unit: 'Hz', log: true },
  filterRes:     { label: 'Filter Resonance', min: 0,     max: 0.8,  step: 0.01, default: 0.03 },
  // Oscillator
  oscShape:      { label: 'Osc Shape',        min: 0,     max: 1,    step: 0.01, default: 0.5 },
  detuneCents:   { label: 'Detune (cents)',    min: 0,     max: 20,   step: 0.5,  default: 4,   unit: 'ct' },
  // Pad levels
  padGain:       { label: 'Pad Gain',         min: 0,     max: 0.1,  step: 0.001, default: 0.025 },
  droneGain:     { label: 'Drone Gain',       min: 0,     max: 0.08, step: 0.001, default: 0.025 },
  melodyGain:    { label: 'Melody Gain',      min: 0,     max: 0.08, step: 0.001, default: 0.03 },
  noiseGain:     { label: 'Noise Gain',       min: 0,     max: 0.05, step: 0.001, default: 0.008 },
  // LFO
  breathRate:    { label: 'Breath LFO Rate',  min: 0.005, max: 0.2,  step: 0.001, default: 0.03, unit: 'Hz' },
  breathDepth:   { label: 'Breath LFO Depth', min: 0,     max: 0.1,  step: 0.001, default: 0.015 },
  sweepRate:     { label: 'Sweep LFO Rate',   min: 0.005, max: 0.2,  step: 0.001, default: 0.02, unit: 'Hz' },
  sweepDepth:    { label: 'Sweep LFO Depth',  min: 0,     max: 1,    step: 0.01,  default: 0.3 },
  // Reverb
  reverbDecay:   { label: 'Reverb Decay',     min: 0.5,   max: 15,   step: 0.1,  default: 6,    unit: 's' },
  reverbWet:     { label: 'Reverb Wet',       min: 0,     max: 1,    step: 0.01, default: 0.65 },
  // Delay
  delayTime:     { label: 'Delay Time',       min: 0.05,  max: 1,    step: 0.01, default: 0.45, unit: 's' },
  delayFeedback: { label: 'Delay Feedback',   min: 0,     max: 0.9,  step: 0.01, default: 0.4 },
  delayWet:      { label: 'Delay Wet',        min: 0,     max: 1,    step: 0.01, default: 0.35 },
  // Mixer levels
  mixPads:       { label: 'Mix: Pads',        min: 0,     max: 2,    step: 0.01, default: 0.7 },
  mixDrone:      { label: 'Mix: Drone',       min: 0,     max: 2,    step: 0.01, default: 0.6 },
  mixMelody:     { label: 'Mix: Melody',      min: 0,     max: 2,    step: 0.01, default: 0.18 },
  mixNoise:      { label: 'Mix: Noise',       min: 0,     max: 2,    step: 0.01, default: 0.2 },
  // Master
  masterVol:     { label: 'Master Volume',    min: 0,     max: 1,    step: 0.01, default: 0.7 },
  // Melody envelope
  melAttack:     { label: 'Mel Attack',       min: 0.01,  max: 3,    step: 0.01, default: 0.8,  unit: 's' },
  melDecay:      { label: 'Mel Decay',        min: 0.01,  max: 3,    step: 0.01, default: 1.2,  unit: 's' },
  melSustain:    { label: 'Mel Sustain',      min: 0,     max: 1,    step: 0.01, default: 0.25 },
  melRelease:    { label: 'Mel Release',      min: 0.1,   max: 10,   step: 0.1,  default: 4.5,  unit: 's' },
}

function applyParam(key: string, value: number) {
  const nodes = useCompositionStore.getState()._patchNodes
  if (!nodes) return
  const e = audioEngine
  const tc = 0.05 // fast response for tweaking

  switch (key) {
    case 'filterCutoff':
      for (const id of nodes.padVcf) e.setParam(id, 'cutoff', value, tc)
      break
    case 'filterRes':
      for (const id of nodes.padVcf) e.setParam(id, 'resonance', value, tc)
      break
    case 'oscShape':
      for (const id of nodes.padVco) e.setParam(id, 'shape', value, tc)
      for (const id of nodes.padVcoB) e.setParam(id, 'shape', value, tc)
      e.setParam(nodes.droneVco, 'shape', value, tc)
      break
    case 'detuneCents': {
      const ratio = Math.pow(2, value / 1200)
      // Re-tune padVcoB relative to padVco
      for (let i = 0; i < nodes.padVco.length; i++) {
        const entry = e.getNodeEntry(nodes.padVco[i])
        if (entry?.workletNode) {
          const currentFreq = entry.workletNode.parameters.get('tune')?.value ?? 440
          e.setParam(nodes.padVcoB[i], 'tune', currentFreq * ratio, tc)
        }
      }
      break
    }
    case 'padGain':
      for (const id of nodes.padVca) e.setParam(id, 'gain', value, tc)
      break
    case 'droneGain':
      e.setParam(nodes.droneVca, 'gain', value, tc)
      break
    case 'melodyGain':
      e.setParam(nodes.melodyVca, 'gain', value, tc)
      break
    case 'noiseGain':
      e.setParam(nodes.noiseVca, 'gain', value, tc)
      break
    case 'breathRate':
      e.setParam(nodes.breathLfo, 'rate', value, tc)
      break
    case 'breathDepth':
      e.setParam(nodes.breathLfo, 'depth', value, tc)
      break
    case 'sweepRate':
      e.setParam(nodes.sweepLfo, 'rate', value, tc)
      break
    case 'sweepDepth':
      e.setParam(nodes.sweepLfo, 'depth', value, tc)
      break
    case 'reverbDecay':
      e.setParam(nodes.reverb, 'decay', value)
      break
    case 'reverbWet':
      e.setParam(nodes.reverb, 'wet', value, tc)
      break
    case 'delayTime':
      e.setParam(nodes.delay, 'time', value, tc)
      break
    case 'delayFeedback':
      e.setParam(nodes.delay, 'feedback', value, tc)
      break
    case 'delayWet':
      e.setParam(nodes.delay, 'wet', value, tc)
      break
    case 'mixPads':
      e.setParam(nodes.mixer, 'ch1_level', value, tc)
      break
    case 'mixDrone':
      e.setParam(nodes.mixer, 'ch2_level', value, tc)
      break
    case 'mixMelody':
      e.setParam(nodes.mixer, 'ch3_level', value, tc)
      break
    case 'mixNoise':
      e.setParam(nodes.mixer, 'ch4_level', value, tc)
      break
    case 'masterVol': {
      const outputEntry = e.getNodeEntry(nodes.output)
      if (outputEntry?.gainNode) {
        outputEntry.gainNode.gain.setTargetAtTime(value, audioEngine.context!.currentTime, tc)
      }
      break
    }
    case 'melAttack':
      e.setParam(nodes.melodyEnv, 'attack', value, tc)
      break
    case 'melDecay':
      e.setParam(nodes.melodyEnv, 'decay', value, tc)
      break
    case 'melSustain':
      e.setParam(nodes.melodyEnv, 'sustain', value, tc)
      break
    case 'melRelease':
      e.setParam(nodes.melodyEnv, 'release', value, tc)
      break
  }
}

function Slider({ paramKey, def, value, onChange }: {
  paramKey: string
  def: ParamDef
  value: number
  onChange: (key: string, val: number) => void
}) {
  const displayVal = def.log
    ? value.toFixed(0)
    : value < 1 ? value.toFixed(3) : value.toFixed(2)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
      <label style={{ width: 120, fontSize: 10, color: '#8a857e', flexShrink: 0 }}>
        {def.label}
      </label>
      <input
        type="range"
        min={def.min}
        max={def.max}
        step={def.step}
        value={value}
        onChange={(e) => onChange(paramKey, parseFloat(e.target.value))}
        style={{ flex: 1, height: 12, accentColor: '#c4a35a' }}
      />
      <span style={{ width: 55, fontSize: 9, color: '#5a5550', textAlign: 'right', flexShrink: 0 }}>
        {displayVal}{def.unit ? ` ${def.unit}` : ''}
      </span>
    </div>
  )
}

export function SynthControls() {
  const playing = useCompositionStore((s) => s.playing)
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (const [k, v] of Object.entries(PARAMS)) init[k] = v.default
    return init
  })
  const [collapsed, setCollapsed] = useState(false)
  const [bypassXY, setBypassXY] = useState(true) // start bypassed so sliders work

  // Sync bypass flag to sequencer
  useEffect(() => {
    const seq = useCompositionStore.getState()._sequencer
    if (seq) seq.bypassXY = bypassXY
  }, [bypassXY, playing])

  const handleChange = useCallback((key: string, val: number) => {
    setValues(prev => ({ ...prev, [key]: val }))
    applyParam(key, val)
  }, [])

  const handleDump = useCallback(() => {
    console.log('=== SYNTH PARAMS ===')
    for (const [k, v] of Object.entries(values)) {
      console.log(`  ${k}: ${v}`)
    }
    console.log('====================')
  }, [values])

  if (!playing) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      width: collapsed ? 30 : 320,
      zIndex: 200,
      background: 'rgba(10,10,10,0.92)',
      borderRight: '1px solid rgba(200,185,170,0.08)',
      overflowY: 'auto',
      overflowX: 'hidden',
      fontFamily: 'var(--font)',
      padding: collapsed ? '8px 4px' : '12px 14px',
      transition: 'width 0.2s',
    }}>
      <button
        onClick={() => setCollapsed(v => !v)}
        style={{
          all: 'unset', cursor: 'pointer', fontSize: 10, color: '#8a857e',
          display: 'block', marginBottom: 8,
        }}
      >
        {collapsed ? '>' : '< hide'}
      </button>

      {!collapsed && (
        <>
          <div style={{ fontSize: 9, color: '#5a5550', letterSpacing: '0.1em', marginBottom: 6, textTransform: 'uppercase' }}>
            synth controls
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: bypassXY ? '#c4a35a' : '#5a5550', marginBottom: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={bypassXY}
              onChange={(e) => setBypassXY(e.target.checked)}
              style={{ accentColor: '#c4a35a' }}
            />
            bypass XY (sliders only)
          </label>

          <Section title="filter">
            <Slider paramKey="filterCutoff" def={PARAMS.filterCutoff} value={values.filterCutoff} onChange={handleChange} />
            <Slider paramKey="filterRes" def={PARAMS.filterRes} value={values.filterRes} onChange={handleChange} />
          </Section>

          <Section title="oscillator">
            <Slider paramKey="oscShape" def={PARAMS.oscShape} value={values.oscShape} onChange={handleChange} />
            <Slider paramKey="detuneCents" def={PARAMS.detuneCents} value={values.detuneCents} onChange={handleChange} />
          </Section>

          <Section title="levels">
            <Slider paramKey="padGain" def={PARAMS.padGain} value={values.padGain} onChange={handleChange} />
            <Slider paramKey="droneGain" def={PARAMS.droneGain} value={values.droneGain} onChange={handleChange} />
            <Slider paramKey="melodyGain" def={PARAMS.melodyGain} value={values.melodyGain} onChange={handleChange} />
            <Slider paramKey="noiseGain" def={PARAMS.noiseGain} value={values.noiseGain} onChange={handleChange} />
          </Section>

          <Section title="lfo">
            <Slider paramKey="breathRate" def={PARAMS.breathRate} value={values.breathRate} onChange={handleChange} />
            <Slider paramKey="breathDepth" def={PARAMS.breathDepth} value={values.breathDepth} onChange={handleChange} />
            <Slider paramKey="sweepRate" def={PARAMS.sweepRate} value={values.sweepRate} onChange={handleChange} />
            <Slider paramKey="sweepDepth" def={PARAMS.sweepDepth} value={values.sweepDepth} onChange={handleChange} />
          </Section>

          <Section title="reverb">
            <Slider paramKey="reverbDecay" def={PARAMS.reverbDecay} value={values.reverbDecay} onChange={handleChange} />
            <Slider paramKey="reverbWet" def={PARAMS.reverbWet} value={values.reverbWet} onChange={handleChange} />
          </Section>

          <Section title="delay">
            <Slider paramKey="delayTime" def={PARAMS.delayTime} value={values.delayTime} onChange={handleChange} />
            <Slider paramKey="delayFeedback" def={PARAMS.delayFeedback} value={values.delayFeedback} onChange={handleChange} />
            <Slider paramKey="delayWet" def={PARAMS.delayWet} value={values.delayWet} onChange={handleChange} />
          </Section>

          <Section title="mixer">
            <Slider paramKey="mixPads" def={PARAMS.mixPads} value={values.mixPads} onChange={handleChange} />
            <Slider paramKey="mixDrone" def={PARAMS.mixDrone} value={values.mixDrone} onChange={handleChange} />
            <Slider paramKey="mixMelody" def={PARAMS.mixMelody} value={values.mixMelody} onChange={handleChange} />
            <Slider paramKey="mixNoise" def={PARAMS.mixNoise} value={values.mixNoise} onChange={handleChange} />
          </Section>

          <Section title="melody envelope">
            <Slider paramKey="melAttack" def={PARAMS.melAttack} value={values.melAttack} onChange={handleChange} />
            <Slider paramKey="melDecay" def={PARAMS.melDecay} value={values.melDecay} onChange={handleChange} />
            <Slider paramKey="melSustain" def={PARAMS.melSustain} value={values.melSustain} onChange={handleChange} />
            <Slider paramKey="melRelease" def={PARAMS.melRelease} value={values.melRelease} onChange={handleChange} />
          </Section>

          <Section title="master">
            <Slider paramKey="masterVol" def={PARAMS.masterVol} value={values.masterVol} onChange={handleChange} />
          </Section>

          <button
            onClick={handleDump}
            style={{
              all: 'unset', cursor: 'pointer', fontSize: 9, color: '#c4a35a',
              letterSpacing: '0.1em', marginTop: 12, display: 'block',
            }}
          >
            dump to console
          </button>
        </>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 8, color: '#c4a35a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4, opacity: 0.7 }}>
        {title}
      </div>
      {children}
    </div>
  )
}
