import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  acceptPendingApproval,
  listAgents,
  listPendingApprovals,
  runAgent,
  type AgentListItem,
  type PendingApproval,
} from "@/lib/api"

function formatParameters(parameters: unknown) {
  return JSON.stringify(parameters, null, 2)
}

export default function Agents() {
  const [agents, setAgents] = useState<AgentListItem[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState("")
  const [message, setMessage] = useState("Create a simple 30-day founder operating plan.")
  const [reply, setReply] = useState("")
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
  const [error, setError] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [acceptingApprovalId, setAcceptingApprovalId] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    void Promise.all([listAgents(), listPendingApprovals()])
      .then(([{ agents: nextAgents }, { approvals }]) => {
        if (!mountedRef.current) return
        setAgents(nextAgents)
        setPendingApprovals(approvals)
        setSelectedAgentId((currentAgentId) => currentAgentId || nextAgents[0]?.id || "")
      })
      .catch((nextError: Error) => {
        if (!mountedRef.current) return
        setError(nextError.message)
      })

    return () => {
      mountedRef.current = false
    }
  }, [])

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId)

  function handleAgentChange(value: string | null) {
    setSelectedAgentId(value ?? "")
  }

  function handleSubmit() {
    if (!selectedAgentId || !message.trim() || isRunning) return

    setError("")
    setReply("")
    setIsRunning(true)

    void runAgent(selectedAgentId, message)
      .then((result) => {
        if (result.status === "completed") {
          setReply(result.reply)
          return
        }

        setPendingApprovals((currentApprovals) => {
          const existingApprovalIds = new Set(currentApprovals.map((approval) => approval.id))

          return [
            ...currentApprovals,
            ...result.approvals.filter((approval) => !existingApprovalIds.has(approval.id)),
          ]
        })
        setReply("Approval required before the agent can continue.")
      })
      .catch((nextError: Error) => {
        setError(nextError.message)
      })
      .finally(() => {
        setIsRunning(false)
      })
  }

  function handleAcceptApproval(approvalId: string) {
    if (acceptingApprovalId) return

    setError("")
    setAcceptingApprovalId(approvalId)

    void acceptPendingApproval(approvalId)
      .then((result) => {
        setPendingApprovals((currentApprovals) =>
          currentApprovals.filter((approval) => approval.id !== approvalId)
        )

        if (result.status === "completed") {
          setReply(result.reply)
          return
        }

        setPendingApprovals((currentApprovals) => [...currentApprovals, ...result.approvals])
        setReply("Another approval is required before the agent can continue.")
      })
      .catch((nextError: Error) => {
        setError(nextError.message)
      })
      .finally(() => {
        setAcceptingApprovalId(null)
      })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agents Workspace</h1>
        <p className="text-muted-foreground">
          Run backend OpenAI agents directly from the frontend.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent Runner</CardTitle>
          <CardDescription>
            Select an agent, send a prompt, and approve mutating tool calls before they run.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <div className="space-y-2">
              <div className="text-sm font-medium">Agent</div>
              <Select value={selectedAgentId || null} onValueChange={handleAgentChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAgent ? (
                <div className="text-sm text-muted-foreground">
                  {selectedAgent.description}
                  <br />
                  Model: {selectedAgent.model}
                  <br />
                  Tools: {selectedAgent.tools.join(", ")}
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ask an agent something useful"
                disabled={isRunning}
              />
              <div className="flex items-center gap-3">
                <Button disabled={isRunning || !selectedAgentId} onClick={handleSubmit}>
                  {isRunning ? "Running..." : "Run agent"}
                </Button>
                {error ? <span className="text-sm text-destructive">{error}</span> : null}
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                {reply || "The agent response will appear here."}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>
            Mutating functions stay here until a human explicitly approves them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No pending approvals.
            </div>
          ) : (
            pendingApprovals.map((approval) => (
              <div key={approval.id} className="space-y-3 rounded-lg border border-border p-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium">{approval.toolName}</div>
                  <div className="text-sm text-muted-foreground">{approval.description}</div>
                  <div className="text-xs text-muted-foreground">
                    Agent: {approval.agentId} · Created: {new Date(approval.createdAt).toLocaleString()}
                  </div>
                </div>
                <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 text-xs whitespace-pre-wrap">
                  {formatParameters(approval.parameters)}
                </pre>
                <Button
                  onClick={() => handleAcceptApproval(approval.id)}
                  disabled={acceptingApprovalId !== null}
                >
                  {acceptingApprovalId === approval.id ? "Accepting..." : "Accept"}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
