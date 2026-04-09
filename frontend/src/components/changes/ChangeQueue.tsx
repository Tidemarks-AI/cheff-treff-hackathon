import { Mail, Clock } from "lucide-react"
import { Badge, ScrollArea } from "@startupos/ui"
import type { ChangeRequest } from "@/lib/changes-api"

function formatProposalTitle(cr: ChangeRequest): string {
  const values = cr.proposal_values as Record<string, unknown>
  const vendor = values.vendor as string | undefined
  if (vendor) return vendor
  return `${cr.proposal_target_type}`
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h`
}

interface ChangeQueueProps {
  changes: ChangeRequest[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ChangeQueue({ changes, selectedId, onSelect }: ChangeQueueProps) {
  if (changes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <div className="text-xs text-muted-foreground">No requests yet</div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1 p-1.5">
        {changes.map((cr) => {
          const isSelected = cr.id === selectedId
          return (
            <button
              key={cr.id}
              onClick={() => onSelect(cr.id)}
              className={`flex flex-col gap-1 rounded-xl px-2.5 py-2 text-left transition-all ${
                isSelected
                  ? "bg-background/80 shadow-sm ring-1 ring-border/60"
                  : "hover:bg-background/40"
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[12px] font-medium text-foreground truncate">
                  {formatProposalTitle(cr)}
                </span>
                <Badge
                  variant={
                    cr.status === "approved" ? "outline"
                    : cr.status === "rejected" ? "destructive"
                    : "secondary"
                  }
                  className="text-[9px] px-1 py-0 shrink-0"
                >
                  {cr.status === "pending" ? "New" : cr.status === "approved" ? "✓" : "✕"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Mail className="h-2.5 w-2.5" />
                <span className="truncate">{cr.source_from}</span>
                <span className="ml-auto shrink-0 flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {formatTimeAgo(cr.received_at)}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </ScrollArea>
  )
}
