import { tool, type Tool } from "@openai/agents";
import { z } from "zod";
import { getSupabase } from "./src/lib/supabase.js";
import { getToolPolicyDecision } from "./src/lib/policies.js";
import { getCompanyDB } from "./src/lib/surrealdb.js";
import { seedForecastBase } from "./src/lib/fixtures.js";

export type ToolAccess = "read_only" | "mutating";
export type PolicyFieldType = "string" | "number" | "boolean";

export type ToolPolicyFieldDefinition = {
  name: string;
  label: string;
  type: PolicyFieldType;
  description?: string;
};

type ToolDefinition<TTool extends Tool = Tool> = {
  tool: TTool;
  access: ToolAccess;
  approvalDescription: string;
  name: string;
  description: string;
  policyFields: ToolPolicyFieldDefinition[];
};

function defineTool({
  access,
  approvalDescription,
  policyFields = [],
  ...options
}: Parameters<typeof tool>[0] & {
  access: ToolAccess;
  approvalDescription?: string;
  policyFields?: ToolPolicyFieldDefinition[];
}) {
  if (!options.name) {
    throw new Error("All tools must define a name");
  }

  const originalExecute = options.execute;

  return {
    tool: tool({
      ...options,
      needsApproval: async (_runContext, input) =>
        access === "mutating" &&
        getToolPolicyDecision(options.name!, input).decision === "require_approval",
      execute: async (input, context, details) => {
        if (access === "mutating") {
          const policyDecision = getToolPolicyDecision(options.name!, input);

          if (policyDecision.decision === "auto_deny") {
            return {
              denied: true,
              message: `Execution of ${options.name} was blocked by policy.`,
              policyId: policyDecision.policy?.id,
              action: policyDecision.decision,
            };
          }
        }

        return originalExecute(input as never, context, details as never);
      },
    } as Parameters<typeof tool>[0]),
    access,
    name: options.name,
    description: options.description,
    approvalDescription: approvalDescription ?? options.description,
    policyFields,
  } satisfies ToolDefinition;
}

const currentDate = defineTool({
  access: "read_only",
  name: "currentDate",
  description: "Returns the current date and time in ISO format.",
  parameters: z.object({}),
  execute: async () => ({ now: new Date().toISOString() }),
});

const startupChecklist = defineTool({
  access: "read_only",
  name: "startupChecklist",
  description: "Returns a short checklist for early-stage startup operations.",
  parameters: z.object({
    stage: z
      .enum(["idea", "mvp", "growth"])
      .default("idea")
      .describe("The startup stage to tailor the checklist to."),
  }),
  execute: async (input) => {
    const { stage } = input as { stage: "idea" | "mvp" | "growth" };
    const checklists = {
      idea: [
        "Validate the problem with at least 10 target users.",
        "Define a clear customer segment and core use case.",
        "Draft the simplest possible MVP scope.",
      ],
      mvp: [
        "Track activation and retention for the first cohort.",
        "Document pricing hypotheses and customer objections.",
        "Set a weekly product and customer feedback loop.",
      ],
      growth: [
        "Review conversion by channel and customer segment.",
        "Track runway, burn, and hiring plans monthly.",
        "Standardize reporting for investors and internal planning.",
      ],
    } as const;

    return {
      stage,
      checklist: checklists[stage],
    };
  },
});

const testDatabase = defineTool({
  access: "read_only",
  name: "testDatabase",
  description: "Reads a sample row from the backend _test table.",
  parameters: z.object({}),
  execute: async () => {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("_test").select("*").limit(1);

    if (error) {
      throw new Error(error.message);
    }

    return { rows: data };
  },
});

const simulateBudgetUpdate = defineTool({
  access: "mutating",
  name: "simulateBudgetUpdate",
  description:
    "Simulates updating a startup budget without persisting any actual changes.",
  approvalDescription:
    "Simulates a budget update request for testing the human approval flow. No real data is changed.",
  policyFields: [
    {
      name: "companyName",
      label: "Company name",
      type: "string",
      description: "The company whose budget would be updated.",
    },
    {
      name: "amount",
      label: "Budget amount",
      type: "number",
      description: "The budget amount that would be applied.",
    },
    {
      name: "category",
      label: "Budget category",
      type: "string",
      description: "The budget category that would be updated.",
    },
  ],
  parameters: z.object({
    companyName: z.string().describe("The company whose budget would be updated."),
    amount: z.number().describe("The budget amount that would be applied."),
    category: z.string().describe("The budget category that would be updated."),
  }),
  execute: async (input: any) => {
    const { companyName, amount, category } = input as {
      companyName: string;
      amount: number;
      category: string;
    };

    return {
      simulated: true,
      message: `Simulated budget update for ${companyName}. No real changes were made.`,
      changeRequest: {
        companyName,
        amount,
        category,
      },
    };
  },
});

const createFixedCost = defineTool({
  access: "mutating",
  name: "createFixedCost",
  description:
    "Creates a new fixed cost entry in the financial ontology from an extracted document.",
  approvalDescription:
    "Proposes adding a new recurring fixed cost (e.g. office lease, SaaS subscription) to the company's financial ontology.",
  policyFields: [
    {
      name: "monthly_amount",
      label: "Monthly amount",
      type: "number",
      description: "The monthly cost amount in EUR.",
    },
    {
      name: "category",
      label: "Cost category",
      type: "string",
      description: "The cost category (e.g. facilities, software, personnel).",
    },
    {
      name: "term_months",
      label: "Contract term (months)",
      type: "number",
      description: "Duration of the contract in months.",
    },
  ],
  parameters: z.object({
    monthly_amount: z.number().describe("Monthly cost in EUR"),
    category: z.string().describe("Cost category"),
    term_months: z.number().describe("Contract duration in months"),
    vendor: z.string().describe("Vendor name"),
  }),
  execute: async (input: any) => {
    return {
      message: "Fixed cost creation requires approval via change request flow.",
      input,
    };
  },
});

const whatIfImpact = defineTool({
  access: "read_only",
  name: "whatIfImpact",
  description:
    "Evaluates a hypothetical scenario against the company's live financial data. " +
    "Queries SurrealDB for current cost centers, fixed expenses, burn rate, runway, " +
    "and bank balance, then computes the impact of a proposed monthly cost change. " +
    "Returns current financials, impact metrics, and a 12-month forecast comparison. " +
    "Use this for any 'what if' question that involves costs, hiring, or financial changes.",
  parameters: z.object({
    description: z.string().describe("Short description of the hypothetical scenario, e.g. 'New office in Berlin Mitte'"),
    monthly_amount: z.number().describe("Estimated monthly cost in EUR for this scenario"),
    category: z.string().describe("Cost category: facilities, software, personnel, or services"),
    start_date: z.string().nullable().describe("When the cost would start, ISO date YYYY-MM-DD. Defaults to next month if null."),
  }),
  execute: async (input) => {
    const { description, monthly_amount, category, start_date } = input as {
      description: string;
      monthly_amount: number;
      category: string;
      start_date: string | null;
    };

    const surrealDbName = process.env.DEFAULT_SURREAL_DB || "acme_startup_gmbh";
    const db = await getCompanyDB(surrealDbName);

    try {
      const [costCenters] = await db.query<[Array<Record<string, unknown>>]>("SELECT * FROM cost_center");
      const [fixedExpenses] = await db.query<[Array<Record<string, unknown>>]>("SELECT * FROM fixed_expense");
      const [budgetLines] = await db.query<[Array<Record<string, unknown>>]>("SELECT * FROM budget_line");
      const [costs] = await db.query<[Array<Record<string, unknown>>]>("SELECT * FROM costs");
      const [variances] = await db.query<[Array<Record<string, unknown>>]>("SELECT * FROM variance");
      const [bankAccounts] = await db.query<[Array<Record<string, unknown>>]>("SELECT * FROM bank_account");
      const [runwayCalcs] = await db.query<[Array<Record<string, unknown>>]>("SELECT * FROM runway_calculation");

      const totalFixedMonthly = (fixedExpenses ?? []).reduce(
        (sum, fe) => sum + Number(fe.amount ?? 0), 0
      );
      const bankBalance = (bankAccounts ?? [])[0]?.current_balance
        ? Number((bankAccounts ?? [])[0].current_balance)
        : null;
      const runway = (runwayCalcs ?? [])[0];
      const runwayMonths = runway ? Number(runway.months_remaining ?? 0) : null;
      const currentBurn = (runwayCalcs ?? [])[0]?.monthly_burn_rate
        ? Number((runwayCalcs ?? [])[0].monthly_burn_rate)
        : 85_000;
      const flaggedVariances = (variances ?? []).filter(
        (v) => v.status === "flagged"
      ).length;

      // Compute impact
      const baseForecast = seedForecastBase();
      const effectiveStart = start_date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      const startMonth = new Date(effectiveStart);

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const forecastAfter = {
        months: [...baseForecast.months],
        values: baseForecast.values.map((val, i) => {
          const parts = baseForecast.months[i].split(" ");
          const monthIdx = monthNames.indexOf(parts[0]);
          const year = 2000 + parseInt(parts[1]);
          const forecastDate = new Date(year, monthIdx);
          return forecastDate >= startMonth ? val + monthly_amount : val;
        }),
      };

      const cashOnHand = bankBalance ?? 485_000;
      const currentRunway = cashOnHand / currentBurn;
      const newRunway = cashOnHand / (currentBurn + monthly_amount);
      const runwayDelta = Math.round((newRunway - currentRunway) * 10) / 10;

      // Find matching cost center for category
      const matchingCC = (costCenters ?? []).find(
        (cc) => (cc.name as string)?.toLowerCase().includes(category.toLowerCase())
      );
      const existingInCategory = (fixedExpenses ?? []).filter(
        (fe) => matchingCC && String(fe.cost_center) === String(matchingCC.id)
      );

      return {
        type: "impact_preview",
        scenario: description,
        category,
        monthly_amount,
        start_date: effectiveStart,
        current_financials: {
          monthly_burn: currentBurn,
          total_fixed_monthly: totalFixedMonthly,
          bank_balance: cashOnHand,
          runway_months: runwayMonths ?? currentRunway,
          cost_centers: (costCenters ?? []).length,
          fixed_expenses: (fixedExpenses ?? []).length,
          flagged_variances: flaggedVariances,
        },
        impact: {
          monthly_burn_delta: monthly_amount,
          annual_cost_delta: monthly_amount * 12,
          runway_months_delta: runwayDelta,
          new_monthly_burn: currentBurn + monthly_amount,
          new_runway_months: Math.round(newRunway * 10) / 10,
        },
        forecast_after: forecastAfter,
        affected_cost_center: matchingCC ? { id: matchingCC.id, name: matchingCC.name } : null,
        existing_expenses_in_category: existingInCategory.map((fe) => ({
          name: fe.name,
          amount: Number(fe.amount),
          frequency: fe.frequency,
        })),
      };
    } finally {
      await db.close();
    }
  },
});

export const toolRegistry = {
  currentDate,
  startupChecklist,
  testDatabase,
  simulateBudgetUpdate,
  createFixedCost,
  whatIfImpact,
} satisfies Record<string, ToolDefinition>;

export type ToolName = keyof typeof toolRegistry;

export function getTools(toolNames: ToolName[]) {
  return toolNames.map((toolName) => toolRegistry[toolName].tool);
}

export function listTools() {
  return Object.keys(toolRegistry) as ToolName[];
}

export function getToolDefinition(toolName: ToolName) {
  return toolRegistry[toolName];
}

export function listFunctionDefinitions() {
  return (Object.keys(toolRegistry) as ToolName[]).map((toolName) => {
    const definition = toolRegistry[toolName];

    return {
      name: definition.name,
      access: definition.access,
      description: definition.description,
      approvalDescription: definition.approvalDescription,
      policyFields: definition.policyFields,
    };
  });
}
