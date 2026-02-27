import { useRef, useCallback, useEffect, useState } from 'react'
import { Hero } from './components/Hero'
import { FogCanvas } from './components/FogCanvas'
import { PhotoGhost } from './components/PhotoGhost'
import { OverlayMenu } from './components/OverlayMenu'
import { SynthControls } from './components/SynthControls'
import { useCompositionStore } from './composition/useCompositionStore'

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

export function App() {
  const playing = useCompositionStore((s) => s.playing)
  const setXY = useCompositionStore((s) => s.setXY)
  const dotRef = useRef<HTMLDivElement>(null)
  const pointerActiveRef = useRef(false)
  const [dotVisible, setDotVisible] = useState(false)

  const applyXY = useCallback((clientX: number, clientY: number) => {
    const x = clamp(clientX / window.innerWidth, 0, 1)
    const y = clamp(1 - clientY / window.innerHeight, 0, 1)
    setXY(x, y)
  }, [setXY])

  // Fullscreen pointer events for XY control
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!useCompositionStore.getState().playing) return
    pointerActiveRef.current = true
    setDotVisible(true)
    applyXY(e.clientX, e.clientY)
  }, [applyXY])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!useCompositionStore.getState().playing) return
    if (!pointerActiveRef.current) return
    applyXY(e.clientX, e.clientY)
  }, [applyXY])

  const onPointerUp = useCallback(() => {
    pointerActiveRef.current = false
    // On touch devices, hide dot on release. On mouse, keep visible.
    if ('ontouchstart' in window) {
      setDotVisible(false)
    }
  }, [])

  // Show dot on mouse move even without click (desktop)
  useEffect(() => {
    if (!playing) return
    if ('ontouchstart' in window) return // touch-only: dot shows on touch
    const onMove = () => setDotVisible(true)
    window.addEventListener('mousemove', onMove, { once: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [playing])

  // Desktop: track mouse even without click for continuous XY
  useEffect(() => {
    if (!playing) return
    if ('ontouchstart' in window) return
    const onMove = (e: MouseEvent) => {
      applyXY(e.clientX, e.clientY)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [playing, applyXY])

  // Update floating dot position
  useEffect(() => {
    if (!playing) return
    const unsub = useCompositionStore.subscribe((state) => {
      if (dotRef.current) {
        dotRef.current.style.left = `${state.xy.x * 100}%`
        dotRef.current.style.top = `${(1 - state.xy.y) * 100}%`
      }
    })
    return unsub
  }, [playing])

  // Keyboard XY control
  useEffect(() => {
    if (!playing) return
    const onKey = (e: KeyboardEvent) => {
      const s = e.shiftKey ? 0.07 : 0.03
      let { x, y } = useCompositionStore.getState().xy
      if (e.key === 'ArrowLeft') x = clamp(x - s, 0, 1)
      else if (e.key === 'ArrowRight') x = clamp(x + s, 0, 1)
      else if (e.key === 'ArrowDown') y = clamp(y - s, 0, 1)
      else if (e.key === 'ArrowUp') y = clamp(y + s, 0, 1)
      else return
      setXY(x, y)
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playing, setXY])

  return (
    <>
      <FogCanvas />
      {playing && <PhotoGhost />}
      <main
        style={{ touchAction: playing ? 'none' : undefined, cursor: playing ? 'crosshair' : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <Hero />
        {playing && (
          <div
            ref={dotRef}
            style={{
              position: 'fixed',
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(232,228,222,0.9) 0%, rgba(232,228,222,0.45) 30%, rgba(232,228,222,0.1) 60%, transparent 100%)',
              boxShadow: '0 0 16px 6px rgba(232,228,222,0.18)',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 10,
              opacity: dotVisible ? 1 : 0,
              transition: 'opacity 0.3s',
            }}
            aria-hidden="true"
          />
        )}
      </main>
      {playing && <OverlayMenu />}
      <SynthControls />
    </>
  )
}
