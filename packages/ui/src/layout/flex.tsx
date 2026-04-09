import { cn } from "../lib/utils"

const alignMap = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
} as const

const justifyMap = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
} as const

function Flex({
  className,
  gap = 4,
  align,
  justify,
  wrap,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  gap?: number
  align?: keyof typeof alignMap
  justify?: keyof typeof justifyMap
  wrap?: boolean
}) {
  return (
    <div
      data-slot="flex"
      className={cn(
        "flex",
        align && alignMap[align],
        justify && justifyMap[justify],
        wrap && "flex-wrap",
        className
      )}
      style={{ gap: `${gap * 0.25}rem`, ...style }}
      {...props}
    />
  )
}

export { Flex }
