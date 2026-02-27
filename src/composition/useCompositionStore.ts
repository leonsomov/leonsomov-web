/**
 * useCompositionStore — Zustand store for the generative ambient synth.
 *
 * Manages: audioReady, playing, currentChord, xy state, musical events.
 * Coordinates AudioEngine init, patch building, and sequencer.
 */

import { create } from 'zustand'
import { audioEngine } from '../engine/AudioEngine'
import { buildPatch, type PatchNodes } from './patchBuilder'
import { GenerativeSequencer, type MusicalEvent } from './generativeSequencer'

interface CompositionState {
  audioReady: boolean
  playing: boolean
  currentChord: string
  xy: { x: number; y: number }
  error: string | null

  // Musical events for visual sync
  lastMusicalEvent: MusicalEvent | null

  // Internal refs (not reactive)
  _patchNodes: PatchNodes | null
  _sequencer: GenerativeSequencer | null
  _rafId: number | null

  // Actions
  init: () => Promise<void>
  start: () => void
  stop: () => void
  setXY: (x: number, y: number) => void
}

export const useCompositionStore = create<CompositionState>((set, get) => ({
  audioReady: false,
  playing: false,
  currentChord: 'Dmaj7',
  xy: { x: 0.3, y: 0.35 },
  error: null,
  lastMusicalEvent: null,

  _patchNodes: null,
  _sequencer: null,
  _rafId: null,

  async init() {
    if (get().audioReady) return

    try {
      set({ error: null })
      if (import.meta.env.DEV) console.log('[Composition] Initializing audio engine...')
      await audioEngine.init()
      if (import.meta.env.DEV) console.log('[Composition] Building patch...')
      const nodes = buildPatch()
      if (import.meta.env.DEV) console.log('[Composition] Creating sequencer...')
      const sequencer = new GenerativeSequencer(nodes)

      sequencer.onChordChange = (name) => {
        set({ currentChord: name })
      }

      sequencer.onMusicalEvent = (event) => {
        set({ lastMusicalEvent: event })
      }

      set({
        audioReady: true,
        _patchNodes: nodes,
        _sequencer: sequencer,
      })
      if (import.meta.env.DEV) console.log('[Composition] Ready')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Audio initialization failed'
      if (import.meta.env.DEV) console.error('[Composition] Init failed:', err)
      set({ error: msg })
    }
  },

  start() {
    const { _sequencer, playing } = get()
    if (playing || !_sequencer) return

    _sequencer.start()

    // Parameter update loop
    const loop = () => {
      const state = get()
      if (!state.playing) return
      state._sequencer?.updateParams()
      const id = requestAnimationFrame(loop)
      set({ _rafId: id })
    }

    set({ playing: true })
    requestAnimationFrame(loop)
  },

  stop() {
    const { _sequencer, _rafId } = get()
    _sequencer?.stop()
    if (_rafId) cancelAnimationFrame(_rafId)
    set({ playing: false, _rafId: null })
  },

  setXY(x: number, y: number) {
    const { _sequencer } = get()
    _sequencer?.setXY(x, y)
    set({ xy: { x, y } })
  },
}))
