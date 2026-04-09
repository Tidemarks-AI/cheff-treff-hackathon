import { useState, useCallback } from "react"
import { Outlet } from "@tanstack/react-router"

import { AppSidebar } from "@/components/app-sidebar"
import { VoiceCommandBar } from "@/components/voice-command-bar"
import { ChatPanel } from "@/components/chat-panel"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4!" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="ml-auto">
            <VoiceCommandBar
              onTranscription={handleVoiceTranscription}
              onError={(err) => console.error("Voice error:", err)}
            />
          </div>
        </header>
        <div className="flex-1 p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>

      <ChatPanel
        open={chatOpen}
        onOpenChange={setChatOpen}
        initialMessage={pendingMessage}
        onInitialMessageSent={handleInitialMessageSent}
      />
    </SidebarProvider>
  )
}
