import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"

const countChipVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "text-foreground bg-muted",
        muted: "text-muted-foreground bg-muted/60",
        accent: "text-primary bg-primary/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface CountChipProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof countChipVariants> {
  icon?: React.ReactNode
  count: number
}

function CountChip({
  className,
  variant,
  icon,
  count,
  ...props
}: CountChipProps) {
  return (
    <span
      data-slot="count-chip"
      className={cn(countChipVariants({ variant }), className)}
      {...props}
    >
      {icon}
      <span>{count}</span>
    </span>
  )
}

export { CountChip, countChipVariants }
