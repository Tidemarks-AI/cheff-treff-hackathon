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

// Two semantic groups: structure (steel) and financial (ice blue)
const STEEL   = { border: "#b0b8c4", color: "#5a6370" } // structure: cost centers, budgets, expenses
const ICE     = { border: "#a3b8d0", color: "#546d8a" } // financial: forecasts, runway, bank

const NODE_COLORS: Record<string, { border: string; color: string }> = {
  cost_center:   STEEL,
  budget_line:   STEEL,
  fixed_expense: STEEL,
  costs:         STEEL,
  variance:      ICE,
  forecast:      ICE,
  runway:        ICE,
  bank:          ICE,
}
const DEFAULT_NODE = STEEL

// IDs that a change request references (edges point to these)
const REFERENCED_IDS = new Set(["cost_center", "fixed_expense"])

function nodeStyle(id: string, isReferenced: boolean, hasChange: boolean) {
  const referenced = hasChange && isReferenced
  const palette = NODE_COLORS[id] ?? DEFAULT_NODE
  return {
    borderRadius: 12,
    border: `1.5px solid ${referenced ? palette.color : palette.border}`,
    background: "transparent",
    padding: "8px 14px",
    fontSize: 12,
    fontWeight: referenced ? 600 : 500,
    width: NODE_WIDTH,
    textAlign: "center" as const,
    color: palette.color,
    transition: "all 400ms ease",
    boxShadow: "none",
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
      style: { stroke: touchesRef ? "#8b95a5" : "#dde0e4", strokeWidth: 1.5, transition: "all 400ms ease" },
      labelStyle: { fill: touchesRef ? "#8b95a5" : "#b0b5be", fontSize: 10, transition: "all 400ms ease" },
      labelBgStyle: { fill: "transparent" },
      labelBgPadding: [0, 0] as [number, number],
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: touchesRef ? "#8b95a5" : "#dde0e4" },
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
          border: `2px ${isApproved ? "solid" : "dashed"} ${isApproved ? "#4a7a97" : "#93b5cf"}`,
          background: "transparent",
          padding: "10px 16px",
          fontSize: 13,
          fontWeight: 700,
          width: NODE_WIDTH + 10,
          textAlign: "center" as const,
          color: "#374151",
          transition: "all 600ms ease",
          boxShadow: "none",
        },
      })

      const edgeStyle = {
        strokeDasharray: isApproved ? "0" : "6 4",
        stroke: "#6b7280",
        strokeWidth: 2,
        opacity: isApproved ? 1 : 0.6,
        transition: "all 600ms ease",
      }
      const labelStyle = { fill: "#6b7280", fontSize: 10, fontWeight: 600 }
      const labelBgStyle = { fill: "transparent" }
      const labelBgPadding: [number, number] = [0, 0]
      const marker = { type: MarkerType.ArrowClosed as const, width: 14, height: 14, color: "#6b7280" }

      allEdges.push(
        { id: "e-proposed-fe", source: "proposed", target: "fixed_expense", label: "instance of", type: "default", style: edgeStyle, labelStyle, labelBgStyle, labelBgPadding, markerEnd: marker },
        { id: "e-proposed-cc", source: "proposed", target: "cost_center", label: "belongs to", type: "default", style: edgeStyle, labelStyle, labelBgStyle, labelBgPadding, markerEnd: marker },
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
