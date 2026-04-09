import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Square, Mic, MicOff, Loader2, Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { streamAgent } from "@/lib/api"
import { useVoiceInput } from "@/hooks/use-voice-input"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

interface ChatPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** If set, auto-sends this message when the panel opens. Cleared after send. */
  initialMessage?: string
  onInitialMessageSent?: () => void
  agentId?: string
}

export function ChatPanel({
  open,
  onOpenChange,
  initialMessage,
  onInitialMessageSent,
  agentId = "startup-advisor",
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sentInitialRef = useRef(false)

  // Desktop voice input in chat
  const {
    isRecording,
    isTranscribing,
    toggleRecording,
  } = useVoiceInput({
    onTranscription: (text) => {
      setInput((prev) => {
        const sep = prev.trim() ? " " : ""
        return prev + sep + text
      })
      textareaRef.current?.focus()
    },
    onError: (err) => console.error("Voice input error:", err),
  })

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
    })
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
      }
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setInput("")
      setIsStreaming(true)
      scrollToBottom()

      const controller = new AbortController()
      abortRef.current = controller

      try {
        await streamAgent(agentId, text.trim(), {
          signal: controller.signal,
          onChunk: (chunk) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: m.content + chunk }
                  : m
              )
            )
            scrollToBottom()
          },
        })
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: m.content || `Error: ${(e as Error).message}` }
                : m
            )
          )
        }
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [agentId, isStreaming, scrollToBottom]
  )

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  // Auto-send initial message from voice transcription
  useEffect(() => {
    if (open && initialMessage && !sentInitialRef.current) {
      sentInitialRef.current = true
      sendMessage(initialMessage)
      onInitialMessageSent?.()
    }
    if (!open) {
      sentInitialRef.current = false
    }
  }, [open, initialMessage, sendMessage, onInitialMessageSent])

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    sendMessage(trimmed)
  }, [input, isStreaming, sendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-lg p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Startup OS Assistant
          </SheetTitle>
        </SheetHeader>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
              <Bot className="h-8 w-8 opacity-30" />
              <p>Ask me anything about your startup.</p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {msg.content || (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Thinking...
                  </span>
                )}
              </div>
              {msg.role === "user" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/10">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "Listening..." : "Send a message..."}
              disabled={isRecording}
              rows={1}
              className="min-h-[40px] max-h-[120px] resize-none text-sm"
            />

            <Button
              size="icon"
              variant="ghost"
              onClick={toggleRecording}
              disabled={isStreaming || isTranscribing}
              className={cn(
                "shrink-0",
                isRecording && "text-red-500 hover:text-red-600 animate-pulse",
                isTranscribing && "text-muted-foreground"
              )}
              title={
                isRecording
                  ? "Stop recording"
                  : isTranscribing
                    ? "Transcribing..."
                    : "Voice input"
              }
            >
              {isTranscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>

            {isStreaming ? (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCancel}
                className="shrink-0"
                title="Stop generation"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSubmit}
                disabled={!input.trim()}
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
