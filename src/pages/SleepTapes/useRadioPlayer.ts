import { useState, useRef, useCallback, useEffect } from 'react'

const STREAM_URL = 'https://s8.yesstreaming.net:17011/stream'

interface RadioState {
  isOn: boolean
  volume: number
}

export function useRadioPlayer() {
  const [state, setState] = useState<RadioState>({
    isOn: false,
    volume: 0.25,
  })

  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'none'
    audio.volume = 0.25
    audioRef.current = audio

    audio.onerror = () => {
      // Silent fail — radio just doesn't play
      setState((prev) => ({ ...prev, isOn: false }))
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
      audio.src = ''
      setState((prev) => ({ ...prev, isOn: false }))
    } else {
      audio.src = STREAM_URL
      audio.play().catch(() => {
        setState((prev) => ({ ...prev, isOn: false }))
      })
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
