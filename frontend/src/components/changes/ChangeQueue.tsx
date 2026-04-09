import { Mail } from "lucide-react"
import { Badge, ScrollArea } from "@startupos/ui"
import type { ChangeRequest } from "@/lib/changes-api"

function formatProposalTitle(cr: ChangeRequest): string {
  const values = cr.proposal_values as Record<string, unknown>
  const vendor = values.vendor as string | undefined
  if (vendor) return vendor
  return `${cr.proposal_target_type}`
}


interface ChangeQueueProps {
  changes: ChangeRequest[]
  selectedId: string | null
  onSelect: (id: string) => void
  readIds: Set<string>
}

export function ChangeQueue({ changes, selectedId, onSelect, readIds }: ChangeQueueProps) {
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
          const isRead = readIds.has(cr.id)
          const showBadge = cr.status !== "pending" || !isRead
          return (
            <button
              key={cr.id}
              onClick={() => onSelect(cr.id)}
              className={`flex flex-col gap-1 rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer ${
                isSelected
                  ? "bg-background/80 shadow-sm ring-1 ring-border/60"
                  : "hover:bg-background/40"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`text-[12px] font-medium truncate min-w-0 ${isRead && cr.status === "pending" ? "text-muted-foreground" : "text-foreground"}`}>
                  {formatProposalTitle(cr)}
                </span>
                {showBadge && (
                  <Badge
                    variant={
                      cr.status === "approved" ? "outline"
                      : cr.status === "rejected" ? "outline"
                      : "secondary"
                    }
                    className={`text-[9px] px-1 py-0 shrink-0 ${cr.status === "rejected" ? "text-red-900/60 border-red-900/20" : ""}`}
                  >
                    {cr.status === "pending" ? "New" : cr.status === "approved" ? "✓" : "✕"}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground min-w-0">
                <Mail className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate min-w-0">{cr.source_from}</span>
              </div>
            </button>
          )
        })}
      </div>
    </ScrollArea>
  )
}
