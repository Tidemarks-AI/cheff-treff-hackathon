import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"

const agentStatusIndicatorVariants = cva(
  "inline-flex items-center gap-1.5",
  {
    variants: {
      status: {
        idle: "[--dot-color:theme(--color-muted-foreground)]",
        running: "[--dot-color:theme(--color-green-500)]",
        waiting: "[--dot-color:theme(--color-yellow-500)]",
        error: "[--dot-color:theme(--color-red-500)]",
      },
      size: {
        sm: "[--dot-size:0.375rem] text-xs",
        md: "[--dot-size:0.5rem] text-sm",
      },
    },
    defaultVariants: {
      status: "idle",
      size: "md",
    },
  }
)

export interface AgentStatusIndicatorProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof agentStatusIndicatorVariants> {
  label?: string
}

function AgentStatusIndicator({
  className,
  status,
  size,
  label,
  ...props
}: AgentStatusIndicatorProps) {
  return (
    <span
      data-slot="agent-status-indicator"
      className={cn(agentStatusIndicatorVariants({ status, size }), className)}
      {...props}
    >
      <span
        className={cn(
          "rounded-full bg-[var(--dot-color)]",
          "h-[var(--dot-size)] w-[var(--dot-size)]",
          status === "running" && "animate-pulse",
        )}
      />
      {label && <span>{label}</span>}
    </span>
  )
}

export { AgentStatusIndicator, agentStatusIndicatorVariants }
