import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"
import { StatusBadge } from "../atoms/status-badge"
import type { VariantProps as CVAVariantProps } from "class-variance-authority"
import type { statusBadgeVariants } from "../atoms/status-badge"

const approvalCardVariants = cva(
  "glass rounded-lg text-foreground transition-colors",
  {
    variants: {
      variant: {
        list: "flex flex-col gap-2 p-4",
        compact: "flex items-center gap-3 px-4 py-3",
      },
    },
    defaultVariants: {
      variant: "list",
    },
  }
)

type ApprovalStatus = "pending" | "approved" | "rejected"

const statusMap: Record<ApprovalStatus, CVAVariantProps<typeof statusBadgeVariants>["status"]> = {
  pending: "pending",
  approved: "success",
  rejected: "error",
}

export interface ApprovalCardProps
  extends Omit<React.ComponentProps<"div">, "title" | "onClick">,
    VariantProps<typeof approvalCardVariants> {
  title: string
  status?: ApprovalStatus
  agentName?: string
  timestamp?: string
  onClick?: () => void
}

function ApprovalCard({
  className,
  variant,
  title,
  status = "pending",
  agentName,
  timestamp,
  onClick,
  ...props
}: ApprovalCardProps) {
  return (
    <div
      data-slot="approval-card"
      className={cn(
        approvalCardVariants({ variant }),
        onClick && "cursor-pointer hover:bg-[var(--glass-bg)]",
        className,
      )}
      onClick={onClick}
      {...props}
    >
      {variant === "compact" ? (
        <>
          <span className="truncate text-sm font-medium">{title}</span>
          <StatusBadge status={statusMap[status]} className="ml-auto shrink-0">
            {status}
          </StatusBadge>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium leading-snug">{title}</span>
            <StatusBadge status={statusMap[status]} className="shrink-0">
              {status}
            </StatusBadge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {agentName && <span>{agentName}</span>}
            {agentName && timestamp && <span>·</span>}
            {timestamp && <time>{timestamp}</time>}
          </div>
        </>
      )}
    </div>
  )
}

export { ApprovalCard, approvalCardVariants }
export type { ApprovalStatus }
