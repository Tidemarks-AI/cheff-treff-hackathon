import { cn } from "../lib/utils"

function ResponsiveGrid({
  className,
  minChildWidth = "16rem",
  gap = 4,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  minChildWidth?: string
  gap?: number
}) {
  return (
    <div
      data-slot="responsive-grid"
      className={cn("grid", className)}
      style={{
        gap: `${gap * 0.25}rem`,
        gridTemplateColumns: `repeat(auto-fill, minmax(${minChildWidth}, 1fr))`,
        ...style,
      }}
      {...props}
    />
  )
}

export { ResponsiveGrid }
