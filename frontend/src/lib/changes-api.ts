import { supabase } from "@/lib/supabase"

const API_URL = import.meta.env.VITE_API_URL || ""

export type ForecastSeries = {
  months: string[]
  values: number[]
}

export type ChangeRequest = {
  id: string
  status: "pending" | "approved" | "rejected"
  received_at: string
  source_channel: string
  source_mailbox: string | null
  source_from: string
  source_subject: string
  source_attachment: string | null
  source_gmail_id: string | null
  proposal_action: "create_node" | "update_node"
  proposal_target_type: string
  proposal_values: Record<string, unknown>
  proposal_edges: Array<{ from: string; to: string; label: string }>
  reasoning_summary: string
  reasoning_confidence: number
  reasoning_evidence: Array<{ field: string; clause: string; text: string }>
  policy_triggered: string[]
  policy_satisfied: boolean
  policy_message: string | null
  impact_monthly_burn_delta: number
  impact_annual_cost_delta: number
  impact_runway_months_delta: number
  impact_forecast_after: ForecastSeries | null
  discord_message_id: string | null
  discord_channel_id: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  let token = data.session?.access_token

  // Fallback: read token from localStorage if session isn't hydrated yet
  if (!token) {
    const storageKey = Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"))
    if (storageKey) {
      try {
        const stored = JSON.parse(localStorage.getItem(storageKey) ?? "")
        token = stored?.access_token
      } catch { /* ignore */ }
    }
  }

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function listChangeRequests(): Promise<ChangeRequest[]> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}/api/changes`, { headers })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const json = await res.json()
  return json.changes ?? []
}

export async function approveChangeRequest(id: string): Promise<ChangeRequest> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}/api/changes/${id}/approve`, {
    method: "POST",
    headers,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const json = await res.json()
  return json.change
}

export async function rejectChangeRequest(id: string): Promise<ChangeRequest> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}/api/changes/${id}/reject`, {
    method: "POST",
    headers,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const json = await res.json()
  return json.change
}

export type OntologyGraphNode = {
  id: string
  label: string
  count?: number
  totalMonthly?: number
  flagged?: number
  months?: number | null
  balance?: number | null
}

export type OntologyGraphEdge = {
  source: string
  target: string
  label: string
}

export type OntologyFinanceData = {
  graph: {
    nodes: OntologyGraphNode[]
    edges: OntologyGraphEdge[]
  }
  forecastBase: ForecastSeries
}

export async function fetchOntologyFinance(): Promise<OntologyFinanceData> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}/api/ontology/finance`, { headers })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function triggerGmailPoll(): Promise<{ status: string; reason?: string }> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}/api/cron/gmail-poll`, { headers })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export type SSEHandlers = {
  onNew: (cr: ChangeRequest) => void
  onUpdated: (cr: ChangeRequest) => void
}

export function connectSSE(handlers: SSEHandlers): () => void {
  const es = new EventSource(`${API_URL}/api/stream`)

  es.addEventListener("change:new", (e) => {
    const cr = JSON.parse(e.data) as ChangeRequest
    handlers.onNew(cr)
  })

  es.addEventListener("change:updated", (e) => {
    const cr = JSON.parse(e.data) as ChangeRequest
    handlers.onUpdated(cr)
  })

  return () => es.close()
}
