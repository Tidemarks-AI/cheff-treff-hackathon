import { useState, useCallback } from "react"
import { Link, Outlet } from "@tanstack/react-router"

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
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center border-b border-gray-200/60 bg-white/80 px-6 backdrop-blur-xl">
        <Link to="/" className="text-lg font-bold tracking-tight text-gray-950 hover:opacity-80">
          StartupOS
        </Link>
        <nav className="ml-8 flex items-center gap-6">
          <Link to="/finance" className="text-sm text-gray-500 transition-colors hover:text-gray-950">Finance</Link>
          <Link to="/changes" className="text-sm text-gray-500 transition-colors hover:text-gray-950">Changes</Link>
          <Link to="/admin" className="text-sm text-gray-500 transition-colors hover:text-gray-950">Agents</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <VoiceCommandBar
            onTranscription={handleVoiceTranscription}
            onError={(err) => console.error("Voice error:", err)}
          />
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
