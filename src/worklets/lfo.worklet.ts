/**
 * LFO AudioWorklet Processor — Geeky Synth
 *
 * Low Frequency Oscillator for modulation.
 * Outputs: sine, triangle, square, saw, random (S&H).
 * Rate from 0.01 Hz to 50 Hz.
 */

class LFOProcessor extends AudioWorkletProcessor {
  private phase = 0
  private randomValue = 0
  private prevPhase = 0

  static get parameterDescriptors(): AudioParamDescriptor[] {
    return [
      { name: 'rate', defaultValue: 1, minValue: 0.01, maxValue: 50, automationRate: 'a-rate' },
      { name: 'shape', defaultValue: 0, minValue: 0, maxValue: 4, automationRate: 'k-rate' },
      { name: 'depth', defaultValue: 1, minValue: 0, maxValue: 1, automationRate: 'a-rate' },
    ]
  }

  constructor() {
    super()
    this.randomValue = Math.random() * 2 - 1
  }

  process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean {
    const out = outputs[0]?.[0]
    if (!out) return true

    const numSamples = out.length
    const shapeParam = parameters.shape[0]
    // Round to nearest integer for waveform selection
    const shape = Math.round(Math.max(0, Math.min(4, shapeParam)))

    for (let i = 0; i < numSamples; i++) {
      const rate = parameters.rate.length > 1 ? parameters.rate[i] : parameters.rate[0]
      const depth = parameters.depth.length > 1 ? parameters.depth[i] : parameters.depth[0]

      this.prevPhase = this.phase
      this.phase = (this.phase + rate / sampleRate) % 1

      // New cycle detection for S&H
      if (this.phase < this.prevPhase) {
        this.randomValue = Math.random() * 2 - 1
      }

      let value: number
      switch (shape) {
        case 0: // Sine
          value = Math.sin(this.phase * 2 * Math.PI)
          break
        case 1: // Triangle
          value = this.phase < 0.5
            ? this.phase * 4 - 1
            : 3 - this.phase * 4
          break
        case 2: // Square
          value = this.phase < 0.5 ? 1 : -1
          break
        case 3: // Saw
          value = this.phase * 2 - 1
          break
        case 4: // Random (Sample & Hold)
          value = this.randomValue
          break
        default:
          value = Math.sin(this.phase * 2 * Math.PI)
      }

      out[i] = value * depth
    }

    return true
  }
}

registerProcessor('lfo-processor', LFOProcessor)
