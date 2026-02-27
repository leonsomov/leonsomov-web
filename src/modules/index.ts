import type { ModuleDefinition } from '../types/audio'
import { oscillatorModule } from './oscillator'
import { filterModule } from './filter'
import { vcaModule } from './vca'
import { envelopeModule } from './envelope'
import { lfoModule } from './lfo'
import { noiseModule } from './noise'
import { mixerModule } from './mixer'
import { delayModule } from './delay'
import { reverbModule } from './reverb'
import { outputModule } from './output'

/** All available module definitions, keyed by type */
export const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
  oscillator: oscillatorModule,
  filter: filterModule,
  vca: vcaModule,
  envelope: envelopeModule,
  lfo: lfoModule,
  noise: noiseModule,
  mixer: mixerModule,
  delay: delayModule,
  reverb: reverbModule,
  output: outputModule,
}

/** Ordered list for the module palette */
export const MODULE_LIST: ModuleDefinition[] = [
  oscillatorModule,
  filterModule,
  vcaModule,
  envelopeModule,
  lfoModule,
  noiseModule,
  mixerModule,
  delayModule,
  reverbModule,
  outputModule,
]
