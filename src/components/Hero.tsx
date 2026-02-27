import { useRef, useCallback, useState } from 'react'
import { Monogram } from './Monogram'
import { useCompositionStore } from '../composition/useCompositionStore'
import styles from './Hero.module.css'

export function Hero() {
  const { playing, error, init, start, stop } = useCompositionStore()
  const breatheRef = useRef<HTMLButtonElement>(null)
  const [loading, setLoading] = useState(false)

  const handleBreathe = useCallback(async () => {
    if (loading) return
    if (!playing) {
      setLoading(true)
      await init()
      const state = useCompositionStore.getState()
      if (state.audioReady && !state.error) {
        start()
      }
      setLoading(false)
    } else {
      stop()
    }
  }, [playing, loading, init, start, stop])

  const label = loading
    ? 'initializing...'
    : error
      ? '> tap to retry'
      : playing
        ? 'exhale'
        : '> press to begin'

  return (
    <section className={styles.hero} aria-label="Hero">
      <div className={styles.monogramWrap}>
        <h1 className={styles.monogram} aria-label="L-S monogram">
          <span className="sr-only">Leon Somov</span>
          <Monogram className={styles.monogramSvg} />
        </h1>
      </div>

      <button
        ref={breatheRef}
        className={`${styles.breatheBtn} ${playing ? styles.active : ''} ${error ? styles.error : ''}`}
        onClick={handleBreathe}
        aria-label={playing ? 'Stop ambient audio' : 'Start ambient audio'}
        disabled={loading}
      >
        {label}
        {!playing && !loading && <span className="cursor-blink" />}
      </button>
      {error && (
        <p className={styles.errorMsg}>{error}</p>
      )}
    </section>
  )
}
