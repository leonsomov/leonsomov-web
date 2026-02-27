import type { ModuleDefinition } from '../types/audio'

export const mixerModule: ModuleDefinition = {
  type: 'mixer',
  label: 'Mixer',
  category: 'utility',
  color: '#7A7A7A',
  inputs: [
    { id: 'ch1_in', name: 'Ch 1', direction: 'input', signalType: 'audio' },
    { id: 'ch2_in', name: 'Ch 2', direction: 'input', signalType: 'audio' },
    { id: 'ch3_in', name: 'Ch 3', direction: 'input', signalType: 'audio' },
    { id: 'ch4_in', name: 'Ch 4', direction: 'input', signalType: 'audio' },
  ],
  outputs: [
    { id: 'mix_out', name: 'Mix Out', direction: 'output', signalType: 'audio' },
  ],
  params: [
    { id: 'ch1_level', name: 'Ch 1', min: 0, max: 2, default: 1 },
    { id: 'ch2_level', name: 'Ch 2', min: 0, max: 2, default: 1 },
    { id: 'ch3_level', name: 'Ch 3', min: 0, max: 2, default: 1 },
    { id: 'ch4_level', name: 'Ch 4', min: 0, max: 2, default: 0 },
  ],
  workletName: 'mixer',
  processorName: 'mixer-processor',
  numberOfInputs: 4,
  numberOfOutputs: 1,
}
