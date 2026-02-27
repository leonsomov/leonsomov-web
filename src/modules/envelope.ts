import type { ModuleDefinition } from '../types/audio'

export const envelopeModule: ModuleDefinition = {
  type: 'envelope',
  label: 'ADSR',
  category: 'modulation',
  color: '#DE6B4A',
  inputs: [
    { id: 'gate_in', name: 'Gate', direction: 'input', signalType: 'gate' },
  ],
  outputs: [
    { id: 'env_out', name: 'Out', direction: 'output', signalType: 'cv' },
  ],
  params: [
    { id: 'attack', name: 'Attack', min: 0.001, max: 10, default: 0.01, unit: 's', scaling: 'exp' },
    { id: 'decay', name: 'Decay', min: 0.001, max: 10, default: 0.1, unit: 's', scaling: 'exp' },
    { id: 'sustain', name: 'Sustain', min: 0, max: 1, default: 0.7 },
    { id: 'release', name: 'Release', min: 0.001, max: 10, default: 0.3, unit: 's', scaling: 'exp' },
  ],
  workletName: 'envelope',
  processorName: 'envelope-processor',
  numberOfInputs: 1,
  numberOfOutputs: 1,
}
