import { useState, useEffect } from 'react'
import styles from './SleepTapes.module.css'

const TV_PHOTOS = [
  { src: '/photos/tv/01.webp', position: 'center 35%' },
  { src: '/photos/tv/02.webp', position: 'center 50%' },
  { src: '/photos/tv/03.webp', position: 'center' },
  { src: '/photos/tv/04.webp', position: 'center 35%' },
  { src: '/photos/tv/05.webp', position: 'center 38%' },
  { src: '/photos/tv/06.webp', position: 'center 35%' },
  { src: '/photos/tv/07.webp', position: 'center 40%' },
  { src: '/photos/tv/08.webp', position: 'center 35%' },
  { src: '/photos/tv/09.webp', position: 'center 35%' },
  { src: '/photos/tv/10.webp', position: 'center 40%' },
  { src: '/photos/tv/11.webp', position: 'center 40%' },
  { src: '/photos/tv/12.webp', position: 'center 45%' },
]

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
        setTimeout(() => setGlitch(false), 200)
      }, 350)
    }, 7000)

    return () => clearInterval(interval)
  }, [isPlaying])

  const led = isPlaying ? styles.tvLedOn : styles.tvLed
  const photo = TV_PHOTOS[index]
  const bg = { backgroundImage: `url(${photo.src})`, backgroundPosition: photo.position }

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
{'|    '}<span className={led}>{'(o)'}</span>{'                                         TV   |\n'}
{"'-----------------------------------------------------'"}
      </pre>
      <div className={`${styles.tvScreen} ${isPlaying ? styles.tvScreenOn : styles.tvScreenIdle}`}>
        {isPlaying && <>
          <div className={styles.tvPhoto} style={bg} />
          <div className={styles.tvPhotoR} style={bg} />
          <div className={styles.tvPhotoB} style={bg} />
        </>}
        <div className={styles.tvScanlines} />
        <div className={styles.tvNoise} />
        <div className={styles.tvVignette} />
        <div className={styles.tvTracking} />
        <div className={`${styles.tvGlitch} ${glitch ? styles.tvGlitchActive : ''}`} />
        <div className={styles.tvFlicker} />
      </div>
    </div>
  )
}
