import { useState, useRef, useCallback, useEffect } from 'react'
import * as Tone from 'tone'

const TRACKS = [
  '/audio/sleep-tapes/01.mp3',
  '/audio/sleep-tapes/02.mp3',
  '/audio/sleep-tapes/03.mp3',
]

type Mode = 'single' | 'all'

interface PlayerState {
  currentTrack: number | null
  isPlaying: boolean
  mode: Mode
  volume: number
  loading: boolean
}

export function useAudioPlayer() {
  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    isPlaying: false,
    mode: 'all',
    volume: 0.8,
    loading: false,
  })

  const playersRef = useRef<Tone.Player[]>([])
  const audioElRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const players = TRACKS.map((url) => {
      const player = new Tone.Player(url).toDestination()
      player.loop = false
      return player
    })
    playersRef.current = players

    return () => {
      players.forEach((p) => p.dispose())
    }
  }, [])

  const stopAll = useCallback(() => {
    playersRef.current.forEach((p) => {
      if (p.state === 'started') p.stop()
    })
  }, [])

  const startTrack = useCallback(
    (index: number, mode: Mode) => {
      stopAll()
      const player = playersRef.current[index]
      if (!player || !player.loaded) return

      if (mode === 'single') {
        player.loop = true
        player.onstop = () => {}
      } else {
        player.loop = false
        player.onstop = () => {
          setState((prev) => {
            if (!prev.isPlaying || prev.mode !== 'all') return prev
            const next = (index + 1) % TRACKS.length
            setTimeout(() => startTrack(next, 'all'), 0)
            return { ...prev, currentTrack: next }
          })
        }
      }

      player.start()
      setState((prev) => ({
        ...prev,
        currentTrack: index,
        isPlaying: true,
        mode,
        loading: false,
      }))

      // Media Session API — keeps audio alive on lock screen
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `Sleep Tape ${['I', 'II', 'III'][index]}`,
          artist: 'Leon Somov',
          album: 'Sleep Tapes',
        })
        navigator.mediaSession.playbackState = 'playing'
      }
    },
    [stopAll]
  )

  const ensureAudioRoute = useCallback(async () => {
    await Tone.start()
    await Tone.loaded()

    // Set up media route once (for iOS silent mode + background)
    if (!audioElRef.current) {
      try {
        const ctx = Tone.getContext().rawContext as AudioContext
        const dest = ctx.createMediaStreamDestination()
        const gain = Tone.getContext().createGain()
        gain.connect(dest)
        Tone.getDestination().connect(gain)

        const audio = document.createElement('audio')
        audio.srcObject = dest.stream
        await audio.play()
        audioElRef.current = audio
      } catch {
        // Fallback: direct Web Audio still works on desktop
      }
    }
  }, [])

  const playTrack = useCallback(
    async (index: number) => {
      setState((prev) => ({ ...prev, loading: true }))
      await ensureAudioRoute()
      startTrack(index, 'single')
    },
    [startTrack, ensureAudioRoute]
  )

  const playAll = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }))
    await ensureAudioRoute()
    startTrack(0, 'all')
  }, [startTrack, ensureAudioRoute])

  const toggle = useCallback(() => {
    const { currentTrack, isPlaying } = state
    if (currentTrack === null) return

    const player = playersRef.current[currentTrack]
    if (!player) return

    if (isPlaying) {
      player.stop()
      player.onstop = () => {}
      setState((prev) => ({ ...prev, isPlaying: false }))
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused'
      }
    } else {
      ensureAudioRoute().then(() => {
        startTrack(currentTrack, state.mode)
      })
    }
  }, [state, startTrack, ensureAudioRoute])

  const setVolume = useCallback((v: number) => {
    const db = v <= 0 ? -Infinity : 20 * Math.log10(v)
    Tone.getDestination().volume.value = db
    setState((prev) => ({ ...prev, volume: v }))
  }, [])

  return { ...state, playTrack, playAll, toggle, setVolume }
}
