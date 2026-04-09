import { AnimatePresence, motion } from "framer-motion"
import type { ReactNode } from "react"

interface PageTransitionProps {
  children: ReactNode
  /** Current route pathname — used as animation key */
  pathname: string
  className?: string
}

/**
 * Uses first 2 path segments as key so sub-routes (e.g. /chat and /chat/$id)
 * share the same key and don't trigger a transition.
 */
function coarseKey(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean)
  return "/" + segments.slice(0, 2).join("/")
}

export function PageTransition({ children, pathname, className }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={coarseKey(pathname)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
