import type { ToolName } from "../tools.js";

export type AgentConfig = {
  id: string;
  name: string;
  description: string;
  systemprompt: string;
  model?: string;
  tools: ToolName[];
};
