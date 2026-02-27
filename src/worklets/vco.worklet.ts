/**
 * VCO AudioWorklet Processor — Geeky Synth
 *
 * Band-limited oscillator with PolyBLEP anti-aliasing.
 * Sine morphing (inverted sharkfin ↔ sine ↔ sharkfin) + pulse with PWM.
 * Ported from Bullfrog VCO.
 */

const P = {
  tune: { min: 20, max: 10000, default: 440 },
  shape: { min: 0, max: 1, default: 0.5 },
  fm: { min: 0, max: 1, default: 0 },
} as const

class VCOProcessor extends AudioWorkletProcessor {
  private phase = 0

  static get parameterDescriptors(): AudioParamDescriptor[] {
    return [
      { name: 'tune', defaultValue: P.tune.default, minValue: P.tune.min, maxValue: P.tune.max, automationRate: 'a-rate' },
      { name: 'shape', defaultValue: P.shape.default, minValue: P.shape.min, maxValue: P.shape.max, automationRate: 'a-rate' },
      { name: 'fm', defaultValue: P.fm.default, minValue: P.fm.min, maxValue: P.fm.max, automationRate: 'a-rate' },
    ]
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean {
    const sineOut = outputs[0]?.[0]
    const pulseOut = outputs[1]?.[0]

    if (!sineOut && !pulseOut) return true

    const numSamples = sineOut?.length ?? pulseOut?.length ?? 0

    // Inputs: 0=1v/oct, 1=fm_in
    const cv1vOct = inputs[0]?.[0]
    const fmIn = inputs[1]?.[0]

    for (let i = 0; i < numSamples; i++) {
      const tune = parameters.tune.length > 1 ? parameters.tune[i] : parameters.tune[0]
      const shape = parameters.shape.length > 1 ? parameters.shape[i] : parameters.shape[0]
      const fm = parameters.fm.length > 1 ? parameters.fm[i] : parameters.fm[0]

      const baseFreq = tune

      // 1V/Oct pitch modulation
      const pitchCv = cv1vOct ? cv1vOct[i] : 0
      const pitchMod = pitchCv !== 0 ? baseFreq * (Math.pow(2, pitchCv) - 1) : 0

      // FM with limiter
      const fmMod = fmIn ? Math.tanh(fmIn[i] * fm) * baseFreq * 0.5 : 0
      const actualFreq = Math.max(20, Math.min(sampleRate * 0.45, baseFreq + fmMod + pitchMod))

      const phaseInc = actualFreq / sampleRate
      this.phase = (this.phase + phaseInc) % 1

      // 3-way sine morphing: 0=inverted sharkfin, 0.5=sine, 1.0=sharkfin
      const sine = Math.sin(this.phase * 2 * Math.PI)
      const sharkfin = this.sharkfin(this.phase)
      const invertedSharkfin = this.invertedSharkfin(this.phase)

      let sineVal: number
      if (shape < 0.5) {
        const blend = shape * 2
        sineVal = invertedSharkfin * (1 - blend) + sine * blend
      } else {
        const blend = (shape - 0.5) * 2
        sineVal = sine * (1 - blend) + sharkfin * blend
      }

      if (sineOut) sineOut[i] = sineVal

      // Pulse with shape-controlled width
      if (pulseOut) {
        const pw = Math.max(0.05, Math.min(0.95, 0.1 + shape * 0.8))
        pulseOut[i] = this.polyBlepPulse(this.phase, pw, phaseInc)
      }
    }

    return true
  }

  private sharkfin(phase: number): number {
    if (phase < 0.25) return phase * 4
    if (phase < 0.75) return 1 - (phase - 0.25) * 4
    return (phase - 0.75) * 4 - 1
  }

  private invertedSharkfin(phase: number): number {
    const p = (phase + 0.5) % 1
    if (p < 0.25) return -p * 4
    if (p < 0.75) return -1 + (p - 0.25) * 4
    return 1 - (p - 0.75) * 4
  }

  private polyBlepPulse(phase: number, pw: number, dt: number): number {
    let value = phase < pw ? 1 : -1
    value += this.polyBlep(phase, dt)
    value -= this.polyBlep((phase - pw + 1) % 1, dt)
    return value
  }

  private polyBlep(t: number, dt: number): number {
    if (t < dt) {
      t /= dt
      return t + t - t * t - 1
    } else if (t > 1 - dt) {
      t = (t - 1) / dt
      return t * t + t + t + 1
    }
    return 0
  }
}

registerProcessor('vco-processor', VCOProcessor)
