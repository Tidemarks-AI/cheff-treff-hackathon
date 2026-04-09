import { ArrowRight, Bot, Mic, Zap } from "lucide-react"
import { Button } from "@startupos/ui"

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-6">
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
