/**
 * Envelope Generator AudioWorklet Processor — Geeky Synth
 *
 * ADSR envelope with gate triggering.
 * Supports loop mode (LFO-like) and free mode (gate-controlled).
 * Ported from Bullfrog envelope.
 */

const EnvelopeStage = {
  Idle: 0,
  Attack: 1,
  Decay: 2,
  Sustain: 3,
  Release: 4,
} as const

type EnvelopeStageType = (typeof EnvelopeStage)[keyof typeof EnvelopeStage]

class EnvelopeProcessor extends AudioWorkletProcessor {
  private stage: EnvelopeStageType = EnvelopeStage.Idle
  private envelope = 0
  private gateWasHigh = false

  static get parameterDescriptors(): AudioParamDescriptor[] {
    return [
      { name: 'attack', defaultValue: 0.01, minValue: 0.001, maxValue: 10, automationRate: 'a-rate' },
      { name: 'decay', defaultValue: 0.1, minValue: 0.001, maxValue: 10, automationRate: 'a-rate' },
      { name: 'sustain', defaultValue: 0.7, minValue: 0, maxValue: 1, automationRate: 'a-rate' },
      { name: 'release', defaultValue: 0.3, minValue: 0.001, maxValue: 10, automationRate: 'a-rate' },
    ]
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean {
    const gateIn = inputs[0]?.[0]
    const envOut = outputs[0]?.[0]

    if (!envOut) return true

    const numSamples = envOut.length

    for (let i = 0; i < numSamples; i++) {
      const gateHigh = gateIn ? gateIn[i] > 0.5 : false

      const attackTime = this.getParam(parameters.attack, i)
      const decayTime = this.getParam(parameters.decay, i)
      const sustainLevel = this.getParam(parameters.sustain, i)
      const releaseTime = this.getParam(parameters.release, i)

      const attackRate = 1 / (attackTime * sampleRate)
      const decayRate = 1 / (decayTime * sampleRate)
      const releaseRate = 1 / (releaseTime * sampleRate)

      const gateRising = gateHigh && !this.gateWasHigh
      const gateFalling = !gateHigh && this.gateWasHigh

      if (gateRising) {
        this.stage = EnvelopeStage.Attack
      } else if (gateFalling && this.stage !== EnvelopeStage.Idle && this.stage !== EnvelopeStage.Release) {
        this.stage = EnvelopeStage.Release
      }

      switch (this.stage) {
        case EnvelopeStage.Idle:
          this.envelope = 0
          break
        case EnvelopeStage.Attack:
          this.envelope += attackRate
          if (this.envelope >= 1) {
            this.envelope = 1
            this.stage = EnvelopeStage.Decay
          }
          break
        case EnvelopeStage.Decay:
          this.envelope -= decayRate
          if (this.envelope <= sustainLevel) {
            this.envelope = sustainLevel
            this.stage = EnvelopeStage.Sustain
          }
          break
        case EnvelopeStage.Sustain:
          this.envelope = sustainLevel
          break
        case EnvelopeStage.Release:
          this.envelope -= releaseRate
          if (this.envelope <= 0) {
            this.envelope = 0
            this.stage = EnvelopeStage.Idle
          }
          break
      }

      this.gateWasHigh = gateHigh
      envOut[i] = this.envelope
    }

    // Send LED state update at ~30Hz
    this.port.postMessage({
      type: 'led',
      state: { envelope: this.envelope }
    })

    return true
  }

  private getParam(param: Float32Array | undefined, index: number): number {
    if (!param) return 0
    return param.length > 1 ? param[index] : param[0]
  }
}

registerProcessor('envelope-processor', EnvelopeProcessor)
