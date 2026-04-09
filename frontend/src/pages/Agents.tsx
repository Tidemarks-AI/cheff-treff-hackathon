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
import { listAgents, streamAgent, type AgentListItem } from "@/lib/api"

export default function Agents() {
  const [agents, setAgents] = useState<AgentListItem[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState("")
  const [message, setMessage] = useState("Create a simple 30-day founder operating plan.")
  const [reply, setReply] = useState("")
  const [error, setError] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let isMounted = true

    void listAgents()
      .then(({ agents: nextAgents }) => {
        if (!isMounted) return
        setAgents(nextAgents)
        setSelectedAgentId(nextAgents[0]?.id ?? "")
      })
      .catch((nextError: Error) => {
        if (!isMounted) return
        setError(nextError.message)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId)

  function handleAgentChange(value: string | null) {
    setSelectedAgentId(value ?? "")
  }

  function handleStop() {
    abortControllerRef.current?.abort()
  }

  function handleSubmit() {
    if (!selectedAgentId || !message.trim() || isStreaming) return

    setError("")
    setReply("")
    setIsStreaming(true)

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    void streamAgent(selectedAgentId, message, {
      signal: abortController.signal,
      onChunk: (chunk) => {
        setReply((currentReply) => currentReply + chunk)
      },
    })
      .catch((nextError: Error) => {
        if (abortController.signal.aborted) {
          return
        }

        setError(nextError.message)
      })
      .finally(() => {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null
        }

        setIsStreaming(false)
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
            Select an agent, send a prompt, and inspect the streamed response.
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
                disabled={isStreaming}
              />
              <div className="flex items-center gap-3">
                <Button disabled={isStreaming || !selectedAgentId} onClick={handleSubmit}>
                  {isStreaming ? "Streaming..." : "Run agent"}
                </Button>
                <Button disabled={!isStreaming} variant="outline" onClick={handleStop}>
                  Stop
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
    </div>
  )
}
