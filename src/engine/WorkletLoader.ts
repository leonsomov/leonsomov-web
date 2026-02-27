/**
 * WorkletLoader — loads AudioWorklet processors
 *
 * Handles deduplication, parallel loading, and dev/prod path resolution.
 */

export interface WorkletConfig {
  name: string
  processorName: string
}

export class WorkletLoader {
  private audioContext: AudioContext
  private loadedWorklets = new Set<string>()
  private loadingPromises = new Map<string, Promise<void>>()

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext
  }

  async loadWorklet(config: WorkletConfig): Promise<void> {
    const { name, processorName } = config

    if (this.loadingPromises.has(processorName)) {
      return this.loadingPromises.get(processorName)!
    }

    if (this.loadedWorklets.has(processorName)) {
      return
    }

    const workletPath = this.getWorkletPath(name)
    if (import.meta.env.DEV) console.log(`[WorkletLoader] Loading ${processorName} from ${workletPath}`)

    const loadPromise = this.audioContext.audioWorklet
      .addModule(workletPath)
      .then(() => {
        this.loadedWorklets.add(processorName)
        this.loadingPromises.delete(processorName)
        if (import.meta.env.DEV) console.log(`[WorkletLoader] Loaded ${processorName}`)
      })
      .catch((error) => {
        this.loadingPromises.delete(processorName)
        throw new Error(
          `Failed to load worklet "${processorName}" from ${workletPath}: ${error.message}`
        )
      })

    this.loadingPromises.set(processorName, loadPromise)
    return loadPromise
  }

  async loadAll(configs: WorkletConfig[]): Promise<void> {
    await Promise.all(configs.map((c) => this.loadWorklet(c)))
  }

  private getWorkletPath(name: string): string {
    const basePath = import.meta.env.BASE_URL || '/'
    const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`
    const cacheBust = import.meta.env.DEV ? `?t=${Date.now()}` : ''
    return `${normalizedBase}worklets/${name}.js${cacheBust}`
  }
}

/** All worklet processors needed for Geeky Synth */
export const SYNTH_WORKLETS: WorkletConfig[] = [
  { name: 'vco', processorName: 'vco-processor' },
  { name: 'vcf', processorName: 'vcf-processor' },
  { name: 'vca', processorName: 'vca-processor' },
  { name: 'envelope', processorName: 'envelope-processor' },
  { name: 'lfo', processorName: 'lfo-processor' },
  { name: 'noise', processorName: 'noise-processor' },
  { name: 'mixer', processorName: 'mixer-processor' },
]
