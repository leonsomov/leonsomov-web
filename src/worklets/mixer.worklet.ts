/**
 * Mixer AudioWorklet Processor — Geeky Synth
 *
 * 4-channel mixer. Per-channel level + soft clip on mix bus.
 * Ported from Bullfrog mixer.
 */

class MixerProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors(): AudioParamDescriptor[] {
    return [
      { name: 'ch1_level', defaultValue: 1, minValue: 0, maxValue: 2, automationRate: 'a-rate' },
      { name: 'ch2_level', defaultValue: 1, minValue: 0, maxValue: 2, automationRate: 'a-rate' },
      { name: 'ch3_level', defaultValue: 1, minValue: 0, maxValue: 2, automationRate: 'a-rate' },
      { name: 'ch4_level', defaultValue: 0, minValue: 0, maxValue: 2, automationRate: 'a-rate' },
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
    const mixOut = outputs[0]?.[0]
    if (!mixOut) return true

    const numSamples = mixOut.length

    for (let i = 0; i < numSamples; i++) {
      const l1 = parameters.ch1_level.length > 1 ? parameters.ch1_level[i] : parameters.ch1_level[0]
      const l2 = parameters.ch2_level.length > 1 ? parameters.ch2_level[i] : parameters.ch2_level[0]
      const l3 = parameters.ch3_level.length > 1 ? parameters.ch3_level[i] : parameters.ch3_level[0]
      const l4 = parameters.ch4_level.length > 1 ? parameters.ch4_level[i] : parameters.ch4_level[0]

      const ch1 = inputs[0]?.[0] ? inputs[0][0][i] * l1 : 0
      const ch2 = inputs[1]?.[0] ? inputs[1][0][i] * l2 : 0
      const ch3 = inputs[2]?.[0] ? inputs[2][0][i] * l3 : 0
      const ch4 = inputs[3]?.[0] ? inputs[3][0][i] * l4 : 0

      mixOut[i] = this.softClip(ch1 + ch2 + ch3 + ch4)
    }

    return true
  }
}

registerProcessor('mixer-processor', MixerProcessor)
