import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Square, Mic, MicOff, Loader2, Bot, User } from "lucide-react"
import { cn, Button, Textarea, Sheet, SheetContent, SheetHeader, SheetTitle } from "@startupos/ui"
import { streamAgent } from "@/lib/api"
import { useVoiceInput } from "@/hooks/use-voice-input"
import { ImpactPreview, type ImpactPreviewData } from "@/components/chat/ImpactPreview"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

function parseMessageContent(content: string): Array<{ type: "text"; text: string } | { type: "impact_preview"; data: ImpactPreviewData }> {
  const parts: Array<{ type: "text"; text: string } | { type: "impact_preview"; data: ImpactPreviewData }> = []
  const regex = /```impact_preview\n([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", text: content.slice(lastIndex, match.index) })
    }
    try {
      const data = JSON.parse(match[1].trim()) as ImpactPreviewData
      if (data.type === "impact_preview") {
        parts.push({ type: "impact_preview", data })
      } else {
        parts.push({ type: "text", text: match[0] })
      }
    } catch {
      // JSON not complete yet (still streaming), show nothing for this block
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    // Strip incomplete impact_preview block from trailing text while streaming
    const trailing = content.slice(lastIndex)
    const incompleteIdx = trailing.indexOf("```impact_preview")
    if (incompleteIdx >= 0) {
      const before = trailing.slice(0, incompleteIdx)
      if (before.trim()) parts.push({ type: "text", text: before })
    } else {
      parts.push({ type: "text", text: trailing })
    }
  }

  return parts.length > 0 ? parts : [{ type: "text", text: content }]
}

function MessageContent({ content }: { content: string }) {
  const parts = parseMessageContent(content)
  return (
    <>
      {parts.map((part, i) =>
        part.type === "impact_preview" ? (
          <ImpactPreview key={i} data={part.data} />
        ) : (
          <span key={i} className="whitespace-pre-wrap">{part.text}</span>
        )
      )}
    </>
  )
}

interface ChatPanelProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** If set, auto-sends this message when the panel opens. Cleared after send. */
  initialMessage?: string
  onInitialMessageSent?: () => void
  agentId?: string
  /** "sheet" = sidebar overlay (default), "inline" = full-screen embedded */
  variant?: "sheet" | "inline"
}

export function ChatPanel({
  open = true,
  onOpenChange,
  initialMessage,
  onInitialMessageSent,
  agentId = "startup-advisor",
  variant = "sheet",
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

  const chatContent = (
    <div className={cn(
      "flex flex-col",
      variant === "inline" ? "h-full" : "h-full"
    )}>
      {variant === "inline" ? null : (
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Startup OS Assistant
          </SheetTitle>
        </SheetHeader>
      )}

      {/* Messages */}
      <div ref={scrollRef} className={cn(
        "flex-1 overflow-y-auto py-3 space-y-4",
        variant === "inline" ? "px-0" : "px-4"
      )}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
            <Bot className="h-8 w-8 opacity-30" />
            <p>{variant === "inline"
              ? "Ask a what-if question to explore financial scenarios."
              : "Ask me anything about your startup."
            }</p>
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
                "rounded-lg px-3 py-2 text-sm",
                variant === "inline" ? "max-w-[90%]" : "max-w-[80%]",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                  : "bg-muted"
              )}
            >
              {msg.content ? (
                msg.role === "assistant" ? (
                  <MessageContent content={msg.content} />
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )
              ) : (
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
      <div className={cn(
        "border-t p-3",
        variant === "inline" && "px-0"
      )}>
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "Listening..." : variant === "inline" ? "What if we..." : "Send a message..."}
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
    </div>
  )

  if (variant === "inline") {
    return chatContent
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-lg p-0">
        {chatContent}
      </SheetContent>
    </Sheet>
  )
}
