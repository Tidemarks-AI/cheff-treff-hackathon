import * as React from "react"
import { cn } from "../lib/utils"

interface PaginationProps extends React.ComponentProps<"div"> {
  /** Total number of items. */
  total: number
  /** Number of items currently visible. */
  visible: number
  /** Called to load more items. */
  onLoadMore: () => void
  /** Label override — defaults to "Show more (N remaining)". */
  label?: string
}

function Pagination({
  total,
  visible,
  onLoadMore,
  label,
  className,
  ...props
}: PaginationProps) {
  const remaining = total - visible

  if (remaining <= 0) return null

  return (
    <div data-slot="pagination" className={cn("pt-3", className)} {...props}>
      <button
        type="button"
        onClick={onLoadMore}
        className="w-full rounded-md py-2 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
      >
        {label ?? `Show more (${remaining} remaining)`}
      </button>
    </div>
  )
}

export { Pagination }
export type { PaginationProps }
