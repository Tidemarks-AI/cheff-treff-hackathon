import { Agent } from "@openai/agents";

export const assistantAgent = new Agent({
  name: "Assistant",
  instructions: "You are a helpful assistant. Be concise.",
  model: "gpt-4o-mini",
});
