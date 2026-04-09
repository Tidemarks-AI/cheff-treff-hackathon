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
      <div className="px-6 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 leading-tight">
              {values.vendor as string}
            </h2>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
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
      <div className="px-6 py-3 border-b border-gray-100">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Monthly</div>
            <div className="text-base font-semibold tabular-nums text-gray-900">
              {fmtCurrency(Math.abs(change.impact_monthly_burn_delta))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Annual</div>
            <div className="text-base font-semibold tabular-nums text-gray-900">
              {fmtCurrency(Math.abs(change.impact_annual_cost_delta))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Runway</div>
            <div className="text-base font-semibold tabular-nums text-gray-900">
              {change.impact_runway_months_delta > 0 ? "+" : ""}{change.impact_runway_months_delta}mo
            </div>
          </div>
        </div>
      </div>

      {/* Forecast chart */}
      <div className="px-6 py-3 border-b border-gray-100">
        <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Burn Forecast</div>
        <div className="h-[140px]">
          <ImpactChart
            forecastAfter={change.impact_forecast_after}
            isApproved={isApproved}
          />
        </div>
      </div>

      {/* Evidence */}
      <div className="px-6 py-3 border-b border-gray-100 flex-1 min-h-0 overflow-y-auto">
        <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Evidence</div>
        <div className="space-y-2">
          {change.reasoning_evidence.map((ev) => (
            <div key={ev.field} className="text-xs">
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-gray-700 capitalize">{ev.field.replace(/_/g, " ")}</span>
                <span className="font-mono text-[10px] text-gray-400">{ev.clause}</span>
              </div>
              <p className="text-gray-500 mt-0.5 leading-relaxed">{ev.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Policy + actions */}
      <div className="px-6 py-3 border-t border-gray-100 shrink-0">
        {!change.policy_satisfied && (
          <div className="flex items-start gap-2 mb-3 rounded-lg bg-amber-50/80 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">
              {change.policy_message}
            </p>
          </div>
        )}

        {isPending && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onApprove}
              disabled={isLoading}
              className="flex-1 rounded-lg h-9 text-xs font-medium"
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1.5" />}
              Apply Change
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              disabled={isLoading}
              className="rounded-lg h-9 px-4 text-xs border-gray-200"
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
          <div className="flex items-center justify-center gap-2 rounded-lg bg-red-50/80 py-2.5">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-600">Rejected</span>
          </div>
        )}
      </div>
    </div>
  )
}
