import { cn } from "../lib/utils"

const statusColors = {
  online: "bg-green-500",
  offline: "bg-muted-foreground",
  warning: "bg-yellow-500",
  error: "bg-red-500",
} as const

export interface StatusDotProps {
  status?: keyof typeof statusColors
  label?: string
  className?: string
}

export function StatusDot({
  status = "online",
  label,
  className,
}: StatusDotProps) {
  return (
    <span
      data-slot="status-dot"
      className={cn("inline-flex items-center gap-2", className)}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full animate-pulse-dot",
          statusColors[status],
        )}
      />
      {label && <span className="text-sm">{label}</span>}
    </span>
  )
}
