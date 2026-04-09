import { useEffect, useState } from "react"
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
import {
  fetchOntologyFinance,
  type ChangeRequest,
  type OntologyGraphNode,
  type OntologyGraphEdge,
} from "@/lib/changes-api"

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
const STEEL = { border: "#b0b8c4", color: "#5a6370" }
const ICE = { border: "#a3b8d0", color: "#546d8a" }

const NODE_COLORS: Record<string, { border: string; color: string }> = {
  cost_center: STEEL,
  budget_line: STEEL,
  fixed_expense: STEEL,
  costs: STEEL,
  variance: ICE,
  forecast: ICE,
  runway: ICE,
  bank: ICE,
}
const DEFAULT_NODE = STEEL

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
    cursor: "pointer",
    transition: "all 400ms ease",
    boxShadow: "none",
  }
}

const fmtCompact = (n: number) =>
  n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)

function buildNodeLabel(gn: OntologyGraphNode): string {
  const parts = [gn.label]
  if (gn.count != null) parts[0] += ` (${gn.count})`
  if (gn.totalMonthly != null) parts.push(`€${fmtCompact(gn.totalMonthly)}/mo`)
  if (gn.flagged != null && gn.flagged > 0) parts.push(`${gn.flagged} flagged`)
  if (gn.months != null) parts.push(`${gn.months.toFixed(1)}mo`)
  if (gn.balance != null) parts.push(`€${fmtCompact(gn.balance)}`)
  return parts.join("\n")
}

function buildFlowNodes(graphNodes: OntologyGraphNode[], hasChange: boolean): Node[] {
  return graphNodes.map((gn) => ({
    id: gn.id,
    data: { label: buildNodeLabel(gn) },
    position: { x: 0, y: 0 },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    style: nodeStyle(gn.id, REFERENCED_IDS.has(gn.id), hasChange),
  }))
}

function buildFlowEdges(graphEdges: OntologyGraphEdge[], hasChange: boolean): Edge[] {
  return graphEdges.map((ge, i) => {
    const touchesRef = hasChange && (REFERENCED_IDS.has(ge.source) || REFERENCED_IDS.has(ge.target))
    return {
      id: `e-${ge.source}-${ge.target}-${i}`,
      source: ge.source,
      target: ge.target,
      label: ge.label,
      type: "default",
      style: { stroke: touchesRef ? "#8b95a5" : "#dde0e4", strokeWidth: 1.5, transition: "all 400ms ease" },
      labelStyle: { fill: touchesRef ? "#8b95a5" : "#b0b5be", fontSize: 10, transition: "all 400ms ease" },
      labelBgStyle: { fill: "transparent" },
      labelBgPadding: [0, 0] as [number, number],
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: touchesRef ? "#8b95a5" : "#dde0e4" },
    }
  })
}

// Fallback graph when API is unavailable
const FALLBACK_NODES: OntologyGraphNode[] = [
  { id: "cost_center", label: "Cost Centers" },
  { id: "budget_line", label: "Budget Lines" },
  { id: "fixed_expense", label: "Fixed Expenses" },
  { id: "costs", label: "Costs (Actuals)" },
  { id: "variance", label: "Variances" },
  { id: "forecast", label: "Forecast" },
  { id: "runway", label: "Runway" },
  { id: "bank", label: "Bank Account" },
]
const FALLBACK_EDGES: OntologyGraphEdge[] = [
  { source: "cost_center", target: "fixed_expense", label: "owns" },
  { source: "cost_center", target: "budget_line", label: "owns" },
  { source: "cost_center", target: "costs", label: "incurs" },
  { source: "budget_line", target: "variance", label: "planned" },
  { source: "costs", target: "variance", label: "actual" },
  { source: "variance", target: "forecast", label: "informs" },
  { source: "forecast", target: "runway", label: "informs" },
  { source: "runway", target: "bank", label: "uses" },
]

interface Props {
  change: ChangeRequest | null
}

function OntologyFlow({ change }: Props) {
  const isApproved = change?.status === "approved"
  const hasChange = change != null

  const [graphNodes, setGraphNodes] = useState<OntologyGraphNode[]>(FALLBACK_NODES)
  const [graphEdges, setGraphEdges] = useState<OntologyGraphEdge[]>(FALLBACK_EDGES)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // Fetch graph data from API
  useEffect(() => {
    fetchOntologyFinance()
      .then((data) => {
        setGraphNodes(data.graph.nodes)
        setGraphEdges(data.graph.edges)
      })
      .catch(() => {
        // Keep fallback
      })
  }, [])

  // Build layout whenever graph data or change state changes
  useEffect(() => {
    const allNodes = buildFlowNodes(graphNodes, hasChange)
    const allEdges = buildFlowEdges(graphEdges, hasChange)

    if (hasChange && change) {
      const values = change.proposal_values as Record<string, unknown>
      const vendor = (values.vendor as string) ?? change.proposal_target_type
      const amount = values.monthly_amount ? `€${fmtCompact(Number(values.monthly_amount))}/mo` : ""
      const label = [vendor, amount].filter(Boolean).join("\n")

      allNodes.push({
        id: "proposed",
        data: { label },
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

      // Connect proposed node to the targets from the change request edges
      const proposalEdges = change.proposal_edges ?? []
      if (proposalEdges.length > 0) {
        for (const pe of proposalEdges) {
          allEdges.push({
            id: `e-proposed-${pe.to}`,
            source: "proposed",
            target: pe.to,
            label: pe.label,
            type: "default",
            style: edgeStyle,
            labelStyle,
            labelBgStyle,
            labelBgPadding,
            markerEnd: marker,
          })
        }
      } else {
        // Default: connect to fixed_expense and cost_center
        allEdges.push(
          { id: "e-proposed-fe", source: "proposed", target: "fixed_expense", label: "instance of", type: "default", style: edgeStyle, labelStyle, labelBgStyle, labelBgPadding, markerEnd: marker },
          { id: "e-proposed-cc", source: "proposed", target: "cost_center", label: "belongs to", type: "default", style: edgeStyle, labelStyle, labelBgStyle, labelBgPadding, markerEnd: marker },
        )
      }
    }

    getLayoutedElements(allNodes, allEdges).then(({ nodes: ln, edges: le }) => {
      setNodes(ln)
      setEdges(le)
    })
  }, [graphNodes, graphEdges, hasChange, isApproved, change])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      fitViewOptions={{ padding: 0.15 }}
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
