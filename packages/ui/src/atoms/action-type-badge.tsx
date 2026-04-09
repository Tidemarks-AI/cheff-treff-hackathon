import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"

const actionTypeBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wider",
  {
    variants: {
      type: {
        create: "text-green-600 bg-green-500/10 dark:text-green-400 dark:bg-green-400/10",
        read: "text-blue-600 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-400/10",
        update: "text-yellow-600 bg-yellow-500/10 dark:text-yellow-400 dark:bg-yellow-400/10",
        delete: "text-red-600 bg-red-500/10 dark:text-red-400 dark:bg-red-400/10",
        execute: "text-purple-600 bg-purple-500/10 dark:text-purple-400 dark:bg-purple-400/10",
        custom: "text-muted-foreground bg-muted",
      },
    },
    defaultVariants: {
      type: "custom",
    },
  }
)

export type ActionType = NonNullable<VariantProps<typeof actionTypeBadgeVariants>["type"]>

function ActionTypeBadge({
  className,
  type,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof actionTypeBadgeVariants>) {
  return (
    <span
      data-slot="action-type-badge"
      className={cn(actionTypeBadgeVariants({ type }), className)}
      {...props}
    />
  )
}

export { ActionTypeBadge, actionTypeBadgeVariants }
