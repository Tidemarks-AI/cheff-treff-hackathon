import { motion } from "framer-motion"
import type { ReactNode, ElementType } from "react"

interface PressableProps {
  children: ReactNode
  /** HTML element to render. Defaults to "div". */
  as?: ElementType
  className?: string
}

export function Pressable({ children, as = "div", className }: PressableProps) {
  const Component = motion.create(as)
  return (
    <Component
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={className}
    >
      {children}
    </Component>
  )
}
