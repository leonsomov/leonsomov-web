import { useState, useRef, useCallback, useEffect } from 'react'

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

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const modeRef = useRef<Mode>('all')
  const currentRef = useRef<number>(0)

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'auto'
    audio.volume = 0.8
    audioRef.current = audio

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [])

  const startTrack = useCallback((index: number, mode: Mode) => {
    const audio = audioRef.current
    if (!audio) return

    modeRef.current = mode
    currentRef.current = index

    audio.pause()
    audio.src = TRACKS[index]
    audio.loop = mode === 'single'

    // Handle track end in 'all' mode — advance to next
    audio.onended = () => {
      if (modeRef.current !== 'all') return
      const next = (currentRef.current + 1) % TRACKS.length
      startTrack(next, 'all')
      setState((prev) => ({ ...prev, currentTrack: next }))
    }

    const playPromise = audio.play()
    if (playPromise) {
      playPromise.catch(() => {})
    }

    setState((prev) => ({
      ...prev,
      currentTrack: index,
      isPlaying: true,
      mode,
      loading: false,
    }))

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Sleep Tape ${['I', 'II', 'III'][index]}`,
        artist: 'Leon Somov',
        album: 'Sleep Tapes',
      })
      navigator.mediaSession.playbackState = 'playing'
    }
  }, [])

  const playTrack = useCallback(
    (index: number) => {
      setState((prev) => ({ ...prev, loading: true }))
      startTrack(index, 'single')
    },
    [startTrack]
  )

  const playAll = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true }))
    startTrack(0, 'all')
  }, [startTrack])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio || state.currentTrack === null) return

    if (state.isPlaying) {
      audio.pause()
      setState((prev) => ({ ...prev, isPlaying: false }))
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused'
      }
    } else {
      audio.play().catch(() => {})
      setState((prev) => ({ ...prev, isPlaying: true }))
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing'
      }
    }
  }, [state.currentTrack, state.isPlaying])

  const setVolume = useCallback((v: number) => {
    if (audioRef.current) {
      audioRef.current.volume = v
    }
    setState((prev) => ({ ...prev, volume: v }))
  }, [])

  return { ...state, playTrack, playAll, toggle, setVolume }
}
