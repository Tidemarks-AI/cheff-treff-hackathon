import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Agent, setDefaultOpenAIKey } from "@openai/agents";
import type { AgentConfig } from "../../agents/shared.js";
import { getTools } from "../../tools.js";

const openAiApiKey = process.env.OPENAI_API_KEY;
const defaultAgentModel = "gpt-5.4-mini";

function resolveAgentModel(config: AgentConfig) {
  return config.model ?? defaultAgentModel;
}

if (openAiApiKey && !openAiApiKey.includes("your-key")) {
  setDefaultOpenAIKey(openAiApiKey);
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const agentsDir = path.resolve(currentDir, "../../agents");

let cachedRegistryPromise:
  | Promise<{ agentConfigs: AgentConfig[]; agents: Map<string, Agent> }>
  | null = null;

async function loadAgentConfigs() {
  const entries = await readdir(agentsDir, { withFileTypes: true });

  const configs = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const configModuleUrl = pathToFileURL(
          path.join(agentsDir, entry.name, "config.js")
        ).href;
        const configModule = (await import(configModuleUrl)) as {
          default: AgentConfig;
        };

        return configModule.default;
      })
  );

  return configs.sort((a, b) => a.name.localeCompare(b.name));
}

async function loadRegistry() {
  const agentConfigs = await loadAgentConfigs();

  const agents = new Map(
    agentConfigs.map((config) => [
      config.id,
      new Agent({
        name: config.name,
        instructions: config.systemprompt,
        model: resolveAgentModel(config),
        tools: getTools(config.tools),
      }),
    ])
  );

  return { agentConfigs, agents };
}

async function getRegistry() {
  if (!cachedRegistryPromise) {
    cachedRegistryPromise = loadRegistry();
  }

  return cachedRegistryPromise;
}

export async function getAgentConfig(agentId: string): Promise<AgentConfig | undefined> {
  const { agentConfigs } = await getRegistry();
  return agentConfigs.find((config) => config.id === agentId);
}

export async function getAgent(agentId: string) {
  const { agents } = await getRegistry();
  return agents.get(agentId);
}

export async function listAgents() {
  const { agentConfigs } = await getRegistry();
  return agentConfigs.map((config) => ({
    id: config.id,
    name: config.name,
    description: config.description,
    model: resolveAgentModel(config),
    tools: config.tools,
  }));
}

export async function getDefaultAgentId() {
  const { agentConfigs } = await getRegistry();
  return agentConfigs[0]?.id;
}
