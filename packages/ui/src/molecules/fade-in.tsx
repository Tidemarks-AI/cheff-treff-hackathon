import { motion } from "framer-motion"
import type { ReactNode } from "react"

const directionOffset = {
  up: { y: 12 },
  down: { y: -12 },
  left: { x: 12 },
  right: { x: -12 },
  none: {},
} as const

interface FadeInProps {
  children: ReactNode
  /** Stagger index — each increment adds 60ms delay */
  index?: number
  /** Direction the element enters from */
  direction?: keyof typeof directionOffset
  /** Animation duration in seconds */
  duration?: number
  className?: string
}

export function FadeIn({
  children,
  index = 0,
  direction = "up",
  duration = 0.4,
  className,
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, ...directionOffset[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay: index * 0.06, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
