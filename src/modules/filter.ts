import type { ModuleDefinition } from '../types/audio'

export const filterModule: ModuleDefinition = {
  type: 'filter',
  label: 'VCF',
  category: 'filter',
  color: '#4A9EDE',
  inputs: [
    { id: 'audio_in', name: 'Audio In', direction: 'input', signalType: 'audio' },
    { id: 'cv_in', name: 'CV In', direction: 'input', signalType: 'cv' },
  ],
  outputs: [
    { id: 'vcf_out', name: 'Out', direction: 'output', signalType: 'audio' },
  ],
  params: [
    { id: 'cutoff', name: 'Cutoff', min: 40, max: 20000, default: 1000, unit: 'Hz', scaling: 'exp' },
    { id: 'resonance', name: 'Resonance', min: 0, max: 1, default: 0 },
    { id: 'cv_amount', name: 'CV Amt', min: 0, max: 1, default: 0.5 },
  ],
  workletName: 'vcf',
  processorName: 'vcf-processor',
  numberOfInputs: 2,
  numberOfOutputs: 1,
}
