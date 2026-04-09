import * as React from "react"
import { Bot, Wrench } from "lucide-react"
import { cn } from "../lib/utils"
import { AgentStatusIndicator } from "../atoms/agent-status-indicator"
import type { AgentStatusIndicatorProps } from "../atoms/agent-status-indicator"
import { CountChip } from "../atoms/count-chip"

export interface AgentRunSummaryProps extends React.ComponentProps<"div"> {
  agentName: string
  status?: AgentStatusIndicatorProps["status"]
  toolCallCount?: number
}

function AgentRunSummary({
  className,
  agentName,
  status = "idle",
  toolCallCount,
  ...props
}: AgentRunSummaryProps) {
  return (
    <div
      data-slot="agent-run-summary"
      className={cn(
        "inline-flex items-center gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm",
        className,
      )}
      {...props}
    >
      <Bot className="size-4 shrink-0 text-muted-foreground" />
      <span className="font-medium">{agentName}</span>
      <AgentStatusIndicator status={status} size="sm" />
      {toolCallCount != null && (
        <CountChip icon={<Wrench />} count={toolCallCount} variant="muted" />
      )}
    </div>
  )
}

export { AgentRunSummary }
