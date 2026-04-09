import { cn } from "../lib/utils"

const alignMap = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
} as const

const justifyMap = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
} as const

function Stack({
  className,
  gap = 4,
  align,
  justify,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  gap?: number
  align?: keyof typeof alignMap
  justify?: keyof typeof justifyMap
}) {
  return (
    <div
      data-slot="stack"
      className={cn(
        "flex flex-col",
        align && alignMap[align],
        justify && justifyMap[justify],
        className
      )}
      style={{ gap: `${gap * 0.25}rem`, ...style }}
      {...props}
    />
  )
}

export { Stack }
