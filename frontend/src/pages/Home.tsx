import { ArrowRight, Bot, Mic, Zap } from "lucide-react"
import { Button, NetworkBackground } from "@startupos/ui"

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-6 text-center">
        {/* Background gradient + network */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50/80 to-white" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.15),transparent)]" />
          <NetworkBackground
            nodeCount={35}
            connectionDistance={28}
            className="absolute inset-0 opacity-40"
          />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-4 py-1.5 text-sm text-gray-600 shadow-sm backdrop-blur-sm">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            AI-powered startup operations
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-gray-950 sm:text-6xl md:text-7xl">
            Your operating system
            <br />
            <span className="bg-gradient-to-r from-gray-950 via-gray-700 to-gray-500 bg-clip-text text-transparent">
              for startups.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500 sm:text-xl">
            A collection of AI agents that handle your startup operations.
            <br className="hidden sm:block" />
            Fast, autonomous, and reliable.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="gap-2 rounded-full px-8 text-base">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2 rounded-full px-8 text-base"
            >
              <Mic className="h-4 w-4" />
              Talk to an Agent
            </Button>
          </div>

          <p className="mt-4 text-xs text-gray-400">
            Press <kbd className="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 font-mono text-[10px]">Space</kbd> anywhere to speak
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors group-hover:bg-gray-950 group-hover:text-white">
                {f.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-950">{f.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{f.description}</p>
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
