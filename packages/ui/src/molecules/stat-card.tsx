import type { ReactNode } from "react"
import { cn } from "../lib/utils"

export interface StatCardProps {
  icon?: ReactNode
  label: string
  value: ReactNode
  /** Animation stagger index — each increment adds 80ms delay */
  index?: number
  className?: string
}

export function StatCard({
  icon,
  label,
  value,
  index = 0,
  className,
}: StatCardProps) {
  return (
    <div
      data-slot="stat-card"
      className={cn("glass rounded-lg p-5 animate-fade-up", className)}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon && <span className="h-4 w-4 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
        <span className="text-sm">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-medium">{value}</div>
    </div>
  )
}
