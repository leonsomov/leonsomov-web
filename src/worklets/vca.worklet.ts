/**
 * VCA AudioWorklet Processor — Geeky Synth
 *
 * Voltage-Controlled Amplifier with CV modulation.
 * Soft clipping for analog character. DC blocking.
 * Extracted from Bullfrog VCA/Delay (delay removed).
 */

class VCAProcessor extends AudioWorkletProcessor {
  private dcBlockState = 0
  private prevSignal = 0

  static get parameterDescriptors(): AudioParamDescriptor[] {
    return [
      { name: 'gain', defaultValue: 0.5, minValue: 0, maxValue: 1, automationRate: 'a-rate' },
    ]
  }

  private softClip(x: number): number {
    if (x >= 1.0) return 1.0
    if (x <= -1.0) return -1.0
    return 1.5 * x - 0.5 * x * x * x
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean {
    const audioIn = inputs[0]?.[0]
    const cvIn = inputs[1]?.[0]
    const vcaOut = outputs[0]?.[0]

    if (!vcaOut) return true

    const numSamples = vcaOut.length
    const dcR = 1 - (2 * Math.PI * 5) / sampleRate

    for (let i = 0; i < numSamples; i++) {
      const input = audioIn ? audioIn[i] : 0
      const gainParam = parameters.gain.length > 1 ? parameters.gain[i] : parameters.gain[0]

      // CV modulation adds to gain parameter
      const cv = cvIn ? cvIn[i] : 0
      const amplitude = Math.max(0, Math.min(2, gainParam + cv))

      let signal = input * amplitude
      signal = this.softClip(signal)

      // DC block
      const dcBlocked = dcR * (this.dcBlockState + signal - this.prevSignal)
      this.dcBlockState = dcBlocked
      this.prevSignal = signal

      vcaOut[i] = dcBlocked
    }

    return true
  }
}

registerProcessor('vca-processor', VCAProcessor)
