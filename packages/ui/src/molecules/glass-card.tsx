import * as React from "react"
import { cn } from "../lib/utils"

function GlassCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-card"
      className={cn(
        "glass flex flex-col gap-6 rounded-lg py-6 text-foreground",
        className
      )}
      {...props}
    />
  )
}

function GlassCardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-card-header"
      className={cn("grid auto-rows-min items-start gap-1.5 px-6", className)}
      {...props}
    />
  )
}

function GlassCardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

export { GlassCard, GlassCardHeader, GlassCardContent }
