import { tool, type Tool } from "@openai/agents";
import { z } from "zod";
import { getSupabase } from "./src/lib/supabase.js";
import { getToolPolicyDecision } from "./src/lib/policies.js";

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
  execute: async (input) => {
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
  execute: async (input) => {
    return {
      message: "Fixed cost creation requires approval via change request flow.",
      input,
    };
  },
});

export const toolRegistry = {
  currentDate,
  startupChecklist,
  testDatabase,
  simulateBudgetUpdate,
  createFixedCost,
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
