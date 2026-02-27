import { useRef, useEffect, useCallback, useState } from 'react'
import { useCompositionStore } from '../composition/useCompositionStore'

// SVG path data for L, dash, and S
const L_PATH = 'M0 0 L12 0 L12 68 L50 68 L50 80 L0 80 Z'
const DASH_PATH = 'M72 34 L108 34 L108 46 L72 46 Z'
const S_PATH = 'M200 0 L147 0 C137.61 0 130 7.61 130 17 L130 29 C130 38.39 137.61 46 147 46 L183 46 C192.39 46 200 53.61 200 63 C200 72.39 192.39 80 183 80 L130 80 L130 68 L183 68 C185.76 68 188 65.76 188 63 C188 60.24 185.76 58 183 58 L183 34 L147 34 C144.24 34 142 31.76 142 29 L142 17 C142 14.24 144.24 12 147 12 L200 12 Z'

interface Particle {
  homeX: number
  homeY: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
}

function samplePathPoints(pathData: string, count: number): { x: number; y: number }[] {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 200 80')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', pathData)
  svg.appendChild(path)
  document.body.appendChild(svg)

  const points: { x: number; y: number }[] = []
  const len = path.getTotalLength()
  for (let i = 0; i < count; i++) {
    const pt = path.getPointAtLength((i / count) * len)
    points.push({ x: pt.x, y: pt.y })
  }

  document.body.removeChild(svg)
  return points
}

export function Monogram({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const phaseRef = useRef<'idle' | 'scatter' | 'reform'>('idle')
  const phaseTimeRef = useRef(0)
  const rafRef = useRef<number>(0)
  const playing = useCompositionStore((s) => s.playing)
  const [scattered, setScattered] = useState(false)

  // Sample particles from paths
  const initParticles = useCallback(() => {
    const lPts = samplePathPoints(L_PATH, 35)
    const dPts = samplePathPoints(DASH_PATH, 15)
    const sPts = samplePathPoints(S_PATH, 50)
    const all = [...lPts, ...dPts, ...sPts]

    particlesRef.current = all.map(pt => ({
      homeX: pt.x,
      homeY: pt.y,
      x: pt.x,
      y: pt.y,
      vx: 0,
      vy: 0,
      size: 1.5 + Math.random() * 1.5,
      alpha: 1,
    }))
  }, [])

  // Trigger scatter when playing starts
  useEffect(() => {
    if (!playing) {
      phaseRef.current = 'idle'
      setScattered(false)
      return
    }

    // Initialize particles and start scatter
    initParticles()
    phaseRef.current = 'scatter'
    phaseTimeRef.current = 0
    setScattered(true)

    // After 3.5s, start reforming
    const reformTimer = setTimeout(() => {
      phaseRef.current = 'reform'
      phaseTimeRef.current = 0
    }, 3500)

    // After 6s, done — hide canvas, show SVG
    const doneTimer = setTimeout(() => {
      phaseRef.current = 'idle'
      setScattered(false)
    }, 6000)

    return () => {
      clearTimeout(reformTimer)
      clearTimeout(doneTimer)
    }
  }, [playing, initParticles])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !scattered) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Get the SVG element size for coordinate mapping
    const svgEl = svgRef.current
    if (!svgEl) return

    function animate() {
      const rect = svgEl!.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas!.width = rect.width * dpr
      canvas!.height = rect.height * dpr
      canvas!.style.width = `${rect.width}px`
      canvas!.style.height = `${rect.height}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      const scaleX = rect.width / 200
      const scaleY = rect.height / 80
      const phase = phaseRef.current
      const particles = particlesRef.current

      ctx!.clearRect(0, 0, rect.width, rect.height)

      if (phase === 'idle') {
        rafRef.current = requestAnimationFrame(animate)
        return
      }

      phaseTimeRef.current += 0.016

      for (const p of particles) {
        if (phase === 'scatter') {
          // Apply gentle outward velocity
          if (phaseTimeRef.current < 0.05) {
            const angle = Math.atan2(p.homeY - 40, p.homeX - 100) + (Math.random() - 0.5) * 1.5
            p.vx = Math.cos(angle) * (15 + Math.random() * 25)
            p.vy = Math.sin(angle) * (15 + Math.random() * 25)
          }
          p.x += p.vx * 0.016
          p.y += p.vy * 0.016
          p.vy += 3 * 0.016 // slight gravity
          p.vx *= 0.995 // friction
          p.vy *= 0.995
          // Random walk
          p.x += (Math.random() - 0.5) * 0.3
          p.y += (Math.random() - 0.5) * 0.3
          p.alpha = Math.max(0.15, 1 - phaseTimeRef.current * 0.2)
        } else if (phase === 'reform') {
          // Attract back to home
          const dx = p.homeX - p.x
          const dy = p.homeY - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const strength = 0.03 + phaseTimeRef.current * 0.02
          p.vx += dx * strength
          p.vy += dy * strength
          p.vx *= 0.92
          p.vy *= 0.92
          p.x += p.vx * 0.016
          p.y += p.vy * 0.016
          p.alpha = Math.min(1, 0.3 + phaseTimeRef.current * 0.3)
          // Snap when very close
          if (dist < 0.5) {
            p.x = p.homeX
            p.y = p.homeY
            p.vx = 0
            p.vy = 0
          }
        }

        // Draw particle
        const sx = p.x * scaleX
        const sy = p.y * scaleY
        ctx!.globalAlpha = p.alpha * 0.9
        ctx!.fillStyle = '#e8e4de'
        ctx!.beginPath()
        ctx!.arc(sx, sy, p.size * scaleX * 0.5, 0, Math.PI * 2)
        ctx!.fill()
      }

      ctx!.globalAlpha = 1
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [scattered])

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg
        ref={svgRef}
        className={className}
        viewBox="0 0 200 80"
        aria-hidden="true"
        focusable="false"
        style={{ opacity: scattered ? 0 : 1, transition: 'opacity 0.3s' }}
      >
        <path d={L_PATH} fill="currentColor" />
        <path d={DASH_PATH} fill="currentColor" />
        <path d={S_PATH} fill="currentColor" />
      </svg>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          opacity: scattered ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
        aria-hidden="true"
      />
    </div>
  )
}
