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
}

export function useAudioPlayer() {
  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    isPlaying: false,
    mode: 'all',
    volume: 0.8,
  })

  const playersRef = useRef<Tone.Player[]>([])

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
      }))
    },
    [stopAll]
  )

  const playTrack = useCallback(
    async (index: number) => {
      await Tone.start()
      startTrack(index, 'single')
    },
    [startTrack]
  )

  const playAll = useCallback(async () => {
    await Tone.start()
    startTrack(0, 'all')
  }, [startTrack])

  const toggle = useCallback(() => {
    const { currentTrack, isPlaying } = state
    if (currentTrack === null) return

    const player = playersRef.current[currentTrack]
    if (!player) return

    if (isPlaying) {
      player.stop()
      player.onstop = () => {}
      setState((prev) => ({ ...prev, isPlaying: false }))
    } else {
      Tone.start().then(() => {
        startTrack(currentTrack, state.mode)
      })
    }
  }, [state, startTrack])

  const setVolume = useCallback((v: number) => {
    const db = v <= 0 ? -Infinity : 20 * Math.log10(v)
    Tone.getDestination().volume.value = db
    setState((prev) => ({ ...prev, volume: v }))
  }, [])

  return { ...state, playTrack, playAll, toggle, setVolume }
}
