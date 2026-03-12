import { useState, useEffect } from 'react'
import { useAudioPlayer } from './useAudioPlayer'
import { FogCanvas } from '../../components/FogCanvas'
import { Monogram } from '../../components/Monogram'
import styles from './SleepTapes.module.css'

const PHOTOS = [
  '/photos/silhouette-synths.webp',
  '/photos/modular-cables.webp',
  '/photos/ghost-motion.webp',
]

const TRACKS_INFO = [
  { numeral: 'I', duration: '13:31' },
  { numeral: 'II', duration: '4:10' },
  { numeral: 'III', duration: '5:46' },
  { numeral: 'IV', duration: '4:51' },
  { numeral: 'V', duration: '6:15' },
]

export function SleepTapes() {
  const { currentTrack, isPlaying, loading, volume, playTrack, playAll, toggle, setVolume } =
    useAudioPlayer()

  const [photo, setPhoto] = useState<string | null>(null)
  const [photoVisible, setPhotoVisible] = useState(false)

  // Ghost photos that fade in/out while playing
  useEffect(() => {
    if (!isPlaying) {
      setPhotoVisible(false)
      return
    }

    let mounted = true

    const showPhoto = () => {
      if (!mounted) return
      const src = PHOTOS[Math.floor(Math.random() * PHOTOS.length)]
      setPhoto(src)
      setPhotoVisible(true)

      const hideDelay = 4000 + Math.random() * 2000
      setTimeout(() => {
        if (!mounted) return
        setPhotoVisible(false)
      }, hideDelay)
    }

    const firstTimeout = setTimeout(showPhoto, 3000)

    const interval = setInterval(() => {
      showPhoto()
    }, 10000 + Math.random() * 8000)

    return () => {
      mounted = false
      clearTimeout(firstTimeout)
      clearInterval(interval)
    }
  }, [isPlaying])

  const handlePlay = () => {
    if (loading) return
    if (currentTrack === null) {
      playAll()
    } else {
      toggle()
    }
  }

  return (
    <div className={styles.page}>
      {/* Background layers */}
      <FogCanvas />
      <div className={styles.bgPhoto} />

      {photo && (
        <div
          className={`${styles.ghost} ${photoVisible ? styles.ghostVisible : ''}`}
          style={{ backgroundImage: `url(${photo})` }}
        />
      )}

      {/* Content */}
      <div className={styles.content}>
        <h1 className={`${styles.title} ${isPlaying ? styles.titleGlow : ''}`}>
          Sleep Tapes
        </h1>
        <p className={styles.subtitle}>vol. 1 — mediterranean coast</p>

        <button
          className={`${styles.playBtn} ${isPlaying ? styles.playBtnPlaying : ''} ${loading ? styles.playBtnLoading : ''}`}
          onClick={handlePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <span className={styles.pauseIcon}>
              <span className={styles.pauseBar} />
              <span className={styles.pauseBar} />
            </span>
          ) : (
            <span className={styles.playIcon} />
          )}
        </button>

        <div className={styles.tracks}>
          {TRACKS_INFO.map((track, i) => (
            <span
              key={i}
              className={`${styles.trackNum} ${currentTrack === i ? styles.trackNumActive : ''}`}
              onClick={() => playTrack(i)}
            >
              {track.numeral}
              <span className={styles.trackDuration}>{track.duration}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Note */}
      <p className={styles.note}>
        five pieces, thirty-five minutes,<br />
        recorded on the coast of the Balearic Sea,<br />
        along the shore from Valencia to silence.<br />
        for the spaces between waking and sleep.
      </p>

      {/* Volume */}
      <div className={styles.controls}>
        <label className={styles.volumeWrap}>
          <span className={styles.volumeLabel}>vol</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className={styles.volumeSlider}
          />
        </label>
      </div>

      {/* Back */}
      <a href="/" className={styles.backLink} aria-label="Back to Leon Somov">
        <Monogram className={styles.monogram} />
      </a>
    </div>
  )
}
