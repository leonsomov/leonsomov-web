import type { ModuleDefinition } from '../types/audio'

export const noiseModule: ModuleDefinition = {
  type: 'noise',
  label: 'Noise',
  category: 'source',
  color: '#888888',
  inputs: [],
  outputs: [
    { id: 'noise_out', name: 'Out', direction: 'output', signalType: 'audio' },
  ],
  params: [],
  workletName: 'noise',
  processorName: 'noise-processor',
  numberOfInputs: 0,
  numberOfOutputs: 1,
}
