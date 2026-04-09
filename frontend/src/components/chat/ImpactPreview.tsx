import { ImpactChart } from "@/components/changes/ImpactChart"
import { OntologyPane } from "@/components/changes/OntologyPane"
import type { ForecastSeries, ChangeRequest } from "@/lib/changes-api"

export type ImpactPreviewData = {
  type: "impact_preview"
  scenario: string
  category: string
  monthly_amount: number
  start_date: string
  current_financials: {
    monthly_burn: number
    total_fixed_monthly: number
    bank_balance: number
    runway_months: number
    cost_centers: number
    fixed_expenses: number
    flagged_variances: number
  }
  impact: {
    monthly_burn_delta: number
    annual_cost_delta: number
    runway_months_delta: number
    new_monthly_burn: number
    new_runway_months: number
  }
  forecast_after: ForecastSeries
  affected_cost_center: { id: string; name: string } | null
  existing_expenses_in_category: Array<{
    name: string
    amount: number
    frequency: string
  }>
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n)

function toSyntheticChange(data: ImpactPreviewData): ChangeRequest {
  return {
    id: "whatif-preview",
    status: "pending",
    received_at: new Date().toISOString(),
    source_channel: "whatif",
    source_mailbox: null,
    source_from: "What-If Explorer",
    source_subject: data.scenario,
    source_attachment: null,
    source_gmail_id: null,
    proposal_action: "create_node",
    proposal_target_type: "fixed_expense",
    proposal_values: {
      vendor: data.scenario,
      category: data.category,
      monthly_amount: data.monthly_amount,
    },
    proposal_edges: [
      { from: "proposed", to: "fixed_expense", label: "instance of" },
      { from: "proposed", to: "cost_center", label: "belongs to" },
    ],
    reasoning_summary: "",
    reasoning_confidence: 1,
    reasoning_evidence: [],
    policy_triggered: [],
    policy_satisfied: true,
    policy_message: null,
    impact_monthly_burn_delta: -data.impact.monthly_burn_delta,
    impact_annual_cost_delta: -data.impact.annual_cost_delta,
    impact_runway_months_delta: data.impact.runway_months_delta,
    impact_forecast_after: data.forecast_after,
    discord_message_id: null,
    discord_channel_id: null,
    resolved_by: null,
    resolved_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export function ImpactPreview({ data }: { data: ImpactPreviewData }) {
  const syntheticChange = toSyntheticChange(data)

  return (
    <div className="rounded-xl border border-border bg-background/80 overflow-hidden my-2">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-border">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
          What-If Scenario
        </div>
        <div className="text-sm font-semibold text-foreground">
          {data.scenario}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {data.category} · {fmtCurrency(data.monthly_amount)}/mo · from{" "}
          {data.start_date}
        </div>
      </div>

      {/* Impact metrics */}
      <div className="px-4 py-2.5 border-b border-border">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
              Monthly
            </div>
            <div className="text-base font-semibold tabular-nums text-foreground">
              +{fmtCurrency(data.impact.monthly_burn_delta)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
              Annual
            </div>
            <div className="text-base font-semibold tabular-nums text-foreground">
              +{fmtCurrency(data.impact.annual_cost_delta)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
              Runway
            </div>
            <div className="text-base font-semibold tabular-nums text-foreground">
              {data.impact.runway_months_delta > 0 ? "+" : ""}
              {data.impact.runway_months_delta}mo
            </div>
          </div>
        </div>
      </div>

      {/* Ontology graph */}
      <div className="border-b border-border" style={{ height: 280 }}>
        <OntologyPane change={syntheticChange} />
      </div>

      {/* Forecast chart */}
      <div className="px-4 py-2.5 border-b border-border">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
          Burn Forecast
        </div>
        <div className="h-[120px]">
          <ImpactChart
            forecastAfter={data.forecast_after}
            isApproved={false}
          />
        </div>
      </div>

      {/* Current state summary */}
      <div className="px-4 py-2.5 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Current burn</span>
          <span className="tabular-nums">{fmtCurrency(data.current_financials.monthly_burn)}/mo</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Bank balance</span>
          <span className="tabular-nums">{fmtCurrency(data.current_financials.bank_balance)}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Runway after</span>
          <span className="tabular-nums font-medium text-foreground">{data.impact.new_runway_months}mo</span>
        </div>
        {data.existing_expenses_in_category.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Existing {data.category} costs
            </div>
            {data.existing_expenses_in_category.map((e, i) => (
              <div key={i} className="flex justify-between mt-0.5">
                <span>{e.name}</span>
                <span className="tabular-nums">{fmtCurrency(e.amount)}/{e.frequency === "monthly" ? "mo" : e.frequency}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
