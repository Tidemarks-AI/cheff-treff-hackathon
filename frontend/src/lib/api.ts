const API_URL = import.meta.env.VITE_API_URL || ""

export type AgentListItem = {
  id: string
  name: string
  description: string
  model: string
  tools: string[]
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function listAgents() {
  return apiFetch<{ agents: AgentListItem[] }>("/api/agents")
}

export async function runAgent(agentId: string, message: string) {
  return apiFetch<{ agentId: string; reply: string }>(`/api/agents/${agentId}/run`, {
    method: "POST",
    body: JSON.stringify({ message }),
  })
}

export async function streamAgent(
  agentId: string,
  message: string,
  options: {
    onChunk: (chunk: string) => void
    signal?: AbortSignal
  }
) {
  const res = await fetch(`${API_URL}/api/agents/${agentId}/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    signal: options.signal,
  })

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }

  if (!res.body) {
    throw new Error("Streaming is not available in this browser")
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break
      options.onChunk(decoder.decode(value, { stream: true }))
    }

    const trailingChunk = decoder.decode()
    if (trailingChunk) {
      options.onChunk(trailingChunk)
    }
  } finally {
    reader.releaseLock()
  }
}
