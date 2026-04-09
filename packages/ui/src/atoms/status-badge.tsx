import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      status: {
        success: "text-green-600 bg-green-500/10 dark:text-green-400 dark:bg-green-400/10",
        error: "text-red-600 bg-red-500/10 dark:text-red-400 dark:bg-red-400/10",
        warning: "text-yellow-600 bg-yellow-500/10 dark:text-yellow-400 dark:bg-yellow-400/10",
        info: "text-blue-600 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-400/10",
        pending: "text-yellow-600 border border-yellow-600/30 bg-transparent",
        neutral: "text-muted-foreground bg-muted",
      },
    },
    defaultVariants: {
      status: "neutral",
    },
  }
)

function StatusBadge({
  className,
  status,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof statusBadgeVariants>) {
  return (
    <span
      data-slot="status-badge"
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    />
  )
}

export { StatusBadge, statusBadgeVariants }
