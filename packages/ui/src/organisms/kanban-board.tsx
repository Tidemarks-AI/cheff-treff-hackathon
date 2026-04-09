import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "../lib/utils"
import { CountChip } from "../atoms/count-chip"
import { ScrollArea } from "./scroll-area"

/* ─── KanbanBoard ─── */

export interface KanbanBoardProps {
  className?: string
  children: React.ReactNode
}

function KanbanBoard({
  className,
  children,
}: KanbanBoardProps) {
  return (
    <div
      data-slot="kanban-board"
      className={cn("flex gap-4 overflow-x-auto pb-4", className)}
    >
      {children}
    </div>
  )
}

/* ─── KanbanColumn ─── */

export interface KanbanColumnProps extends React.ComponentProps<"div"> {
  columnId: string
  title: string
  icon?: React.ReactNode
  count?: number
  headerAction?: React.ReactNode
}

function KanbanColumn({
  className,
  columnId,
  title,
  icon,
  count,
  headerAction,
  children,
  ...props
}: KanbanColumnProps) {
  return (
    <div
      data-slot="kanban-column"
      className={cn(
        "flex min-w-[280px] max-w-sm shrink-0 flex-col rounded-lg",
        className,
      )}
      {...props}
    >
      <div className="glass flex items-center gap-2 rounded-t-lg px-4 py-3">
        {icon && <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>}
        <span className="text-sm font-medium">{title}</span>
        {count != null && <CountChip count={count} variant="muted" />}
        {headerAction && <div className="ml-auto">{headerAction}</div>}
      </div>
      <ScrollArea
        className="max-h-[75vh] flex-1 rounded-b-lg border border-t-0 border-border/40 p-2"
      >
        <div className="flex flex-col gap-2">{children}</div>
      </ScrollArea>
    </div>
  )
}

/* ─── KanbanCard ─── */

export interface KanbanCardProps {
  className?: string
  cardId: string
  columnId: string
  children: React.ReactNode
}

function KanbanCard({
  className,
  cardId,
  columnId,
  children,
}: KanbanCardProps) {
  return (
    <motion.div
      data-slot="kanban-card"
      className={cn("rounded-md", className)}
      layoutId={cardId}
    >
      {children}
    </motion.div>
  )
}

export { KanbanBoard, KanbanColumn, KanbanCard }
