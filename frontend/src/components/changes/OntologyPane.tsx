import { useEffect } from "react"
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import ELK from "elkjs/lib/elk.bundled.js"
import type { ChangeRequest } from "@/lib/changes-api"

const elk = new ELK()
const NODE_WIDTH = 150
const NODE_HEIGHT = 50

async function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "50",
      "elk.layered.spacing.nodeNodeBetweenLayers": "70",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    },
    children: nodes.map((n) => ({ id: n.id, width: NODE_WIDTH, height: NODE_HEIGHT })),
    edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  }
  const layout = await elk.layout(graph)
  return {
    nodes: nodes.map((node) => {
      const elkNode = layout.children?.find((n) => n.id === node.id)
      return { ...node, position: { x: elkNode?.x ?? 0, y: elkNode?.y ?? 0 } }
    }),
    edges,
  }
}

const AMBER = "#d97706"
const BLUE = "#3b82f6"
const GRAY = "#d4d4d8"

// IDs that a change request references (edges point to these)
const REFERENCED_IDS = new Set(["cost_center", "fixed_expense"])

function nodeStyle(id: string, isReferenced: boolean, hasChange: boolean) {
  const referenced = hasChange && isReferenced
  return {
    borderRadius: 12,
    border: `1.5px solid ${referenced ? BLUE : AMBER}`,
    backgroundColor: referenced ? "rgba(219,234,254,0.9)" : "rgba(255,251,235,0.85)",
    backdropFilter: "blur(8px)",
    padding: "8px 14px",
    fontSize: 12,
    fontWeight: referenced ? 600 : 500,
    width: NODE_WIDTH,
    textAlign: "center" as const,
    color: referenced ? "#1e40af" : "#78350f",
    transition: "all 400ms ease",
    boxShadow: referenced ? "0 0 0 3px rgba(59,130,246,0.15), 0 2px 12px rgba(59,130,246,0.1)" : "none",
  }
}

function makeNodes(hasChange: boolean): Node[] {
  return [
    { id: "cost_center", data: { label: "Cost Center (G&A)" } },
    { id: "budget_line", data: { label: "Budget Line" } },
    { id: "fixed_expense", data: { label: "Fixed Expenses" } },
    { id: "costs", data: { label: "Costs (Actuals)" } },
    { id: "variance", data: { label: "Variance" } },
    { id: "forecast", data: { label: "Financial Forecast" } },
    { id: "runway", data: { label: "Runway Calculation" } },
    { id: "bank", data: { label: "Bank Account" } },
  ].map((n) => ({
    ...n,
    position: { x: 0, y: 0 },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    style: nodeStyle(n.id, REFERENCED_IDS.has(n.id), hasChange),
  }))
}

function makeEdges(hasChange: boolean): Edge[] {
  return [
    { id: "e-cc-bl", source: "cost_center", target: "budget_line", label: "owns" },
    { id: "e-cc-costs", source: "cost_center", target: "costs", label: "incurs" },
    { id: "e-bl-var", source: "budget_line", target: "variance", label: "planned" },
    { id: "e-costs-var", source: "costs", target: "variance", label: "actual" },
    { id: "e-var-fc", source: "variance", target: "forecast", label: "informs" },
    { id: "e-fc-run", source: "forecast", target: "runway", label: "informs" },
    { id: "e-run-bank", source: "runway", target: "bank", label: "uses" },
  ].map((e) => {
    // Highlight edges that connect to referenced nodes
    const touchesRef = hasChange && (REFERENCED_IDS.has(e.source) || REFERENCED_IDS.has(e.target))
    return {
      ...e,
      type: "default",
      style: { stroke: touchesRef ? "rgba(59,130,246,0.3)" : GRAY, strokeWidth: 1.5, transition: "all 400ms ease" },
      labelStyle: { fill: touchesRef ? "rgba(59,130,246,0.5)" : "#a1a1aa", fontSize: 10, transition: "all 400ms ease" },
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: touchesRef ? "rgba(59,130,246,0.3)" : GRAY },
    }
  })
}

interface Props {
  change: ChangeRequest | null
}

function OntologyFlow({ change }: Props) {
  const isApproved = change?.status === "approved"
  const hasChange = change != null

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  useEffect(() => {
    const allNodes = makeNodes(hasChange)
    const allEdges = makeEdges(hasChange)

    if (hasChange) {
      allNodes.push({
        id: "proposed",
        data: { label: "Office Lease\n€12k/mo" },
        position: { x: 0, y: 0 },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        style: {
          borderRadius: 14,
          border: `2px ${isApproved ? "solid" : "dashed"} ${BLUE}`,
          backgroundColor: isApproved ? "rgba(219,234,254,0.95)" : "rgba(219,234,254,0.5)",
          backdropFilter: "blur(12px)",
          padding: "10px 16px",
          fontSize: 13,
          fontWeight: 700,
          width: NODE_WIDTH + 10,
          textAlign: "center" as const,
          color: BLUE,
          transition: "all 600ms ease",
          boxShadow: isApproved
            ? "0 4px 24px rgba(59,130,246,0.3)"
            : "0 2px 16px rgba(59,130,246,0.12)",
        },
      })

      const edgeStyle = {
        strokeDasharray: isApproved ? "0" : "6 4",
        stroke: BLUE,
        strokeWidth: 2,
        opacity: isApproved ? 1 : 0.6,
        transition: "all 600ms ease",
      }
      const labelStyle = { fill: BLUE, fontSize: 10, fontWeight: 600 }
      const marker = { type: MarkerType.ArrowClosed as const, width: 14, height: 14, color: BLUE }

      allEdges.push(
        { id: "e-proposed-fe", source: "proposed", target: "fixed_expense", label: "instance of", type: "default", style: edgeStyle, labelStyle, markerEnd: marker },
        { id: "e-proposed-cc", source: "proposed", target: "cost_center", label: "belongs to", type: "default", style: edgeStyle, labelStyle, markerEnd: marker },
      )
    }

    getLayoutedElements(allNodes, allEdges).then(({ nodes: ln, edges: le }) => {
      setNodes(ln)
      setEdges(le)
    })
  }, [hasChange, isApproved])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      fitViewOptions={{ padding: 0.25 }}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      minZoom={0.3}
      maxZoom={1.5}
    >
      <Background gap={28} size={1} color="rgba(148,163,184,0.06)" />
    </ReactFlow>
  )
}

export function OntologyPane({ change }: Props) {
  return (
    <ReactFlowProvider>
      <OntologyFlow change={change} />
    </ReactFlowProvider>
  )
}
