/** Signal types for patch cables */
export type SignalType = 'audio' | 'cv' | 'gate'

/** Port direction */
export type PortDirection = 'input' | 'output'

/** Port identifier */
export interface PortId {
  moduleId: string
  portId: string
}

/** Connection between two ports */
export interface Connection {
  id: string
  from: PortId
  to: PortId
  signalType: SignalType
}

/** Port configuration for a module definition */
export interface PortConfig {
  id: string
  name: string
  direction: PortDirection
  signalType: SignalType
  defaultValue?: number
}

/** Parameter configuration for a module definition */
export interface ParamConfig {
  id: string
  name: string
  min: number
  max: number
  default: number
  unit?: string
  scaling?: 'linear' | 'exp' | 'log'
  step?: number
}

/** Module definition — declarative schema for building modules */
export interface ModuleDefinition {
  type: string
  label: string
  category: 'source' | 'filter' | 'amplifier' | 'modulation' | 'effect' | 'utility' | 'output'
  color: string
  inputs: PortConfig[]
  outputs: PortConfig[]
  params: ParamConfig[]
  workletName?: string
  processorName?: string
  /** For Tone.js-based modules */
  toneNode?: string
  /** Number of AudioWorkletNode inputs */
  numberOfInputs?: number
  /** Number of AudioWorkletNode outputs */
  numberOfOutputs?: number
}

/** Patch state for serialization */
export interface PatchState {
  version: number
  name: string
  nodes: Array<{
    id: string
    type: string
    position: { x: number; y: number }
    params: Record<string, number>
  }>
  connections: Connection[]
}
