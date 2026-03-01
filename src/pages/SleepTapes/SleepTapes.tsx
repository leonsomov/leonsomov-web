import { useState, useEffect } from 'react'
import { useAudioPlayer } from './useAudioPlayer'
import { Cassette } from './Cassette'
import { Monogram } from '../../components/Monogram'
import styles from './SleepTapes.module.css'

const PHOTOS = [
  '/photos/silhouette-synths.webp',
  '/photos/modular-cables.webp',
  '/photos/ghost-motion.webp',
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

      // Fade out after 4-6s
      const hideDelay = 4000 + Math.random() * 2000
      setTimeout(() => {
        if (!mounted) return
        setPhotoVisible(false)
      }, hideDelay)
    }

    // First photo after 3s
    const firstTimeout = setTimeout(showPhoto, 3000)

    // Then every 10-18s
    const interval = setInterval(() => {
      showPhoto()
    }, 10000 + Math.random() * 8000)

    return () => {
      mounted = false
      clearTimeout(firstTimeout)
      clearInterval(interval)
    }
  }, [isPlaying])

  const handleClickBody = () => {
    if (loading) return
    if (currentTrack === null) {
      playAll()
    } else {
      toggle()
    }
  }

  const hintText = loading
    ? 'loading...'
    : currentTrack === null
      ? '\u25B6  play'
      : isPlaying
        ? '||  pause'
        : '\u25B6  resume'

  return (
    <div className={styles.page}>
      {photo && (
        <div
          className={`${styles.ghost} ${photoVisible ? styles.ghostVisible : ''}`}
          style={{ backgroundImage: `url(${photo})` }}
        />
      )}

      <Cassette
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onClickBody={handleClickBody}
        onClickTrack={playTrack}
      />

      <div className={styles.controls}>
        <span className={styles.hint} onClick={handleClickBody}>
          {hintText}
        </span>

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

      <p className={styles.note}>
        three pieces recorded on the coast of the Balearic Sea,<br />
        somewhere between Valencia and silence.<br />
        for sleep. for stillness. for letting go.<br />
        <span className={styles.noteQuiet}>this link is just for you.</span>
      </p>

      <a href="/" className={styles.backLink} aria-label="Back to Leon Somov">
        <Monogram className={styles.monogram} />
      </a>
    </div>
  )
}
