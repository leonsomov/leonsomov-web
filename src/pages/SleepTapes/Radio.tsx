import styles from './SleepTapes.module.css'

interface RadioProps {
  isOn: boolean
  volume: number
  onToggle: () => void
  onVolumeChange: (v: number) => void
}

export function Radio({ isOn, volume, onToggle, onVolumeChange }: RadioProps) {
  const led = isOn ? styles.tvLedOn : styles.tvLed
  const frameClass = `${styles.radioFrame} ${isOn ? styles.radioFrameOn : ''}`

  return (
    <div className={styles.radioWrap}>
      <pre className={frameClass} onClick={onToggle}>
{'.-----------------------------------------------------.\n'}
{'|  .-----------------------------------------------.  |\n'}
{'|  |  ===========================================  |  |\n'}
{'|  |  ===========================================  |  |\n'}
{'|  |  ===========================================  |  |\n'}
{'|  |  ===========================================  |  |\n'}
{"|  '-----------------------------------------------'  |\n"}
{'|    '}<span className={led}>{'(o)'}</span>{'                              SHORTWAVE       |\n'}
{"'-----------------------------------------------------'"}
      </pre>
      <div className={styles.radioControls}>
        <label className={styles.volumeWrap}>
          <span className={`${styles.radioLabel} ${isOn ? styles.radioLabelOn : ''}`}>
            radio
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className={styles.volumeSlider}
            onClick={(e) => e.stopPropagation()}
          />
        </label>
      </div>
    </div>
  )
}
