import { ChatPanel } from "@/components/chat-panel"

export default function WhatIf() {
  return (
    <div className="h-[calc(100vh-4rem)] px-6">
      <ChatPanel variant="inline" agentId="startup-advisor" />
    </div>
  )
}
