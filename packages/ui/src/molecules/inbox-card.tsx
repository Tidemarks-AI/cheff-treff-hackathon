import { cva, type VariantProps } from "class-variance-authority"
import { Clock, Lock, Mail, MessageSquare, Mic, Webhook } from "lucide-react"
import { cn } from "../lib/utils"
import { StatusBadge } from "../atoms/status-badge"
import { Badge } from "../atoms/badge"

const inboxCardVariants = cva(
  "glass rounded-md text-foreground transition-colors p-3",
  {
    variants: {
      variant: {
        default: "",
        compact: "py-2",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export type InboxCardStatus =
  | "pending"
  | "routing"
  | "processing"
  | "completed"
  | "failed"
  | "archived"
  | "blocked"

export type InboxCardChannel = "email" | "chat" | "voice" | "webhook"

const statusConfig: Record<
  InboxCardStatus,
  { status: "pending" | "success" | "error" | "neutral"; label: string }
> = {
  blocked: { status: "neutral", label: "Blocked" },
  pending: { status: "pending", label: "Pending" },
  routing: { status: "pending", label: "Routing" },
  processing: { status: "neutral", label: "Processing" },
  completed: { status: "success", label: "Completed" },
  failed: { status: "error", label: "Failed" },
  archived: { status: "neutral", label: "Archived" },
}

const channelIcons: Record<InboxCardChannel, React.ElementType> = {
  email: Mail,
  chat: MessageSquare,
  voice: Mic,
  webhook: Webhook,
}

const priorityColors: Record<string, string> = {
  critical: "text-red-400 border-red-400/30",
  high: "text-orange-400 border-orange-400/30",
  normal: "text-blue-400 border-blue-400/30",
  low: "text-muted-foreground border-muted/30",
}

export interface InboxCardProps
  extends VariantProps<typeof inboxCardVariants> {
  className?: string
  title: string
  preview?: string
  status: InboxCardStatus
  channel?: InboxCardChannel
  agentName?: string
  timestamp?: string
  onClick?: () => void
  itemType?: string
  priority?: string
  source?: string
}

function InboxCard({
  className,
  variant,
  title,
  preview,
  status,
  channel,
  agentName,
  timestamp,
  onClick,
  itemType,
  priority,
  source,
}: InboxCardProps) {
  const { status: badgeStatus, label } = statusConfig[status]
  const ChannelIcon = channel ? channelIcons[channel] : null

  return (
    <div
      data-slot="inbox-card"
      className={cn(
        inboxCardVariants({ variant }),
        onClick && "cursor-pointer hover:bg-[var(--glass-bg)]",
        className,
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium truncate flex-1">
          {status === "blocked" && <Lock className="size-3 inline mr-1 text-muted-foreground" />}
          {title}
        </span>
        <StatusBadge status={badgeStatus} className="shrink-0">
          {label}
        </StatusBadge>
      </div>

      {(itemType || priority) && (
        <div className="mt-1 flex items-center gap-1.5">
          {itemType && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {itemType}
            </Badge>
          )}
          {priority && priority !== "normal" && (
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priorityColors[priority])}>
              {priority}
            </Badge>
          )}
        </div>
      )}

      {preview && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
          {preview}
        </p>
      )}

      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        {timestamp && (
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {timestamp}
          </span>
        )}
        {ChannelIcon && (
          <span className="flex items-center gap-1">
            <ChannelIcon className="size-3" />
            <span className="capitalize">{channel}</span>
          </span>
        )}
        {agentName && <span className="font-mono">@{agentName}</span>}
        {source?.startsWith("agent:") && !agentName && (
          <span className="font-mono text-muted-foreground/60">from {source}</span>
        )}
      </div>
    </div>
  )
}

export { InboxCard, inboxCardVariants }
