import { useState, useCallback } from "react"
import { Link, Outlet } from "@tanstack/react-router"
import { Settings } from "lucide-react"

import { ChatPanel } from "@/components/chat-panel"

export default function App() {
  const [chatOpen, setChatOpen] = useState(false)
  const [pendingMessage, setPendingMessage] = useState<string | undefined>()

  const handleInitialMessageSent = useCallback(() => {
    setPendingMessage(undefined)
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center border-b border-border bg-background/80 px-6 backdrop-blur-xl">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-80">
          <img src="/logo.svg" alt="SpaceStart" className="h-6 w-auto" />
          <span className="text-lg font-light tracking-[0.25em] uppercase text-foreground" style={{ fontFamily: '-apple-system, "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif' }}>
            SPACESTART
          </span>
        </Link>
        <nav className="ml-8 flex items-center gap-1">
          <Link to="/changes" className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&.active]:bg-accent [&.active]:text-foreground">Changes</Link>
          <Link to="/whatif" className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&.active]:bg-accent [&.active]:text-foreground">What If</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
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
