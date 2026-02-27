import { useEffect, useRef } from 'react'

const fogBlobs = [
  { cx: 0.3, cy: 0.25, r: 0.45, sx: 0.000105, sy: 0.000085, ox: 0, color: [200, 180, 160], alpha: 0.008 },
  { cx: 0.7, cy: 0.7, r: 0.4, sx: 0.000085, sy: 0.00011, ox: 1200, color: [160, 170, 200], alpha: 0.006 },
  { cx: 0.5, cy: 0.45, r: 0.5, sx: 0.00007, sy: 0.000095, ox: 2500, color: [180, 175, 170], alpha: 0.007 },
]

export function FogCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = Math.min(devicePixelRatio || 1, 2)
    const scale = 0.5

    const mouse = { x: 0, y: 0 }
    const smoothed = { x: 0, y: 0 }

    function resize() {
      canvas!.width = window.innerWidth * dpr * scale
      canvas!.height = window.innerHeight * dpr * scale
    }

    let resizeTimer: ReturnType<typeof setTimeout>
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150) }
    window.addEventListener('resize', onResize)

    const onMouse = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMouse)

    resize()

    let raf: number
    function draw(t: number) {
      const w = canvas!.width
      const h = canvas!.height
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'

      smoothed.x += (mouse.x - smoothed.x) * 0.03
      smoothed.y += (mouse.y - smoothed.y) * 0.03

      for (const b of fogBlobs) {
        const driftX = 0.12 * Math.sin((t + b.ox) * b.sx)
        const driftY = 0.12 * Math.cos((t + b.ox) * b.sy)
        const x = (b.cx + driftX + smoothed.x * 0.012) * w
        const y = (b.cy + driftY + smoothed.y * 0.012) * h
        const r = b.r * Math.min(w, h)
        const alpha = b.alpha

        const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
        grad.addColorStop(0, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},${alpha})`)
        grad.addColorStop(0.5, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},${alpha * 0.4})`)
        grad.addColorStop(1, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      raf = requestAnimationFrame(draw)
    } else {
      draw(0)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouse)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
