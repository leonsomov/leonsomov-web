import { useEffect, useRef, useState } from 'react'
import { useCompositionStore } from '../composition/useCompositionStore'

// Bowl strikes -> texture/gear photos. Chord changes -> portrait/performance/long-exposure
const BOWL_PHOTOS = [
  '/photos/texture-1.webp',
  '/photos/texture-2.webp',
  '/photos/texture-gear.webp',
  '/photos/gear-detail.webp',
]

const CHORD_PHOTOS = [
  '/photos/portrait.webp',
  '/photos/performance-1.webp',
  '/photos/long-exposure-1.webp',
]

// Preload all photos
const allPhotos = [...BOWL_PHOTOS, ...CHORD_PHOTOS]
if (typeof window !== 'undefined') {
  allPhotos.forEach(src => {
    const img = new Image()
    img.src = src
  })
}

export function PhotoGhost() {
  const [visible, setVisible] = useState(false)
  const [currentPhoto, setCurrentPhoto] = useState('')
  const activeRef = useRef(false)
  const bowlIndexRef = useRef(0)
  const chordIndexRef = useRef(0)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const unsub = useCompositionStore.subscribe((state, prev) => {
      if (!state.lastMusicalEvent || state.lastMusicalEvent === prev.lastMusicalEvent) return
      if (activeRef.current) return // don't overlap

      const event = state.lastMusicalEvent
      let photo = ''

      if (event.type === 'bowlStrike') {
        photo = BOWL_PHOTOS[bowlIndexRef.current % BOWL_PHOTOS.length]
        bowlIndexRef.current++
      } else if (event.type === 'chordChange') {
        photo = CHORD_PHOTOS[chordIndexRef.current % CHORD_PHOTOS.length]
        chordIndexRef.current++
      } else if (event.type === 'noteOn') {
        // Only some melody notes trigger photos (1 in 3 chance)
        if (Math.random() > 0.33) return
        const allPhotos = [...BOWL_PHOTOS, ...CHORD_PHOTOS]
        photo = allPhotos[Math.floor(Math.random() * allPhotos.length)]
      } else {
        return
      }

      activeRef.current = true
      setCurrentPhoto(photo)
      setVisible(true)

      // Hold then fade out
      fadeTimerRef.current = setTimeout(() => {
        setVisible(false)
        // Allow new photo after fade completes
        setTimeout(() => {
          activeRef.current = false
        }, 2500)
      }, 1500)
    })

    return () => {
      unsub()
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [])

  if (!currentPhoto) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        opacity: visible ? 0.12 : 0,
        transition: visible ? 'opacity 0.8s ease-in' : 'opacity 2.5s ease-out',
        mixBlendMode: 'screen',
      }}
    >
      <img
        src={currentPhoto}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'grayscale(1)',
        }}
      />
    </div>
  )
}
