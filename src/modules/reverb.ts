import type { ModuleDefinition } from '../types/audio'

export const reverbModule: ModuleDefinition = {
  type: 'reverb',
  label: 'Reverb',
  category: 'effect',
  color: '#4ABCDE',
  inputs: [
    { id: 'audio_in', name: 'In', direction: 'input', signalType: 'audio' },
  ],
  outputs: [
    { id: 'reverb_out', name: 'Out', direction: 'output', signalType: 'audio' },
  ],
  params: [
    { id: 'decay', name: 'Decay', min: 0.1, max: 10, default: 2.5, unit: 's' },
    { id: 'wet', name: 'Wet', min: 0, max: 1, default: 0.3 },
  ],
  toneNode: 'Reverb',
}
