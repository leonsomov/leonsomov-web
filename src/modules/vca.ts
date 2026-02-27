import type { ModuleDefinition } from '../types/audio'

export const vcaModule: ModuleDefinition = {
  type: 'vca',
  label: 'VCA',
  category: 'amplifier',
  color: '#5DBE6E',
  inputs: [
    { id: 'audio_in', name: 'Audio In', direction: 'input', signalType: 'audio' },
    { id: 'cv_in', name: 'CV In', direction: 'input', signalType: 'cv' },
  ],
  outputs: [
    { id: 'vca_out', name: 'Out', direction: 'output', signalType: 'audio' },
  ],
  params: [
    { id: 'gain', name: 'Gain', min: 0, max: 1, default: 0.5 },
  ],
  workletName: 'vca',
  processorName: 'vca-processor',
  numberOfInputs: 2,
  numberOfOutputs: 1,
}
