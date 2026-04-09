import type { ChangeRequestDraft, ForecastSeries } from "./change-requests.js";

export function seedForecastBase(): ForecastSeries {
  return {
    months: [
      "May 26", "Jun 26", "Jul 26", "Aug 26", "Sep 26", "Oct 26",
      "Nov 26", "Dec 26", "Jan 27", "Feb 27", "Mar 27", "Apr 27",
    ],
    values: [
      85_000, 85_000, 85_000, 85_000, 85_000, 85_000,
      85_000, 85_000, 85_000, 85_000, 85_000, 85_000,
    ],
  };
}

export function createOfficeLeaseDraft(): ChangeRequestDraft {
  return {
    status: "pending",
    received_at: new Date().toISOString(),
    source_channel: "email",
    source_mailbox: "agent@acme.com",
    source_from: "leasing@berlin-offices.de",
    source_subject: "Mietvertrag Büro Mitte – finale Version",
    source_attachment: "Mietvertrag_Mitte_2026.pdf",
    source_gmail_id: null,
    proposal_action: "create_node",
    proposal_target_type: "Costs",
    proposal_values: {
      vendor: "Berlin Offices GmbH",
      category: "facilities",
      subcategory: "office_rent",
      monthly_amount: 12_000,
      currency: "EUR",
      start_date: "2026-07-01",
      term_months: 36,
      notice_period: "3 months",
      cancellation: "End of term with 3-month notice",
    },
    proposal_edges: [
      { from: "proposed_cost", to: "cost_center:ga", label: "belongs to" },
    ],
    reasoning_summary:
      "This is a recurring monthly obligation with a fixed term and no usage-based component. Classified as Fixed Cost → Facilities → Office Rent. Confidence 94%.",
    reasoning_confidence: 0.94,
    reasoning_evidence: [
      {
        field: "monthly_amount",
        clause: "§3.1",
        text: "Die monatliche Miete beträgt EUR 12.000,00 netto zzgl. Nebenkosten",
      },
      {
        field: "term_months",
        clause: "§2.1",
        text: "Das Mietverhältnis beginnt am 01.07.2026 und läuft über 36 Monate",
      },
      {
        field: "notice_period",
        clause: "§12.3",
        text: "Kündigungsfrist von 3 Monaten zum Vertragsende",
      },
      {
        field: "start_date",
        clause: "§2.1",
        text: "Mietbeginn: 01.07.2026",
      },
      {
        field: "vendor",
        clause: "§1.1",
        text: "Vermieter: Berlin Offices GmbH, Friedrichstraße 123, 10117 Berlin",
      },
    ],
    policy_triggered: ["fixed_cost_threshold_3k"],
    policy_satisfied: false,
    policy_message:
      "This change exceeds the €3,000/month threshold for fixed costs. Finance approval required.",
    impact_monthly_burn_delta: -12_000,
    impact_annual_cost_delta: -144_000,
    impact_runway_months_delta: -0.4,
    impact_forecast_after: {
      months: [
        "May 26", "Jun 26", "Jul 26", "Aug 26", "Sep 26", "Oct 26",
        "Nov 26", "Dec 26", "Jan 27", "Feb 27", "Mar 27", "Apr 27",
      ],
      values: [
        85_000, 85_000, 97_000, 97_000, 97_000, 97_000,
        97_000, 97_000, 97_000, 97_000, 97_000, 97_000,
      ],
    },
  };
}
