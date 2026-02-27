/**
 * Noise Generator AudioWorklet Processor — Geeky Synth
 *
 * White noise with analog-style soft clipping and DC blocking.
 * Ported from Bullfrog noise.
 */

class NoiseProcessor extends AudioWorkletProcessor {
  private seed = (Math.floor(Math.random() * 0xffffffff) ^ Date.now()) >>> 0
  private dcBlockState = 0
  private prevInput = 0

  private softClip(x: number): number {
    if (x >= 1.0) return 1.0
    if (x <= -1.0) return -1.0
    return 1.5 * x - 0.5 * x * x * x
  }

  process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>
  ): boolean {
    const output = outputs[0]?.[0]
    if (!output) return true

    const dcR = 1 - (2 * Math.PI * 5) / sampleRate

    for (let i = 0; i < output.length; i++) {
      const white = this.nextRandom()
      const sample = this.softClip(white * 1.2)

      const dcBlocked = dcR * (this.dcBlockState + sample - this.prevInput)
      this.dcBlockState = dcBlocked
      this.prevInput = sample

      output[i] = dcBlocked
    }

    return true
  }

  private nextRandom(): number {
    const a = 1103515245
    const c = 12345
    this.seed = (Math.imul(a, this.seed) + c) >>> 0
    const unsigned31 = this.seed & 0x7fffffff
    return unsigned31 / 0x40000000 - 1.0
  }
}

registerProcessor('noise-processor', NoiseProcessor)
