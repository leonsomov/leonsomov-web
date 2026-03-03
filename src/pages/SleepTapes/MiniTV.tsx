import { useState, useEffect } from 'react'
import styles from './SleepTapes.module.css'

const TV_PHOTOS = Array.from({ length: 12 }, (_, i) =>
  `/photos/tv/${String(i + 1).padStart(2, '0')}.webp`
)

interface MiniTVProps {
  isPlaying: boolean
}

export function MiniTV({ isPlaying }: MiniTVProps) {
  const [index, setIndex] = useState(0)
  const [glitch, setGlitch] = useState(false)

  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setGlitch(true)
      setTimeout(() => {
        setIndex((i) => (i + 1) % TV_PHOTOS.length)
        setTimeout(() => setGlitch(false), 150)
      }, 300)
    }, 7000)

    return () => clearInterval(interval)
  }, [isPlaying])

  const led = isPlaying ? styles.tvLedOn : styles.tvLed

  return (
    <div className={styles.tvWrap}>
      <pre className={`${styles.tvFrame} ${isPlaying ? styles.tvFrameOn : ''}`}>
{'.-----------------------------------------------------.\n'}
{'|  .-----------------------------------------------.  |\n'}
{'|  |                                               |  |\n'}
{'|  |                                               |  |\n'}
{'|  |                                               |  |\n'}
{'|  |                                               |  |\n'}
{'|  |                                               |  |\n'}
{'|  |                                               |  |\n'}
{'|  |                                               |  |\n'}
{'|  |                                               |  |\n'}
{"|  '-----------------------------------------------'  |\n"}
{'|    '}<span className={led}>{'(o)'}</span>{'                                       SONY   |\n'}
{"'-----------------------------------------------------'"}
      </pre>
      <div className={`${styles.tvScreen} ${isPlaying ? styles.tvScreenOn : ''}`}>
        <img
          src={TV_PHOTOS[index]}
          alt=""
          className={styles.tvPhoto}
          draggable={false}
        />
        <div className={styles.tvScanlines} />
        <div className={styles.tvTracking} />
        <div className={`${styles.tvGlitch} ${glitch ? styles.tvGlitchActive : ''}`} />
      </div>
    </div>
  )
}
