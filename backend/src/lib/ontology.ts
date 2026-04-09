import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ForecastSeries } from "./change-requests.js";

const currentDir = dirname(fileURLToPath(import.meta.url));

type OntologyNode = {
  id: string;
  name: string;
  description: string;
  position: { x: number; y: number };
  categories: Array<{ id: string; name: string; color: string }>;
  properties: Array<{ key: string; type: string; value: unknown }>;
};

type OntologyEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
};

type Ontology = {
  board: {
    name: string;
    categories: Array<{ id: string; name: string; color: string }>;
  };
  nodes: OntologyNode[];
  edges: OntologyEdge[];
};

let cachedOntology: Ontology | null = null;

function loadOntology(): Ontology {
  if (cachedOntology) return cachedOntology;

  const filePath = resolve(currentDir, "../../../tmp/ontology.json");
  const raw = readFileSync(filePath, "utf-8");
  cachedOntology = JSON.parse(raw) as Ontology;
  return cachedOntology;
}

const FINANCE_NODE_IDS = new Set([
  "_Os_PpxE4iQzHlitCuWVp",   // Costs
  "ctr_CostCenter_001",       // Cost Center
  "v94vG0kRHYAk14UfdW2UR",   // Budget line
  "var_Variance_001",         // Variance
  "-kKWr_vLKOddNTAbcksZl",   // Financial forecast
  "bpZ6M5Le8j_Qs3XtYJrxn",   // Runway calculation
  "FFVaiY5a6mklZ4WoIHKx4",   // Bank Account
  "D_8M4eC1FMpMBNHxW9p6V",   // Revenue
]);

export function getFinanceSubgraph() {
  const ontology = loadOntology();

  const nodes = ontology.nodes.filter((n) => FINANCE_NODE_IDS.has(n.id));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = ontology.edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  return { nodes, edges };
}

export function getFullOntology() {
  return loadOntology();
}

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
