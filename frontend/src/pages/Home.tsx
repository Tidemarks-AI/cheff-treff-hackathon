import { useEffect, useRef } from "react"
import { ArrowRight, Bot, Mic, Zap } from "lucide-react"
import { Button } from "@startupos/ui"

/** Animated diagonal light beams — light-mode take on Raycast's hero canvas */
function LightBeams({ className }: { className?: string }) {
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

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-6">
        {/* Animated background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-muted via-background to-background" />
          <LightBeams className="absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/80" />
        </div>

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-4 py-1.5 text-sm text-muted-foreground shadow-sm backdrop-blur-md">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            AI-powered startup operations
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl md:text-7xl">
            Your operating system
            <br />
            <span className="bg-gradient-to-r from-foreground via-muted-foreground to-muted-foreground/50 bg-clip-text text-transparent">
              for startups.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            A collection of AI agents that handle your startup operations.
            <br className="hidden sm:block" />
            Fast, autonomous, and reliable.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" className="gap-2 rounded-full px-8 text-base">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2 rounded-full border-border bg-background/60 px-8 text-base text-foreground backdrop-blur-sm"
            >
              <Mic className="h-4 w-4" />
              Talk to an Agent
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground/70">
            Press{" "}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              Space
            </kbd>{" "}
            anywhere to speak
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                {f.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

const features = [
  {
    title: "AI Agents",
    description:
      "Autonomous agents that handle finance, ops, and customer communications around the clock.",
    icon: <Bot className="h-5 w-5" />,
  },
  {
    title: "Voice Control",
    description:
      "Talk to your agents naturally. Hold space to speak, and they'll take action instantly.",
    icon: <Mic className="h-5 w-5" />,
  },
  {
    title: "Instant Actions",
    description:
      "From invoicing to email replies — agents execute tasks in seconds, not hours.",
    icon: <Zap className="h-5 w-5" />,
  },
]
