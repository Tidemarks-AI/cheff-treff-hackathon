import { useEffect, useMemo, useRef } from "react"
import { cn } from "../lib/utils"

interface Node {
  id: number
  cx: number
  cy: number
  r: number
  driftX: number
  driftY: number
  duration: number
  phase: number
}

interface Edge {
  from: number
  to: number
}

export interface NetworkBackgroundProps {
  /** Number of nodes to render */
  nodeCount?: number
  /** Maximum distance (%) between connected nodes */
  connectionDistance?: number
  className?: string
}

function generateNetwork(
  nodeCount: number,
  connectionDistance: number,
): { nodes: Node[]; edges: Edge[] } {
  // Deterministic pseudo-random based on seed
  const rand = (i: number, offset: number) => {
    const x = Math.sin(i * 127.1 + offset * 311.7) * 43758.5453
    return x - Math.floor(x)
  }

  // Place nodes with rejection sampling to prevent overlap
  const minDist = 10 // minimum separation between node centers (viewBox units)
  const nodes: Node[] = []
  let seed = 0
  while (nodes.length < nodeCount && seed < nodeCount * 30) {
    const cx = rand(seed, 0) * 100
    const cy = rand(seed, 1) * 100
    const tooClose = nodes.some((n) => {
      const dx = n.cx - cx
      const dy = n.cy - cy
      return dx * dx + dy * dy < minDist * minDist
    })
    if (!tooClose) {
      nodes.push({
        id: nodes.length,
        cx,
        cy,
        r: 1.5 + rand(seed, 2) * 1.5,
        driftX: (rand(seed, 3) - 0.5) * 5,
        driftY: (rand(seed, 4) - 0.5) * 5,
        duration: 18 + rand(seed, 5) * 16,
        phase: rand(seed, 6) * Math.PI * 2,
      })
    }
    seed++
  }

  const edges: Edge[] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].cx - nodes[j].cx
      const dy = nodes[i].cy - nodes[j].cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < connectionDistance) {
        edges.push({ from: i, to: j })
      }
    }
  }

  return { nodes, edges }
}

export function NetworkBackground({
  nodeCount = 25,
  connectionDistance = 25,
  className,
}: NetworkBackgroundProps) {
  const { nodes, edges } = useMemo(
    () => generateNetwork(nodeCount, connectionDistance),
    [nodeCount, connectionDistance],
  )

  const circleRefs = useRef<(SVGCircleElement | null)[]>([])
  const lineRefs = useRef<(SVGLineElement | null)[]>([])

  useEffect(() => {
    let rafId: number
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = (now - startTime) / 1000 // seconds

      // Compute current position for each node
      const positions = nodes.map((node) => {
        const t = (elapsed / node.duration) * Math.PI * 2
        return {
          x: node.cx + node.driftX * Math.sin(t + node.phase),
          y: node.cy + node.driftY * Math.cos(t * 0.7 + node.phase),
        }
      })

      // Update circle positions
      nodes.forEach((_node, i) => {
        const el = circleRefs.current[i]
        if (!el) return
        el.setAttribute("cx", String(positions[i].x))
        el.setAttribute("cy", String(positions[i].y))
      })

      // Update line endpoints to follow their connected nodes
      edges.forEach((edge, i) => {
        const el = lineRefs.current[i]
        if (!el) return
        el.setAttribute("x1", String(positions[edge.from].x))
        el.setAttribute("y1", String(positions[edge.from].y))
        el.setAttribute("x2", String(positions[edge.to].x))
        el.setAttribute("y2", String(positions[edge.to].y))
      })

      rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [nodes, edges])

  return (
    <div
      data-slot="network-background"
      className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}
      aria-hidden="true"
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Connection lines */}
        {edges.map((edge, i) => {
          const a = nodes[edge.from]
          const b = nodes[edge.to]
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              ref={(el) => { lineRefs.current[i] = el }}
              x1={a.cx}
              y1={a.cy}
              x2={b.cx}
              y2={b.cy}
              className="stroke-[var(--network-line)] transition-colors"
              strokeWidth="0.15"
            />
          )
        })}

        {/* Nodes */}
        {nodes.map((node, i) => (
          <circle
            key={node.id}
            ref={(el) => { circleRefs.current[i] = el }}
            cx={node.cx}
            cy={node.cy}
            r={node.r}
            className="fill-[var(--network-node)] transition-colors"
          />
        ))}
      </svg>

      {/* Theme-aware CSS custom properties */}
      <style>{`
        [data-slot="network-background"] {
          --network-node: oklch(0.87 0.028 70);
          --network-line: oklch(0.87 0.028 70 / 40%);
        }
        .dark [data-slot="network-background"] {
          --network-node: oklch(0.93 0.008 80 / 15%);
          --network-line: oklch(0.93 0.008 80 / 6%);
        }
      `}</style>
    </div>
  )
}
