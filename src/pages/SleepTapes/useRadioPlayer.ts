import { useState, useRef, useCallback, useEffect } from 'react'

const EPISODES = [
  'https://archive.org/download/OTRR_Dimension_X_Singles/Dimension_X_1950-04-08__01_OuterLimit.mp3',
  'https://archive.org/download/OTRR_Suspense_Singles/Suspense%20420617%20001%20The%20Burning%20Court%20%28128-44%29%2028455%2030m00s.mp3',
  'https://archive.org/download/OTRR_Whistler_Singles/Whistler_42-05-16_ep001_Retribution.mp3',
  'https://archive.org/download/OTRR_X_Minus_One_Singles/XMinusOne55-08-25015ColdEquations.mp3',
  'https://archive.org/download/OTRR_Inner_Sanctum_Mysteries_Singles/Inner%20Sanctum%20%2041-08-03%20The%20Tell-Tale%20Heart.mp3',
  'https://archive.org/download/OTRR_Suspense_Singles/Suspense%20420624%20002%20Wet%20Saturday%20%28128-44%29%2028033%2029m10s.mp3',
]

interface RadioState {
  isOn: boolean
  volume: number
  episode: number
}

export function useRadioPlayer() {
  const [state, setState] = useState<RadioState>({
    isOn: false,
    volume: 0.25,
    episode: Math.floor(Math.random() * EPISODES.length),
  })

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const episodeRef = useRef(state.episode)

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'none'
    audio.volume = 0.25
    audio.crossOrigin = 'anonymous'
    audioRef.current = audio

    audio.onended = () => {
      const next = (episodeRef.current + 1) % EPISODES.length
      episodeRef.current = next
      audio.src = EPISODES[next]
      audio.play().catch(() => {})
      setState((prev) => ({ ...prev, episode: next }))
    }

    audio.onerror = () => {
      // Try next episode on error
      const next = (episodeRef.current + 1) % EPISODES.length
      episodeRef.current = next
      audio.src = EPISODES[next]
      audio.play().catch(() => {})
      setState((prev) => ({ ...prev, episode: next }))
    }

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [])

  const toggleRadio = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (state.isOn) {
      audio.pause()
      setState((prev) => ({ ...prev, isOn: false }))
    } else {
      audio.src = EPISODES[episodeRef.current]
      audio.play().catch(() => {})
      setState((prev) => ({ ...prev, isOn: true }))
    }
  }, [state.isOn])

  const setVolume = useCallback((v: number) => {
    if (audioRef.current) {
      audioRef.current.volume = v
    }
    setState((prev) => ({ ...prev, volume: v }))
  }, [])

  return { ...state, toggleRadio, setVolume }
}
