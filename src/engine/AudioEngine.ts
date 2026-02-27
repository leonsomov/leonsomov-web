/**
 * AudioEngine — coordinates AudioContext, worklet loading, and node management.
 *
 * Singleton per session. Manages the lifecycle of AudioWorkletNodes and
 * Tone.js effect nodes. Exposes connect/disconnect/setParam for the store.
 */

import * as Tone from 'tone'
import { WorkletLoader, SYNTH_WORKLETS } from './WorkletLoader'
import type { ModuleDefinition, PortId, SignalType } from '../types/audio'
import { MODULE_REGISTRY } from '../modules'

export interface AudioNodeEntry {
  id: string
  type: string
  workletNode?: AudioWorkletNode
  toneNode?: Tone.ToneAudioNode
  gainNode?: GainNode
  definition: ModuleDefinition
}

interface AudioConnectionEntry {
  id: string
  from: PortId
  to: PortId
  signalType: SignalType
}

class AudioEngine {
  private ctx: AudioContext | null = null
  private loader: WorkletLoader | null = null
  private nodes = new Map<string, AudioNodeEntry>()
  private connections = new Map<string, AudioConnectionEntry>()
  private limiter: Tone.Limiter | null = null
  private initialized = false
  private _initError: string | null = null

  get initError(): string | null {
    return this._initError
  }

  async init(): Promise<void> {
    if (this.initialized) return
    this._initError = null

    // 1. Create a native AudioContext and give it to Tone.js
    //    (Tone v15 uses standardized-audio-context which wraps the native
    //     context — that wrapper fails `instanceof BaseAudioContext` checks
    //     needed by AudioWorkletNode, so we own the native context directly.)
    if (this.ctx) {
      try { this.ctx.close() } catch {}
    }
    this.ctx = new AudioContext()
    Tone.setContext(this.ctx)
    await Tone.start()

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }
    if (import.meta.env.DEV) console.log('[AudioEngine] Context state:', this.ctx.state)

    // 2. Load all worklet processors on the native context
    this.loader = new WorkletLoader(this.ctx)
    await this.loader.loadAll(SYNTH_WORKLETS)

    // 3. Master limiter to protect speakers
    this.limiter = new Tone.Limiter(-1).toDestination()

    this.initialized = true
    if (import.meta.env.DEV) console.log('[AudioEngine] Initialized')
  }

  get context(): AudioContext | null {
    return this.ctx
  }

  get isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Create an audio node for a module instance
   */
  createNode(nodeId: string, moduleType: string): AudioNodeEntry | null {
    if (!this.ctx) return null

    const definition = MODULE_REGISTRY[moduleType]
    if (!definition) {
      if (import.meta.env.DEV) console.error(`[AudioEngine] Unknown module type: ${moduleType}`)
      return null
    }

    let entry: AudioNodeEntry

    if (definition.processorName) {
      // AudioWorklet-based module
      const workletNode = new AudioWorkletNode(this.ctx, definition.processorName, {
        numberOfInputs: definition.numberOfInputs ?? definition.inputs.length,
        numberOfOutputs: definition.numberOfOutputs ?? definition.outputs.length,
        outputChannelCount: Array(definition.numberOfOutputs ?? definition.outputs.length).fill(1),
      })

      // Set default parameter values
      for (const param of definition.params) {
        const ap = workletNode.parameters.get(param.id)
        if (ap) {
          ap.value = param.default
        }
      }

      entry = { id: nodeId, type: moduleType, workletNode, definition }
    } else if (moduleType === 'delay') {
      const toneNode = new Tone.FeedbackDelay({
        delayTime: 0.3,
        feedback: 0.4,
        wet: 0.5,
      })
      entry = { id: nodeId, type: moduleType, toneNode, definition }
    } else if (moduleType === 'reverb') {
      const toneNode = new Tone.Reverb({
        decay: 2.5,
        wet: 0.3,
      })
      entry = { id: nodeId, type: moduleType, toneNode, definition }
    } else if (moduleType === 'output') {
      // Output module: gain node → limiter → destination
      const gainNode = this.ctx.createGain()
      gainNode.gain.value = 0.7
      if (this.limiter) {
        Tone.connect(gainNode, this.limiter)
      }
      entry = { id: nodeId, type: moduleType, gainNode, definition }
    } else {
      if (import.meta.env.DEV) console.error(`[AudioEngine] Cannot create node for type: ${moduleType}`)
      return null
    }

    this.nodes.set(nodeId, entry)
    return entry
  }

  /**
   * Remove a node and disconnect all its connections
   */
  removeNode(nodeId: string): void {
    const entry = this.nodes.get(nodeId)
    if (!entry) return

    // Remove all connections involving this node
    for (const [connId, conn] of Array.from(this.connections.entries())) {
      if (conn.from.moduleId === nodeId || conn.to.moduleId === nodeId) {
        this.disconnect(conn.from, conn.to)
      }
    }

    // Dispose the node
    if (entry.workletNode) {
      entry.workletNode.disconnect()
    }
    if (entry.toneNode) {
      entry.toneNode.dispose()
    }
    if (entry.gainNode) {
      entry.gainNode.disconnect()
    }

    this.nodes.delete(nodeId)
  }

  /**
   * Connect two ports
   */
  connect(from: PortId, to: PortId): string | null {
    const sourceEntry = this.nodes.get(from.moduleId)
    const destEntry = this.nodes.get(to.moduleId)
    if (!sourceEntry || !destEntry) return null

    const sourceNode = this.getOutputAudioNode(sourceEntry)
    const destNode = this.getInputAudioNode(destEntry)
    if (!sourceNode || !destNode) return null

    const outputIndex = this.getOutputIndex(sourceEntry, from.portId)
    const inputIndex = this.getInputIndex(destEntry, to.portId)

    try {
      if (sourceNode instanceof AudioNode && destNode instanceof AudioNode) {
        sourceNode.connect(destNode, outputIndex, inputIndex)
      } else {
        Tone.connect(sourceNode, destNode, outputIndex, inputIndex)
      }

      const connId = `${from.moduleId}.${from.portId}->${to.moduleId}.${to.portId}`
      const signalType = this.inferSignalType(sourceEntry, from.portId)
      this.connections.set(connId, { id: connId, from, to, signalType })
      return connId
    } catch (err) {
      if (import.meta.env.DEV) console.error('[AudioEngine] Connect failed:', err)
      return null
    }
  }

  /**
   * Disconnect two ports
   */
  disconnect(from: PortId, to: PortId): void {
    const sourceEntry = this.nodes.get(from.moduleId)
    const destEntry = this.nodes.get(to.moduleId)
    if (!sourceEntry || !destEntry) return

    const sourceNode = this.getOutputAudioNode(sourceEntry)
    const destNode = this.getInputAudioNode(destEntry)
    if (!sourceNode || !destNode) return

    const outputIndex = this.getOutputIndex(sourceEntry, from.portId)
    const inputIndex = this.getInputIndex(destEntry, to.portId)

    try {
      if (sourceNode instanceof AudioNode && destNode instanceof AudioNode) {
        sourceNode.disconnect(destNode, outputIndex, inputIndex)
      }
    } catch {
      // Ignore disconnect errors (already disconnected)
    }

    const connId = `${from.moduleId}.${from.portId}->${to.moduleId}.${to.portId}`
    this.connections.delete(connId)
  }

  /**
   * Get a node entry by ID (public API for sequencer access)
   */
  getNodeEntry(nodeId: string): AudioNodeEntry | undefined {
    return this.nodes.get(nodeId)
  }

  /**
   * Set a parameter on a node
   */
  setParam(nodeId: string, paramId: string, value: number, timeConstant = 0.01): void {
    const entry = this.nodes.get(nodeId)
    if (!entry) return

    if (entry.workletNode) {
      const ap = entry.workletNode.parameters.get(paramId)
      if (ap) {
        ap.setTargetAtTime(value, this.ctx!.currentTime, timeConstant)
      }
    } else if (entry.toneNode) {
      // Handle Tone.js parameters
      if (entry.type === 'delay') {
        const delay = entry.toneNode as Tone.FeedbackDelay
        switch (paramId) {
          case 'time': delay.delayTime.rampTo(value, timeConstant * 3); break
          case 'feedback': delay.feedback.rampTo(value, timeConstant * 3); break
          case 'wet': delay.wet.rampTo(value, timeConstant * 3); break
        }
      } else if (entry.type === 'reverb') {
        const reverb = entry.toneNode as Tone.Reverb
        switch (paramId) {
          case 'decay': reverb.decay = value; break
          case 'wet': reverb.wet.rampTo(value, timeConstant * 3); break
        }
      }
    } else if (entry.gainNode) {
      if (paramId === 'volume') {
        entry.gainNode.gain.setTargetAtTime(value, this.ctx!.currentTime, timeConstant)
      }
    }
  }

  /**
   * Dispose entire engine
   */
  dispose(): void {
    for (const [, entry] of this.nodes) {
      if (entry.workletNode) entry.workletNode.disconnect()
      if (entry.toneNode) entry.toneNode.dispose()
      if (entry.gainNode) entry.gainNode.disconnect()
    }
    this.nodes.clear()
    this.connections.clear()
    if (this.limiter) {
      this.limiter.dispose()
      this.limiter = null
    }
    this.initialized = false
  }

  // --- Private helpers ---

  private getOutputAudioNode(entry: AudioNodeEntry): AudioNode | Tone.ToneAudioNode | null {
    return entry.workletNode ?? entry.toneNode ?? entry.gainNode ?? null
  }

  private getInputAudioNode(entry: AudioNodeEntry): AudioNode | Tone.ToneAudioNode | null {
    return entry.workletNode ?? entry.toneNode ?? entry.gainNode ?? null
  }

  private getOutputIndex(entry: AudioNodeEntry, portId: string): number {
    const idx = entry.definition.outputs.findIndex((p) => p.id === portId)
    return Math.max(0, idx)
  }

  private getInputIndex(entry: AudioNodeEntry, portId: string): number {
    const idx = entry.definition.inputs.findIndex((p) => p.id === portId)
    return Math.max(0, idx)
  }

  private inferSignalType(entry: AudioNodeEntry, portId: string): SignalType {
    const port = entry.definition.outputs.find((p) => p.id === portId)
    return port?.signalType ?? 'audio'
  }
}

/** Singleton engine instance */
export const audioEngine = new AudioEngine()
