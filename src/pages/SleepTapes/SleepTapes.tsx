import { useAudioPlayer } from './useAudioPlayer'
import { Cassette } from './Cassette'
import styles from './SleepTapes.module.css'

export function SleepTapes() {
  const { currentTrack, isPlaying, volume, playTrack, playAll, toggle, setVolume } =
    useAudioPlayer()

  const handleClickBody = () => {
    if (currentTrack === null) {
      playAll()
    } else {
      toggle()
    }
  }

  return (
    <div className={styles.page}>
      <Cassette
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onClickBody={handleClickBody}
        onClickTrack={playTrack}
      />

      <div className={styles.controls}>
        <span className={styles.hint} onClick={handleClickBody}>
          {currentTrack === null
            ? '\u25B6  play'
            : isPlaying
              ? '||  pause'
              : '\u25B6  resume'}
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

      <p className={styles.tagline}>
        close your eyes. let it carry you.
      </p>

      <a href="/" className={styles.backLink}>&larr; leonsomov.com</a>
    </div>
  )
}
