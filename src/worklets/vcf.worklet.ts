/**
 * VCF AudioWorklet Processor — Geeky Synth
 *
 * 4-pole (24dB/oct) State Variable Filter (Chamberlin).
 * 2x oversampling for stability. CV modulation on cutoff.
 * Ported from Bullfrog VCF.
 */

const P = {
  cutoff: { min: 40, max: 20000, default: 1000 },
  resonance: { min: 0, max: 1, default: 0 },
  cv_amount: { min: 0, max: 1, default: 0.5 },
} as const

interface SVFState {
  lp: number
  bp: number
}

class VCFProcessor extends AudioWorkletProcessor {
  private stage1: SVFState = { lp: 0, bp: 0 }
  private stage2: SVFState = { lp: 0, bp: 0 }
  private dcX = 0
  private dcY = 0

  static get parameterDescriptors(): AudioParamDescriptor[] {
    return [
      { name: 'cutoff', defaultValue: P.cutoff.default, minValue: P.cutoff.min, maxValue: P.cutoff.max, automationRate: 'a-rate' },
      { name: 'resonance', defaultValue: P.resonance.default, minValue: P.resonance.min, maxValue: P.resonance.max, automationRate: 'a-rate' },
      { name: 'cv_amount', defaultValue: P.cv_amount.default, minValue: P.cv_amount.min, maxValue: P.cv_amount.max, automationRate: 'a-rate' },
    ]
  }

  private flushDenormals(state: SVFState): void {
    const tiny = 1e-18
    if (Math.abs(state.lp) < tiny) state.lp = 0
    if (Math.abs(state.bp) < tiny) state.bp = 0
  }

  private processSVFStage(state: SVFState, input: number, f: number, q: number): number {
    const hp = input - state.lp - q * state.bp
    state.bp = state.bp + f * hp
    state.lp = state.lp + f * state.bp
    return state.lp
  }

  private softClip(sample: number): number {
    if (sample >= 1.0) return 1.0
    if (sample <= -1.0) return -1.0
    return 1.5 * sample - 0.5 * sample * sample * sample
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean {
    const audioIn = inputs[0]?.[0]
    const cvIn = inputs[1]?.[0]
    const vcfOut = outputs[0]?.[0]

    if (!vcfOut) return true

    const numSamples = vcfOut.length
    const oversampledRate = sampleRate * 2
    const maxCutoff = sampleRate * 0.4
    const dcR = 1 - (2 * Math.PI * 5) / sampleRate

    for (let i = 0; i < numSamples; i++) {
      const baseCutoff = parameters.cutoff.length > 1 ? parameters.cutoff[i] : parameters.cutoff[0]
      const resonance = parameters.resonance.length > 1 ? parameters.resonance[i] : parameters.resonance[0]
      const cvAmt = parameters.cv_amount.length > 1 ? parameters.cv_amount[i] : parameters.cv_amount[0]

      const cv = cvIn ? cvIn[i] * cvAmt : 0
      let cutoff = baseCutoff * Math.pow(2, cv * 5)
      cutoff = Math.max(P.cutoff.min, Math.min(cutoff, maxCutoff))

      const f = 2 * Math.sin((Math.PI * cutoff) / oversampledRate)
      const q = 1 - resonance * 0.97

      const input = audioIn ? audioIn[i] : 0
      let out = 0

      // 2x oversampling
      for (let os = 0; os < 2; os++) {
        const lp1 = this.processSVFStage(this.stage1, input, f, q)
        this.flushDenormals(this.stage1)
        out = this.processSVFStage(this.stage2, lp1, f, q)
        this.flushDenormals(this.stage2)
      }

      // Transparency bypass when fully open
      if (baseCutoff >= P.cutoff.max * 0.98 && resonance <= 0.1 && Math.abs(cv) < 1e-3) {
        this.dcX = 0
        this.dcY = 0
        vcfOut[i] = input
        continue
      }

      // DC block
      const newDcY = dcR * (this.dcY + out - this.dcX)
      this.dcX = out
      this.dcY = newDcY
      out = newDcY

      vcfOut[i] = this.softClip(out)
    }

    return true
  }
}

registerProcessor('vcf-processor', VCFProcessor)
