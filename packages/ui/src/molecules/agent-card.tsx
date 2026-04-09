import { cva, type VariantProps } from "class-variance-authority"
import { Bot } from "lucide-react"
import { cn } from "../lib/utils"
import { AgentStatusIndicator } from "../atoms/agent-status-indicator"
import type { AgentStatusIndicatorProps } from "../atoms/agent-status-indicator"
import { CountChip } from "../atoms/count-chip"
import { Wrench, Zap } from "lucide-react"

const agentCardVariants = cva(
  "glass rounded-lg text-foreground transition-colors",
  {
    variants: {
      variant: {
        grid: "flex flex-col gap-3 p-5",
        compact: "flex items-center gap-3 px-4 py-3",
      },
    },
    defaultVariants: {
      variant: "grid",
    },
  }
)

export interface AgentCardProps
  extends VariantProps<typeof agentCardVariants> {
  className?: string
  name: string
  model?: string
  status?: AgentStatusIndicatorProps["status"]
  toolCount?: number
  actionCount?: number
  onClick?: () => void
  href?: string
}

function AgentCard({
  className,
  variant,
  name,
  model,
  status,
  toolCount,
  actionCount,
  onClick,
  href,
}: AgentCardProps) {
  const interactive = onClick || href
  const Wrapper = href ? "a" : "div"
  const wrapperProps = href ? { href } : {}

  return (
    <Wrapper
      data-slot="agent-card"
      className={cn(
        agentCardVariants({ variant }),
        interactive && "cursor-pointer hover:bg-[var(--glass-bg)]",
        className,
      )}
      onClick={onClick}
      {...wrapperProps}
    >
      {variant === "compact" ? (
        <>
          <Bot className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{name}</span>
          {status && (
            <AgentStatusIndicator status={status} size="sm" className="ml-auto" />
          )}
        </>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Bot className="size-5 text-muted-foreground" />
              <span className="font-medium">{name}</span>
            </div>
            {status && <AgentStatusIndicator status={status} size="sm" />}
          </div>
          {model && (
            <span className="text-xs text-muted-foreground truncate">{model}</span>
          )}
          {(toolCount != null || actionCount != null) && (
            <div className="flex items-center gap-2">
              {toolCount != null && (
                <CountChip icon={<Wrench />} count={toolCount} variant="muted" />
              )}
              {actionCount != null && (
                <CountChip icon={<Zap />} count={actionCount} variant="muted" />
              )}
            </div>
          )}
        </>
      )}
    </Wrapper>
  )
}

export { AgentCard, agentCardVariants }
