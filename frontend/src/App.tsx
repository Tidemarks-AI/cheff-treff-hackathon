import { useState, useCallback } from "react"
import { Link, Outlet } from "@tanstack/react-router"
import { Settings } from "lucide-react"

import { VoiceCommandBar } from "@/components/voice-command-bar"
import { ChatPanel } from "@/components/chat-panel"

export default function App() {
  const [chatOpen, setChatOpen] = useState(false)
  const [pendingMessage, setPendingMessage] = useState<string | undefined>()

  const handleVoiceTranscription = useCallback((text: string) => {
    setPendingMessage(text)
    setChatOpen(true)
  }, [])

  const handleInitialMessageSent = useCallback(() => {
    setPendingMessage(undefined)
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center border-b border-border bg-background/80 px-6 backdrop-blur-xl">
        <Link to="/" className="text-lg font-bold tracking-tight text-foreground hover:opacity-80">
          StartupOS
        </Link>
        <nav className="ml-8 flex items-center gap-6">
          <Link to="/changes" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Changes</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <VoiceCommandBar
            onTranscription={handleVoiceTranscription}
            onError={(err) => console.error("Voice error:", err)}
          />
          <Link to="/admin" className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="Admin">
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </header>
      <div className="flex-1">
        <Outlet />
      </div>

      <ChatPanel
        open={chatOpen}
        onOpenChange={setChatOpen}
        initialMessage={pendingMessage}
        onInitialMessageSent={handleInitialMessageSent}
      />
    </div>
  )
}
