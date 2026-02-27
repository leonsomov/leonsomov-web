import type { ModuleDefinition } from '../types/audio'

export const delayModule: ModuleDefinition = {
  type: 'delay',
  label: 'Delay',
  category: 'effect',
  color: '#4ABCDE',
  inputs: [
    { id: 'audio_in', name: 'In', direction: 'input', signalType: 'audio' },
  ],
  outputs: [
    { id: 'delay_out', name: 'Out', direction: 'output', signalType: 'audio' },
  ],
  params: [
    { id: 'time', name: 'Time', min: 0.01, max: 1, default: 0.3, unit: 's' },
    { id: 'feedback', name: 'Feedback', min: 0, max: 0.95, default: 0.4 },
    { id: 'wet', name: 'Wet', min: 0, max: 1, default: 0.5 },
  ],
  toneNode: 'FeedbackDelay',
}
