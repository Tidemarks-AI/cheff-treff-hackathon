import { CheckCircle, XCircle, AlertTriangle, Loader2, FileText } from "lucide-react"
import { Badge, Button } from "@startupos/ui"
import { ImpactChart } from "./ImpactChart"
import type { ChangeRequest } from "@/lib/changes-api"

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n)

interface ChangeDetailProps {
  change: ChangeRequest
  onApprove: () => void
  onReject: () => void
  isLoading: boolean
}

export function ChangeDetail({ change, onApprove, onReject, isLoading }: ChangeDetailProps) {
  const values = change.proposal_values as Record<string, unknown>
  const isApproved = change.status === "approved"
  const isRejected = change.status === "rejected"
  const isPending = change.status === "pending"

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground leading-tight">
              {values.vendor as string}
            </h2>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
              <FileText className="h-3 w-3 shrink-0" />
              <span className="truncate">{change.source_attachment}</span>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs px-2 py-0.5 shrink-0 ml-3 tabular-nums">
            {(change.reasoning_confidence * 100).toFixed(0)}%
          </Badge>
        </div>
      </div>

      {/* Impact metrics */}
      <div className="px-6 py-3 border-b border-border">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Monthly</div>
            <div className="text-base font-semibold tabular-nums text-foreground">
              {fmtCurrency(Math.abs(change.impact_monthly_burn_delta))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Annual</div>
            <div className="text-base font-semibold tabular-nums text-foreground">
              {fmtCurrency(Math.abs(change.impact_annual_cost_delta))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Runway</div>
            <div className="text-base font-semibold tabular-nums text-foreground">
              {change.impact_runway_months_delta > 0 ? "+" : ""}{change.impact_runway_months_delta}mo
            </div>
          </div>
        </div>
      </div>

      {/* Forecast chart */}
      <div className="px-6 py-3 border-b border-border">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Burn Forecast</div>
        <div className="h-[140px]">
          <ImpactChart
            forecastAfter={change.impact_forecast_after}
            isApproved={isApproved}
          />
        </div>
      </div>

      {/* Evidence */}
      <div className="px-6 py-3 border-b border-border flex-1 min-h-0 overflow-y-auto">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Evidence</div>
        <div className="space-y-2">
          {change.reasoning_evidence.map((ev) => (
            <div key={ev.field} className="text-xs">
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-foreground/80 capitalize">{ev.field.replace(/_/g, " ")}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{ev.clause}</span>
              </div>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">{ev.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Policy + actions */}
      <div className="px-6 py-3 border-t border-border shrink-0">
        {!change.policy_satisfied && (
          <div className="flex items-start gap-2 mb-3 rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(217, 119, 87, 0.1)" }}>
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "#D97757" }} />
            <p className="text-xs leading-relaxed" style={{ color: "#B5603D" }}>
              {change.policy_message}
            </p>
          </div>
        )}

        {isPending && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onApprove}
              disabled={isLoading}
              className="w-1/2 rounded-lg h-9 text-xs font-medium text-green-900/60 border-green-900/20 hover:bg-green-50/50"
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1.5" />}
              Apply Change
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              disabled={isLoading}
              className="w-1/2 rounded-lg h-9 text-xs font-medium text-red-900/60 border-red-900/20 hover:bg-red-50/50"
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Reject
            </Button>
          </div>
        )}
        {isApproved && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-green-50/80 py-2.5">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Change Applied</span>
          </div>
        )}
        {isRejected && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-red-900/20 py-2.5">
            <XCircle className="h-4 w-4 text-red-900/60" />
            <span className="text-sm font-medium text-red-900/60">Rejected</span>
          </div>
        )}
      </div>
    </div>
  )
}
