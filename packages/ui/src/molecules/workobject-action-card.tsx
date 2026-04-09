import * as React from "react"
import { cn } from "../lib/utils"
import { ActionTypeBadge } from "../atoms/action-type-badge"
import type { ActionType } from "../atoms/action-type-badge"

export interface WorkObjectActionCardProps extends React.ComponentProps<"div"> {
  namespace: string
  objectName: string
  actionName: string
  actionType?: ActionType
  description?: string
}

function WorkObjectActionCard({
  className,
  namespace,
  objectName,
  actionName,
  actionType = "custom",
  description,
  ...props
}: WorkObjectActionCardProps) {
  return (
    <div
      data-slot="workobject-action-card"
      className={cn("glass flex flex-col gap-2 rounded-lg p-4 text-foreground", className)}
      {...props}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs text-muted-foreground">
            {namespace}/{objectName}
          </span>
          <p className="truncate font-medium">{actionName}</p>
        </div>
        <ActionTypeBadge type={actionType} className="shrink-0">
          {actionType}
        </ActionTypeBadge>
      </div>
      {description && (
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
      )}
    </div>
  )
}

export { WorkObjectActionCard }
