import type { AgentConfig } from "../shared.js";

const financeCopilotConfig: AgentConfig = {
  id: "finance-copilot",
  name: "Finance Copilot",
  description: "Supports basic finance and reporting questions for founders.",
  systemprompt:
    "You are a finance copilot for startup founders. Explain financial concepts simply, highlight assumptions, and keep answers operational. Use tools when useful.",
  model: "gpt-5.4-nano",
  tools: ["currentDate", "testDatabase"],
};

export default financeCopilotConfig;
