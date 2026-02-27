import type { ModuleDefinition } from '../types/audio'

export const oscillatorModule: ModuleDefinition = {
  type: 'oscillator',
  label: 'VCO',
  category: 'source',
  color: '#E3C330',
  inputs: [
    { id: 'v_oct', name: '1V/Oct', direction: 'input', signalType: 'cv' },
    { id: 'fm_in', name: 'FM In', direction: 'input', signalType: 'audio' },
  ],
  outputs: [
    { id: 'sine_out', name: 'Sine', direction: 'output', signalType: 'audio' },
    { id: 'pulse_out', name: 'Pulse', direction: 'output', signalType: 'audio' },
  ],
  params: [
    { id: 'tune', name: 'Tune', min: 20, max: 10000, default: 440, unit: 'Hz', scaling: 'exp' },
    { id: 'shape', name: 'Shape', min: 0, max: 1, default: 0.5 },
    { id: 'fm', name: 'FM', min: 0, max: 1, default: 0 },
  ],
  workletName: 'vco',
  processorName: 'vco-processor',
  numberOfInputs: 2,
  numberOfOutputs: 2,
}
