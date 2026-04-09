import { getOpenAI } from "./openai.js";
import { getToolPolicyDecision } from "./policies.js";
import { seedForecastBase } from "./fixtures.js";
import type { ChangeRequestDraft, ForecastSeries } from "./change-requests.js";

type EmailMetadata = {
  from: string;
  subject: string;
  attachmentFilename: string;
  gmailMessageId: string;
  mailbox: string;
};

type ExtractionResult = {
  vendor: string;
  monthly_amount: number;
  currency: string;
  start_date: string;
  term_months: number;
  notice_period: string;
  cancellation: string;
  category: string;
  confidence: number;
  reasoning: string;
  evidence: Array<{ field: string; clause: string; text: string }>;
};

/**
 * Process an email PDF attachment through the agent pipeline:
 * 1. Extract structured data from the PDF using GPT-4o vision
 * 2. Classify the document type
 * 3. Evaluate policies
 * 4. Compute financial impact
 * 5. Return a ChangeRequestDraft
 */
export async function processEmail(
  pdfBuffer: Buffer,
  metadata: EmailMetadata
): Promise<ChangeRequestDraft | null> {
  try {
    // Step 1: Extract data from PDF
    const extraction = await extractFromPDF(pdfBuffer, metadata);

    // Step 2: Evaluate policy
    const policyDecision = getToolPolicyDecision("createFixedCost", {
      monthly_amount: extraction.monthly_amount,
      category: extraction.category,
      term_months: extraction.term_months,
    });

    // Step 3: Compute impact
    const impact = computeImpact(extraction.monthly_amount, extraction.start_date);

    // Step 4: Build ChangeRequestDraft
    const draft: ChangeRequestDraft = {
      status: "pending",
      received_at: new Date().toISOString(),
      source_channel: "email",
      source_mailbox: metadata.mailbox,
      source_from: metadata.from,
      source_subject: metadata.subject,
      source_attachment: metadata.attachmentFilename,
      source_gmail_id: metadata.gmailMessageId,
      proposal_action: "create_node",
      proposal_target_type: "Costs",
      proposal_values: {
        vendor: extraction.vendor,
        category: extraction.category,
        monthly_amount: extraction.monthly_amount,
        currency: extraction.currency,
        start_date: extraction.start_date,
        term_months: extraction.term_months,
        notice_period: extraction.notice_period,
        cancellation: extraction.cancellation,
      },
      proposal_edges: [
        { from: "proposed_cost", to: "cost_center:ga", label: "belongs to" },
      ],
      reasoning_summary: extraction.reasoning,
      reasoning_confidence: extraction.confidence,
      reasoning_evidence: extraction.evidence,
      policy_triggered: policyDecision.policy ? [policyDecision.policy.id] : [],
      policy_satisfied: policyDecision.decision === "auto_allow",
      policy_message:
        policyDecision.decision === "require_approval"
          ? `Monthly amount €${extraction.monthly_amount.toLocaleString("de-DE")} exceeds threshold. Finance approval required.`
          : policyDecision.decision === "auto_deny"
            ? `Monthly amount €${extraction.monthly_amount.toLocaleString("de-DE")} exceeds threshold. Finance approval required.`
            : "All policies satisfied.",
      impact_monthly_burn_delta: impact.monthlyBurnDelta,
      impact_annual_cost_delta: impact.annualCostDelta,
      impact_runway_months_delta: impact.runwayMonthsDelta,
      impact_forecast_after: impact.forecastAfter,
    };

    return draft;
  } catch (error) {
    console.error("Agent pipeline failed:", error);
    return null;
  }
}

async function pdfToImages(pdfBuffer: Buffer): Promise<string[]> {
  const { pdf } = await import("pdf-to-img");
  const pages: string[] = [];
  for await (const page of await pdf(pdfBuffer, { scale: 2 })) {
    pages.push(Buffer.from(page).toString("base64"));
  }
  return pages;
}

async function extractFromPDF(
  pdfBuffer: Buffer,
  metadata: EmailMetadata
): Promise<ExtractionResult> {
  const openai = getOpenAI();
  const pageImages = await pdfToImages(pdfBuffer);

  const imageContent = pageImages.map((b64) => ({
    type: "image_url" as const,
    image_url: { url: `data:image/png;base64,${b64}` },
  }));

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a document extraction agent. Extract structured financial data from the attached document pages.
Return JSON with these fields:
- vendor (string): the company or person providing the service
- monthly_amount (number): the monthly cost in EUR
- currency (string): always "EUR"
- start_date (string): ISO date format YYYY-MM-DD
- term_months (number): contract duration in months
- notice_period (string): e.g. "3 months"
- cancellation (string): cancellation terms
- category (string): one of "facilities", "software", "personnel", "services"
- confidence (number): 0-1, your confidence in the extraction
- reasoning (string): 2-3 sentence explanation of your classification
- evidence (array): array of {field, clause, text} with the exact text and clause reference supporting each extracted field`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Email from: ${metadata.from}\nSubject: ${metadata.subject}\nAttachment: ${metadata.attachmentFilename}\n\nPlease extract the financial terms from this document.`,
          },
          ...imageContent,
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from extraction model");

  return JSON.parse(content) as ExtractionResult;
}

function computeImpact(
  monthlyAmount: number,
  startDate: string
): {
  monthlyBurnDelta: number;
  annualCostDelta: number;
  runwayMonthsDelta: number;
  forecastAfter: ForecastSeries;
} {
  const baseForecast = seedForecastBase();
  const startMonth = new Date(startDate);

  const forecastAfter: ForecastSeries = {
    months: [...baseForecast.months],
    values: baseForecast.values.map((val, i) => {
      // Parse month label like "Jul 26" to a comparable date
      const parts = baseForecast.months[i].split(" ");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthIdx = monthNames.indexOf(parts[0]);
      const year = 2000 + parseInt(parts[1]);
      const forecastDate = new Date(year, monthIdx);

      if (forecastDate >= startMonth) {
        return val + monthlyAmount;
      }
      return val;
    }),
  };

  // Runway impact: current cash / (burn + delta) vs current cash / burn
  const currentBurn = baseForecast.values[0];
  const cashOnHand = 485_000; // from seed data bank_account:main
  const currentRunway = cashOnHand / currentBurn;
  const newRunway = cashOnHand / (currentBurn + monthlyAmount);

  return {
    monthlyBurnDelta: -monthlyAmount,
    annualCostDelta: -(monthlyAmount * 12),
    runwayMonthsDelta: Math.round((newRunway - currentRunway) * 10) / 10,
    forecastAfter,
  };
}
