import { randomUUID } from "node:crypto";

export type PolicyOperator = "eq" | "neq" | "lt" | "lte" | "gt" | "gte" | "contains";
export type PolicyAction = "auto_allow" | "auto_deny";
export type PolicyConditionGroup = "all" | "any";

export type FunctionPolicyCondition = {
  id: string;
  field: string;
  operator: PolicyOperator;
  value: string | number | boolean;
};

export type FunctionPolicy = {
  id: string;
  toolName: string;
  action: PolicyAction;
  conditionGroup: PolicyConditionGroup;
  conditions: FunctionPolicyCondition[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FunctionPolicyDraftCondition = {
  field: string;
  operator: PolicyOperator;
  value: string | number | boolean;
};

export type FunctionPolicyDraft = {
  toolName: string;
  action?: PolicyAction;
  conditionGroup?: PolicyConditionGroup;
  conditions: FunctionPolicyDraftCondition[];
  enabled?: boolean;
};

export type ToolPolicyDecision = {
  decision: "auto_allow" | "auto_deny" | "require_approval";
  policy?: FunctionPolicy;
};

const policyStore = new Map<string, FunctionPolicy>();

function compareValues(
  actualValue: unknown,
  operator: PolicyOperator,
  expectedValue: string | number | boolean
) {
  switch (operator) {
    case "eq":
      return actualValue === expectedValue;
    case "neq":
      return actualValue !== expectedValue;
    case "lt":
      return typeof actualValue === "number" && typeof expectedValue === "number"
        ? actualValue < expectedValue
        : false;
    case "lte":
      return typeof actualValue === "number" && typeof expectedValue === "number"
        ? actualValue <= expectedValue
        : false;
    case "gt":
      return typeof actualValue === "number" && typeof expectedValue === "number"
        ? actualValue > expectedValue
        : false;
    case "gte":
      return typeof actualValue === "number" && typeof expectedValue === "number"
        ? actualValue >= expectedValue
        : false;
    case "contains":
      return typeof actualValue === "string" && typeof expectedValue === "string"
        ? actualValue.toLowerCase().includes(expectedValue.toLowerCase())
        : false;
  }
}

function createCondition(draft: FunctionPolicyDraftCondition): FunctionPolicyCondition {
  return {
    id: randomUUID(),
    field: draft.field,
    operator: draft.operator,
    value: draft.value,
  };
}

function matchesPolicy(policy: FunctionPolicy, input: Record<string, unknown>) {
  const evaluations = policy.conditions.map((condition) =>
    compareValues(input[condition.field], condition.operator, condition.value)
  );

  if (evaluations.length === 0) {
    return false;
  }

  return policy.conditionGroup === "all"
    ? evaluations.every(Boolean)
    : evaluations.some(Boolean);
}

export function listPolicies() {
  return [...policyStore.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getPolicy(policyId: string) {
  return policyStore.get(policyId);
}

export function createPolicy(draft: FunctionPolicyDraft) {
  const timestamp = new Date().toISOString();
  const policy: FunctionPolicy = {
    id: randomUUID(),
    toolName: draft.toolName,
    action: draft.action ?? "auto_allow",
    conditionGroup: draft.conditionGroup ?? "all",
    conditions: draft.conditions.map(createCondition),
    enabled: draft.enabled ?? true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  policyStore.set(policy.id, policy);
  return policy;
}

export function updatePolicy(policyId: string, draft: FunctionPolicyDraft) {
  const existingPolicy = policyStore.get(policyId);

  if (!existingPolicy) {
    return undefined;
  }

  const updatedPolicy: FunctionPolicy = {
    ...existingPolicy,
    toolName: draft.toolName,
    action: draft.action ?? existingPolicy.action,
    conditionGroup: draft.conditionGroup ?? existingPolicy.conditionGroup,
    conditions: draft.conditions.map(createCondition),
    enabled: draft.enabled ?? existingPolicy.enabled,
    updatedAt: new Date().toISOString(),
  };

  policyStore.set(policyId, updatedPolicy);
  return updatedPolicy;
}

export function deletePolicy(policyId: string) {
  return policyStore.delete(policyId);
}

export function getToolPolicyDecision(toolName: string, input: unknown): ToolPolicyDecision {
  if (!input || typeof input !== "object") {
    return { decision: "require_approval" };
  }

  const matchingPolicy = [...policyStore.values()].find((policy) => {
    if (!policy.enabled || policy.toolName !== toolName) {
      return false;
    }

    return matchesPolicy(policy, input as Record<string, unknown>);
  });

  if (!matchingPolicy) {
    return { decision: "require_approval" };
  }

  return {
    decision: matchingPolicy.action,
    policy: matchingPolicy,
  };
}
