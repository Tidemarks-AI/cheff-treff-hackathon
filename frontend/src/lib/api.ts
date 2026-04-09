const API_URL = import.meta.env.VITE_API_URL || ""

export type AgentListItem = {
  id: string
  name: string
  description: string
  model: string
  tools: string[]
}

export type PendingApproval = {
  id: string
  agentId: string
  toolName: string
  parameters: unknown
  description: string
  createdAt: string
  callId: string
}

export type PolicyFieldType = "string" | "number" | "boolean"
export type PolicyOperator = "eq" | "neq" | "lt" | "lte" | "gt" | "gte" | "contains"
export type PolicyAction = "auto_allow" | "auto_deny"
export type PolicyConditionGroup = "all" | "any"

export type FunctionPolicyField = {
  name: string
  label: string
  type: PolicyFieldType
  description?: string
}

export type FunctionDefinition = {
  name: string
  access: "read_only" | "mutating"
  description: string
  approvalDescription: string
  policyFields: FunctionPolicyField[]
}

export type FunctionPolicy = {
  id: string
  toolName: string
  action: PolicyAction
  conditionGroup: PolicyConditionGroup
  conditions: Array<{
    id: string
    field: string
    operator: PolicyOperator
    value: string | number | boolean
  }>
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export type AgentRunResponse =
  | {
      agentId: string
      status: "completed"
      reply: string
    }
  | {
      agentId: string
      status: "approval_required"
      approvals: PendingApproval[]
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
  return apiFetch<AgentRunResponse>(`/api/agents/${agentId}/run`, {
    method: "POST",
    body: JSON.stringify({ message }),
  })
}

export async function listPendingApprovals() {
  return apiFetch<{ approvals: PendingApproval[] }>("/api/approvals")
}

export async function listFunctions() {
  return apiFetch<{ functions: FunctionDefinition[] }>("/api/functions")
}

export async function listPolicies() {
  return apiFetch<{ policies: FunctionPolicy[] }>("/api/policies")
}

export async function createPolicy(input: {
  toolName: string
  action: PolicyAction
  conditionGroup: PolicyConditionGroup
  conditions: Array<{
    field: string
    operator: PolicyOperator
    value: string
  }>
  enabled: boolean
}) {
  return apiFetch<{ policy: FunctionPolicy }>("/api/policies", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function updatePolicy(
  policyId: string,
  input: {
    toolName: string
    action: PolicyAction
    conditionGroup: PolicyConditionGroup
    conditions: Array<{
      field: string
      operator: PolicyOperator
      value: string
    }>
    enabled: boolean
  }
) {
  return apiFetch<{ policy: FunctionPolicy }>(`/api/policies/${policyId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export async function deletePolicy(policyId: string) {
  const res = await fetch(`${API_URL}/api/policies/${policyId}`, {
    method: "DELETE",
  })

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }
}

export async function acceptPendingApproval(approvalId: string) {
  return apiFetch<AgentRunResponse>(`/api/approvals/${approvalId}/accept`, {
    method: "POST",
  })
}

export async function denyPendingApproval(approvalId: string) {
  return apiFetch<AgentRunResponse>(`/api/approvals/${approvalId}/deny`, {
    method: "POST",
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
