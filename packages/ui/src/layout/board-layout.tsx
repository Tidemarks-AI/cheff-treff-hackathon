import * as React from "react"
import { cn } from "../lib/utils"

export interface BoardLayoutProps extends React.ComponentProps<"div"> {
  header?: React.ReactNode
}

function BoardLayout({
  className,
  header,
  children,
  ...props
}: BoardLayoutProps) {
  return (
    <div
      data-slot="board-layout"
      className={cn("flex h-full flex-col", className)}
      {...props}
    >
      {header && <div className="shrink-0">{header}</div>}
      <div className="flex-1 overflow-x-auto">{children}</div>
    </div>
  )
}

export { BoardLayout }
