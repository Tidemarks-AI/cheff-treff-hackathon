import { tool, type Tool } from "@openai/agents";
import { z } from "zod";
import { getSupabase } from "./src/lib/supabase.js";

const currentDate = tool({
  name: "currentDate",
  description: "Returns the current date and time in ISO format.",
  parameters: z.object({}),
  execute: async () => ({ now: new Date().toISOString() }),
});

const startupChecklist = tool({
  name: "startupChecklist",
  description: "Returns a short checklist for early-stage startup operations.",
  parameters: z.object({
    stage: z
      .enum(["idea", "mvp", "growth"])
      .default("idea")
      .describe("The startup stage to tailor the checklist to."),
  }),
  execute: async ({ stage }) => {
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

const testDatabase = tool({
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

export const toolRegistry = {
  currentDate,
  startupChecklist,
  testDatabase,
} satisfies Record<string, Tool>;

export type ToolName = keyof typeof toolRegistry;

export function getTools(toolNames: ToolName[]) {
  return toolNames.map((toolName) => toolRegistry[toolName]);
}

export function listTools() {
  return Object.keys(toolRegistry) as ToolName[];
}
