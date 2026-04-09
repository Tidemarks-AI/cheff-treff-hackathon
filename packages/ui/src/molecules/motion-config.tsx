import { MotionConfig } from "framer-motion"
import type { ReactNode } from "react"

interface StartupOSMotionConfigProps {
  children: ReactNode
}

export function StartupOSMotionConfig({ children }: StartupOSMotionConfigProps) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
    </MotionConfig>
  )
}
