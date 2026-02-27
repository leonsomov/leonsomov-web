import type { ModuleDefinition } from '../types/audio'

export const outputModule: ModuleDefinition = {
  type: 'output',
  label: 'Output',
  category: 'output',
  color: '#f0f0ef',
  inputs: [
    { id: 'audio_in', name: 'In', direction: 'input', signalType: 'audio' },
  ],
  outputs: [],
  params: [
    { id: 'volume', name: 'Volume', min: 0, max: 1, default: 0.7 },
  ],
}
