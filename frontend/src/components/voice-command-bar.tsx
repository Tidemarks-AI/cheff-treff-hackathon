import { useEffect, useRef, useCallback, useState } from "react"
import { Mic, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useVoiceInput } from "@/hooks/use-voice-input"

const BAR_COUNT = 24
const BAR_GAP = 2
const BAR_WIDTH = 2
const BAR_MIN_HEIGHT = 2
const BAR_MAX_HEIGHT = 20

interface VoiceCommandBarProps {
  onTranscription: (text: string) => void
  onError?: (error: Error) => void
  className?: string
}

export function VoiceCommandBar({
  onTranscription,
  onError,
  className,
}: VoiceCommandBarProps) {
  const { isRecording, isTranscribing, startRecording, stopRecording, analyser } =
    useVoiceInput({ onTranscription, onError })

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameRef = useRef<number>(0)
  const [held, setHeld] = useState(false)
  const [locked, setLocked] = useState(false)
  const lastSpaceTapRef = useRef(0)

  // Frequency bars visualization
  useEffect(() => {
    if (!isRecording || !analyser || !canvasRef.current) {
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext("2d")
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")!
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const centerY = canvas.height / 2
      const totalWidth = BAR_COUNT * (BAR_WIDTH + BAR_GAP) - BAR_GAP
      const startX = (canvas.width - totalWidth) / 2

      for (let i = 0; i < BAR_COUNT; i++) {
        const binIndex = Math.floor((i / BAR_COUNT) * bufferLength)
        const value = dataArray[binIndex] / 255
        const barHeight = BAR_MIN_HEIGHT + value * (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT)

        const x = startX + i * (BAR_WIDTH + BAR_GAP)
        const y = centerY - barHeight / 2

        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + value * 0.7})`
        ctx.beginPath()
        ctx.roundRect(x, y, BAR_WIDTH, barHeight, 1)
        ctx.fill()
      }
    }

    draw()
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [isRecording, analyser])

  // Spacebar: hold-to-record OR double-tap to lock
  useEffect(() => {
    const DOUBLE_TAP_MS = 300

    const isInput = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable
      )
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return

      if (e.code === "Escape" && locked) {
        e.preventDefault()
        setLocked(false)
        setHeld(false)
        stopRecording()
        return
      }

      if (e.code !== "Space" || isInput(e)) return
      e.preventDefault()

      if (locked) {
        setLocked(false)
        setHeld(false)
        stopRecording()
        return
      }

      const now = Date.now()
      const gap = now - lastSpaceTapRef.current
      lastSpaceTapRef.current = now

      if (gap < DOUBLE_TAP_MS && isRecording) {
        setLocked(true)
      } else if (!isRecording) {
        setHeld(true)
        startRecording()
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isInput(e)) return
      e.preventDefault()
      if (!locked && held) {
        setHeld(false)
        stopRecording()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [startRecording, stopRecording, isRecording, locked, held])

  const handleClick = useCallback(() => {
    if (isRecording) {
      setLocked(false)
      setHeld(false)
      stopRecording()
    } else {
      setLocked(true)
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        onClick={handleClick}
        className="relative flex items-center justify-center h-8 w-8 rounded-full transition-colors cursor-pointer"
        title="Click to record, or hold Space"
      >
        <span
          className={cn(
            "absolute inset-0 rounded-full transition-all duration-300",
            isRecording
              ? "animate-[breathe_1.2s_ease-in-out_infinite] bg-red-500/30 ring-2 ring-red-500/60"
              : isTranscribing
                ? "animate-spin border-2 border-transparent border-t-primary/60 rounded-full"
                : "ring-1 ring-muted-foreground/20 hover:ring-muted-foreground/40"
          )}
        />

        {isTranscribing ? (
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
        ) : (
          <Mic
            className={cn(
              "h-4 w-4 transition-colors relative z-10",
              isRecording
                ? "text-red-400"
                : "text-muted-foreground hover:text-foreground"
            )}
          />
        )}
      </button>

      <canvas
        ref={canvasRef}
        width={BAR_COUNT * (BAR_WIDTH + BAR_GAP)}
        height={BAR_MAX_HEIGHT + 4}
        className={cn(
          "transition-all duration-300",
          isRecording ? "opacity-100 w-auto" : "opacity-0 w-0"
        )}
        style={{ height: BAR_MAX_HEIGHT + 4 }}
      />

      {isRecording && locked && (
        <span className="text-[10px] text-red-400 hidden lg:inline">
          recording — tap space or esc to stop
        </span>
      )}
      {!isRecording && !isTranscribing && (
        <span className="text-[10px] text-muted-foreground/40 hidden lg:inline">
          space
        </span>
      )}

      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.25); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
