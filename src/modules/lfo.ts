import type { ModuleDefinition } from '../types/audio'

export const lfoModule: ModuleDefinition = {
  type: 'lfo',
  label: 'LFO',
  category: 'modulation',
  color: '#B84ADE',
  inputs: [],
  outputs: [
    { id: 'lfo_out', name: 'Out', direction: 'output', signalType: 'cv' },
  ],
  params: [
    { id: 'rate', name: 'Rate', min: 0.01, max: 50, default: 1, unit: 'Hz', scaling: 'exp' },
    { id: 'shape', name: 'Shape', min: 0, max: 4, default: 0, step: 1 },
    { id: 'depth', name: 'Depth', min: 0, max: 1, default: 1 },
  ],
  workletName: 'lfo',
  processorName: 'lfo-processor',
  numberOfInputs: 0,
  numberOfOutputs: 1,
}
