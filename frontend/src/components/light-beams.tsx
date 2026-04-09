import { useEffect, useRef } from "react"

export function LightBeams({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")!
    let raf = 0

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener("resize", resize)

    const beams = [
      { x: 0.08, speed: 0.25, width: 170, hue: 220, sat: 30, light: 75, opacity: 0.30 },
      { x: 0.22, speed: 0.18, width: 130, hue: 215, sat: 40, light: 70, opacity: 0.25 },
      { x: 0.38, speed: 0.32, width: 190, hue: 225, sat: 25, light: 80, opacity: 0.28 },
      { x: 0.52, speed: 0.22, width: 150, hue: 210, sat: 35, light: 72, opacity: 0.22 },
      { x: 0.65, speed: 0.28, width: 160, hue: 230, sat: 20, light: 78, opacity: 0.26 },
      { x: 0.80, speed: 0.20, width: 120, hue: 218, sat: 30, light: 68, opacity: 0.20 },
      { x: 0.92, speed: 0.30, width: 140, hue: 222, sat: 22, light: 82, opacity: 0.24 },
      { x: 0.45, speed: 0.15, width: 220, hue: 215, sat: 15, light: 85, opacity: 0.18 },
    ]

    const draw = (t: number) => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)

      for (const beam of beams) {
        const offset = Math.sin(t * 0.001 * beam.speed) * 60
        const cx = beam.x * w + offset

        ctx.save()
        ctx.translate(cx, h / 2)
        ctx.rotate(-35 * (Math.PI / 180))

        const grad = ctx.createLinearGradient(-beam.width / 2, 0, beam.width / 2, 0)
        const c = `hsla(${beam.hue}, ${beam.sat}%, ${beam.light}%, `
        grad.addColorStop(0, c + "0)")
        grad.addColorStop(0.3, c + `${beam.opacity})`)
        grad.addColorStop(0.5, c + `${beam.opacity * 1.4})`)
        grad.addColorStop(0.7, c + `${beam.opacity})`)
        grad.addColorStop(1, c + "0)")

        ctx.fillStyle = grad
        ctx.fillRect(-beam.width / 2, -h * 1.2, beam.width, h * 2.4)
        ctx.restore()
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  )
}
