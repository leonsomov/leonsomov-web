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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SleepTapes() {
  const { currentTrack, isPlaying, loading, volume, currentTime, duration, playTrack, playAll, toggle, setVolume, seek } =
    useAudioPlayer()

  const [photo, setPhoto] = useState<string | null>(null)
  const [photoVisible, setPhotoVisible] = useState(false)

  // Ghost photos — cycle slowly when idle, faster when playing
  useEffect(() => {
    let mounted = true

    const showPhoto = () => {
      if (!mounted) return
      const src = PHOTOS[Math.floor(Math.random() * PHOTOS.length)]
      setPhoto(src)
      setPhotoVisible(true)

      const hideDelay = isPlaying ? 4000 + Math.random() * 2000 : 6000 + Math.random() * 3000
      setTimeout(() => {
        if (!mounted) return
        setPhotoVisible(false)
      }, hideDelay)
    }

    const firstDelay = isPlaying ? 3000 : 5000
    const firstTimeout = setTimeout(showPhoto, firstDelay)

    const loopDelay = isPlaying ? 10000 + Math.random() * 8000 : 18000 + Math.random() * 10000
    const interval = setInterval(showPhoto, loopDelay)

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

  const progress = duration > 0 ? currentTime / duration : 0

  return (
    <div className={styles.page}>
      {/* Background layers */}
      <FogCanvas />
      <div className={styles.bgPhoto} />

      {photo && (
        <div
          className={`${styles.ghost} ${photoVisible ? styles.ghostVisible : ''} ${isPlaying ? styles.ghostPlaying : ''}`}
          style={{ backgroundImage: `url(${photo})` }}
        />
      )}

      {/* Content */}
      <div className={styles.content}>
        <h1 className={`${styles.title} ${isPlaying ? styles.titleGlow : ''}`}>
          Sleep Tapes
        </h1>
        <p className={`${styles.subtitle} ${styles.stagger2}`}>vol. 1 — mediterranean coast</p>

        {/* Now playing indicator */}
        {currentTrack !== null && (
          <p className={styles.nowPlaying}>
            {TRACKS_INFO[currentTrack].numeral}
          </p>
        )}

        {/* Play button + volume row */}
        <div className={`${styles.playerRow} ${styles.stagger3}`}>
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

          <div className={styles.timeDisplay}>
            {currentTrack !== null && duration > 0 ? (
              <span>{formatTime(currentTime)}</span>
            ) : (
              <span className={styles.timePlaceholder}>35:33</span>
            )}
          </div>
        </div>

        {/* Progress bar — always visible */}
        <div
          className={`${styles.progressWrap} ${styles.stagger4} ${currentTrack !== null ? styles.progressActive : ''}`}
          style={{ '--progress': `${progress * 100}%` } as React.CSSProperties}
          onClick={(e) => {
            if (currentTrack === null) return
            const rect = e.currentTarget.getBoundingClientRect()
            const pct = (e.clientX - rect.left) / rect.width
            seek(pct * duration)
          }}
        >
          <div className={styles.progressBar} style={{ width: `${progress * 100}%` }} />
        </div>

        {/* Track indicators */}
        <div className={`${styles.tracks} ${styles.stagger5}`}>
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

      {/* Note — positioned bottom-left on desktop */}
      <p className={styles.note}>
        five pieces, thirty-five minutes,<br />
        recorded on the coast of the Balearic Sea,<br />
        along the shore from Valencia to silence.<br />
        for the spaces between waking and sleep.
      </p>

      {/* Back */}
      <a href="/" className={styles.backLink} aria-label="Back to Leon Somov">
        <Monogram className={styles.monogram} />
      </a>
    </div>
  )
}
