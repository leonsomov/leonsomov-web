import { useState, useRef, useCallback, useEffect } from 'react'

const EPISODES = [
  'https://archive.org/download/ird059/tcp_d1_01_the_swedish_rhapsody_irdial.mp3',
  'https://archive.org/download/ird059/tcp_d1_04_phonetic_alphabet_nato_irdial.mp3',
  'https://archive.org/download/ird059/tcp_d1_06_the_lincolnshire_poacher_mi5_irdial.mp3',
  'https://archive.org/download/ird059/tcp_d1_09_ready_ready_15728_irdial.mp3',
  'https://archive.org/download/ird059/tcp_d2_01_magnetic_fields_irdial.mp3',
  'https://archive.org/download/ird059/tcp_d2_05_the_buzzer_irdial.mp3',
  'https://archive.org/download/ird059/tcp_d3_01_yosemite_sam_irdial.mp3',
  'https://archive.org/download/ird059/tcp_d3_08_nancy_adam_susan_irdial.mp3',
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
    audioRef.current = audio

    audio.onended = () => {
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
