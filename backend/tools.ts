import { tool, type Tool } from "@openai/agents";
import { z } from "zod";
import { getSupabase } from "./src/lib/supabase.js";

export type ToolAccess = "read_only" | "mutating";

type ToolDefinition<TTool extends Tool = Tool> = {
  tool: TTool;
  access: ToolAccess;
  approvalDescription: string;
};

function defineTool({
  access,
  approvalDescription,
  ...options
}: Parameters<typeof tool>[0] & {
  access: ToolAccess;
  approvalDescription?: string;
}) {
  return {
    tool: tool({
      ...options,
      needsApproval: access === "mutating",
    } as Parameters<typeof tool>[0]),
    access,
    approvalDescription: approvalDescription ?? options.description,
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

export const toolRegistry = {
  currentDate,
  startupChecklist,
  testDatabase,
  simulateBudgetUpdate,
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
