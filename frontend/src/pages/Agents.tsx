import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  acceptPendingApproval,
  createPolicy,
  deletePolicy,
  denyPendingApproval,
  listFunctions,
  listAgents,
  listPendingApprovals,
  listPolicies,
  runAgent,
  updatePolicy,
  type AgentListItem,
  type FunctionDefinition,
  type FunctionPolicy,
  type PendingApproval,
  type PolicyAction,
  type PolicyConditionGroup,
  type PolicyOperator,
} from "@/lib/api"

type PolicyConditionForm = {
  id: string
  field: string
  operator: PolicyOperator
  value: string
}

type PolicyFormState = {
  action: PolicyAction
  conditionGroup: PolicyConditionGroup
  conditions: PolicyConditionForm[]
  enabled: boolean
}

const operatorLabels: Record<PolicyOperator, string> = {
  eq: "Equals",
  neq: "Does not equal",
  lt: "Less than",
  lte: "Less than or equal",
  gt: "Greater than",
  gte: "Greater than or equal",
  contains: "Contains",
}

const actionLabels: Record<PolicyAction, string> = {
  auto_allow: "Auto allow",
  auto_deny: "Auto deny",
}

const conditionGroupLabels: Record<PolicyConditionGroup, string> = {
  all: "All conditions match",
  any: "Any condition matches",
}

const operatorOptionsByType: Record<"string" | "number" | "boolean", PolicyOperator[]> = {
  string: ["eq", "neq", "contains"],
  number: ["eq", "neq", "lt", "lte", "gt", "gte"],
  boolean: ["eq", "neq"],
}

function createConditionId() {
  return `condition-${Math.random().toString(36).slice(2, 10)}`
}

function formatParameters(parameters: unknown) {
  return JSON.stringify(parameters, null, 2)
}

function getFieldDefinition(functionDefinition: FunctionDefinition, fieldName: string) {
  return functionDefinition.policyFields.find((field) => field.name === fieldName)
}

function getOperatorOptions(
  functionDefinition: FunctionDefinition,
  fieldName: string
): PolicyOperator[] {
  const fieldDefinition = getFieldDefinition(functionDefinition, fieldName)
  return fieldDefinition ? operatorOptionsByType[fieldDefinition.type] : ["eq"]
}

function createDefaultCondition(functionDefinition: FunctionDefinition): PolicyConditionForm {
  const firstField = functionDefinition.policyFields[0]
  const firstOperator = firstField ? operatorOptionsByType[firstField.type][0] : "eq"

  return {
    id: createConditionId(),
    field: firstField?.name ?? "",
    operator: firstOperator,
    value: "",
  }
}

function createDefaultPolicyForm(functionDefinition: FunctionDefinition): PolicyFormState {
  return {
    action: "auto_allow",
    conditionGroup: "all",
    conditions: [createDefaultCondition(functionDefinition)],
    enabled: true,
  }
}

function toPolicyFormState(policy: FunctionPolicy): PolicyFormState {
  return {
    action: policy.action,
    conditionGroup: policy.conditionGroup,
    conditions: policy.conditions.map((condition) => ({
      id: condition.id,
      field: condition.field,
      operator: condition.operator,
      value: String(condition.value),
    })),
    enabled: policy.enabled,
  }
}

function buildPolicyPayload(form: PolicyFormState, functionDefinition: FunctionDefinition) {
  const conditions = form.conditions
    .filter((condition) => condition.field)
    .map((condition) => {
      const validOperators = getOperatorOptions(functionDefinition, condition.field)
      const operator = validOperators.includes(condition.operator)
        ? condition.operator
        : validOperators[0]

      return {
        field: condition.field,
        operator,
        value: condition.value,
      }
    })

  return {
    toolName: functionDefinition.name,
    action: form.action,
    conditionGroup: form.conditionGroup,
    conditions,
    enabled: form.enabled,
  }
}

export default function Agents() {
  const [agents, setAgents] = useState<AgentListItem[]>([])
  const [functions, setFunctions] = useState<FunctionDefinition[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState("")
  const [message, setMessage] = useState("Create a simple 30-day founder operating plan.")
  const [reply, setReply] = useState("")
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
  const [policies, setPolicies] = useState<FunctionPolicy[]>([])
  const [newPolicyForms, setNewPolicyForms] = useState<Record<string, PolicyFormState>>({})
  const [policyEditForms, setPolicyEditForms] = useState<Record<string, PolicyFormState>>({})
  const [error, setError] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [resolvingApprovalId, setResolvingApprovalId] = useState<string | null>(null)
  const [savingPolicyKey, setSavingPolicyKey] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    void Promise.all([listAgents(), listPendingApprovals(), listFunctions(), listPolicies()])
      .then(([{ agents: nextAgents }, { approvals }, { functions: nextFunctions }, { policies: nextPolicies }]) => {
        if (!mountedRef.current) return

        setAgents(nextAgents)
        setPendingApprovals(approvals)
        setFunctions(nextFunctions)
        setPolicies(nextPolicies)
        setNewPolicyForms(
          Object.fromEntries(
            nextFunctions.map((functionDefinition) => [
              functionDefinition.name,
              createDefaultPolicyForm(functionDefinition),
            ])
          )
        )
        setPolicyEditForms(
          Object.fromEntries(nextPolicies.map((policy) => [policy.id, toPolicyFormState(policy)]))
        )
        setSelectedAgentId((currentAgentId) => currentAgentId || nextAgents[0]?.id || "")
      })
      .catch((nextError: Error) => {
        if (!mountedRef.current) return
        setError(nextError.message)
      })

    return () => {
      mountedRef.current = false
    }
  }, [])

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId)

  function handleAgentChange(value: string | null) {
    setSelectedAgentId(value ?? "")
  }

  function handleSubmit() {
    if (!selectedAgentId || !message.trim() || isRunning) return

    setError("")
    setReply("")
    setIsRunning(true)

    void runAgent(selectedAgentId, message)
      .then((result) => {
        if (result.status === "completed") {
          setReply(result.reply)
          return
        }

        setPendingApprovals((currentApprovals) => {
          const existingApprovalIds = new Set(currentApprovals.map((approval) => approval.id))

          return [
            ...currentApprovals,
            ...result.approvals.filter((approval) => !existingApprovalIds.has(approval.id)),
          ]
        })
        setReply("Approval required before the agent can continue.")
      })
      .catch((nextError: Error) => {
        setError(nextError.message)
      })
      .finally(() => {
        setIsRunning(false)
      })
  }

  function handleResolveApproval(approvalId: string, decision: "allow" | "deny") {
    if (resolvingApprovalId) return

    setError("")
    setResolvingApprovalId(approvalId)

    const request =
      decision === "allow"
        ? acceptPendingApproval(approvalId)
        : denyPendingApproval(approvalId)

    void request
      .then((result) => {
        setPendingApprovals((currentApprovals) =>
          currentApprovals.filter((approval) => approval.id !== approvalId)
        )

        if (result.status === "completed") {
          setReply(result.reply)
          return
        }

        setPendingApprovals((currentApprovals) => [...currentApprovals, ...result.approvals])
        setReply(
          decision === "allow"
            ? "Another approval is required before the agent can continue."
            : "The request was denied, and the agent is continuing without that function call."
        )
      })
      .catch((nextError: Error) => {
        setError(nextError.message)
      })
      .finally(() => {
        setResolvingApprovalId(null)
      })
  }

  function updatePolicyForm(
    scope: "new" | "existing",
    key: string,
    functionDefinition: FunctionDefinition,
    updater: (currentForm: PolicyFormState) => PolicyFormState
  ) {
    const setState = scope === "new" ? setNewPolicyForms : setPolicyEditForms
    setState((currentState) => ({
      ...currentState,
      [key]: updater(currentState[key] ?? createDefaultPolicyForm(functionDefinition)),
    }))
  }

  function handlePolicyMetaChange(
    scope: "new" | "existing",
    key: string,
    functionDefinition: FunctionDefinition,
    field: "action" | "conditionGroup" | "enabled",
    value: PolicyAction | PolicyConditionGroup | boolean
  ) {
    updatePolicyForm(scope, key, functionDefinition, (currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  function handleConditionChange(
    scope: "new" | "existing",
    key: string,
    functionDefinition: FunctionDefinition,
    conditionId: string,
    field: "field" | "operator" | "value",
    value: string
  ) {
    updatePolicyForm(scope, key, functionDefinition, (currentForm) => ({
      ...currentForm,
      conditions: currentForm.conditions.map((condition) => {
        if (condition.id !== conditionId) {
          return condition
        }

        if (field === "field") {
          return {
            ...condition,
            field: value,
            operator: getOperatorOptions(functionDefinition, value)[0],
          }
        }

        if (field === "operator") {
          return {
            ...condition,
            operator: value as PolicyOperator,
          }
        }

        return {
          ...condition,
          value,
        }
      }),
    }))
  }

  function handleAddCondition(
    scope: "new" | "existing",
    key: string,
    functionDefinition: FunctionDefinition
  ) {
    updatePolicyForm(scope, key, functionDefinition, (currentForm) => ({
      ...currentForm,
      conditions: [...currentForm.conditions, createDefaultCondition(functionDefinition)],
    }))
  }

  function handleRemoveCondition(
    scope: "new" | "existing",
    key: string,
    functionDefinition: FunctionDefinition,
    conditionId: string
  ) {
    updatePolicyForm(scope, key, functionDefinition, (currentForm) => ({
      ...currentForm,
      conditions:
        currentForm.conditions.length > 1
          ? currentForm.conditions.filter((condition) => condition.id !== conditionId)
          : currentForm.conditions,
    }))
  }

  function handleCreatePolicy(functionDefinition: FunctionDefinition) {
    const form = newPolicyForms[functionDefinition.name] ?? createDefaultPolicyForm(functionDefinition)
    const payload = buildPolicyPayload(form, functionDefinition)

    setError("")
    setSavingPolicyKey(`new:${functionDefinition.name}`)

    void createPolicy(payload)
      .then(({ policy }) => {
        setPolicies((currentPolicies) => [...currentPolicies, policy])
        setPolicyEditForms((currentForms) => ({
          ...currentForms,
          [policy.id]: toPolicyFormState(policy),
        }))
        setNewPolicyForms((currentForms) => ({
          ...currentForms,
          [functionDefinition.name]: createDefaultPolicyForm(functionDefinition),
        }))
      })
      .catch((nextError: Error) => {
        setError(nextError.message)
      })
      .finally(() => {
        setSavingPolicyKey(null)
      })
  }

  function handleUpdatePolicy(policy: FunctionPolicy, functionDefinition: FunctionDefinition) {
    const form = policyEditForms[policy.id] ?? toPolicyFormState(policy)
    const payload = buildPolicyPayload(form, functionDefinition)

    setError("")
    setSavingPolicyKey(`edit:${policy.id}`)

    void updatePolicy(policy.id, payload)
      .then(({ policy: updatedPolicy }) => {
        setPolicies((currentPolicies) =>
          currentPolicies.map((currentPolicy) =>
            currentPolicy.id === updatedPolicy.id ? updatedPolicy : currentPolicy
          )
        )
        setPolicyEditForms((currentForms) => ({
          ...currentForms,
          [updatedPolicy.id]: toPolicyFormState(updatedPolicy),
        }))
      })
      .catch((nextError: Error) => {
        setError(nextError.message)
      })
      .finally(() => {
        setSavingPolicyKey(null)
      })
  }

  function handleDeletePolicy(policyId: string) {
    setError("")
    setSavingPolicyKey(`delete:${policyId}`)

    void deletePolicy(policyId)
      .then(() => {
        setPolicies((currentPolicies) =>
          currentPolicies.filter((policy) => policy.id !== policyId)
        )
        setPolicyEditForms((currentForms) => {
          const nextForms = { ...currentForms }
          delete nextForms[policyId]
          return nextForms
        })
      })
      .catch((nextError: Error) => {
        setError(nextError.message)
      })
      .finally(() => {
        setSavingPolicyKey(null)
      })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agents Workspace</h1>
        <p className="text-muted-foreground">
          Run backend OpenAI agents directly from the frontend.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent Runner</CardTitle>
          <CardDescription>
            Select an agent, send a prompt, and approve mutating tool calls before they run.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <div className="space-y-2">
              <div className="text-sm font-medium">Agent</div>
              <Select value={selectedAgentId || null} onValueChange={handleAgentChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAgent ? (
                <div className="text-sm text-muted-foreground">
                  {selectedAgent.description}
                  <br />
                  Model: {selectedAgent.model}
                  <br />
                  Tools: {selectedAgent.tools.join(", ")}
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ask an agent something useful"
                disabled={isRunning}
              />
              <div className="flex items-center gap-3">
                <Button disabled={isRunning || !selectedAgentId} onClick={handleSubmit}>
                  {isRunning ? "Running..." : "Run agent"}
                </Button>
                {error ? <span className="text-sm text-destructive">{error}</span> : null}
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                {reply || "The agent response will appear here."}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>
            Mutating functions stay here until a human explicitly approves them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No pending approvals.
            </div>
          ) : (
            pendingApprovals.map((approval) => (
              <div key={approval.id} className="space-y-3 rounded-lg border border-border p-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium">{approval.toolName}</div>
                  <div className="text-sm text-muted-foreground">{approval.description}</div>
                  <div className="text-xs text-muted-foreground">
                    Agent: {approval.agentId} · Created: {new Date(approval.createdAt).toLocaleString()}
                  </div>
                </div>
                <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 text-xs whitespace-pre-wrap">
                  {formatParameters(approval.parameters)}
                </pre>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleResolveApproval(approval.id, "allow")}
                    disabled={resolvingApprovalId !== null}
                  >
                    {resolvingApprovalId === approval.id ? "Resolving..." : "Accept"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleResolveApproval(approval.id, "deny")}
                    disabled={resolvingApprovalId !== null}
                  >
                    {resolvingApprovalId === approval.id ? "Resolving..." : "Deny"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Function Policies</CardTitle>
          <CardDescription>
            Create multi-condition auto-allow or auto-deny rules for mutating backend functions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {functions.map((functionDefinition) => {
            const functionPolicies = policies.filter(
              (policy) => policy.toolName === functionDefinition.name
            )
            const newPolicyForm =
              newPolicyForms[functionDefinition.name] ?? createDefaultPolicyForm(functionDefinition)

            return (
              <div
                key={functionDefinition.name}
                className="space-y-4 rounded-lg border border-border p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">{functionDefinition.name}</div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {functionDefinition.access === "mutating" ? "Mutating" : "Read only"}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">{functionDefinition.description}</div>
                  {functionDefinition.access === "mutating" ? (
                    <div className="text-xs text-muted-foreground">
                      Approval step: {functionDefinition.approvalDescription}
                    </div>
                  ) : null}
                </div>

                {functionDefinition.access !== "mutating" ? (
                  <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                    This function is read-only, so policy-based approval rules are not needed.
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {functionPolicies.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                          No policies yet.
                        </div>
                      ) : (
                        functionPolicies.map((policy) => {
                          const editForm = policyEditForms[policy.id] ?? toPolicyFormState(policy)

                          return (
                            <div
                              key={policy.id}
                              className="space-y-3 rounded-md border border-border bg-muted/20 p-3"
                            >
                              <div className="grid gap-3 md:grid-cols-3">
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-muted-foreground">Action</div>
                                  <Select
                                    value={editForm.action}
                                    onValueChange={(value) =>
                                      handlePolicyMetaChange(
                                        "existing",
                                        policy.id,
                                        functionDefinition,
                                        "action",
                                        (value ?? "auto_allow") as PolicyAction
                                      )
                                    }
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select action" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(Object.keys(actionLabels) as PolicyAction[]).map((action) => (
                                        <SelectItem key={action} value={action}>
                                          {actionLabels[action]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-muted-foreground">Match mode</div>
                                  <Select
                                    value={editForm.conditionGroup}
                                    onValueChange={(value) =>
                                      handlePolicyMetaChange(
                                        "existing",
                                        policy.id,
                                        functionDefinition,
                                        "conditionGroup",
                                        (value ?? "all") as PolicyConditionGroup
                                      )
                                    }
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select match mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(Object.keys(conditionGroupLabels) as PolicyConditionGroup[]).map(
                                        (conditionGroup) => (
                                          <SelectItem key={conditionGroup} value={conditionGroup}>
                                            {conditionGroupLabels[conditionGroup]}
                                          </SelectItem>
                                        )
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-muted-foreground">State</div>
                                  <Select
                                    value={editForm.enabled ? "enabled" : "disabled"}
                                    onValueChange={(value) =>
                                      handlePolicyMetaChange(
                                        "existing",
                                        policy.id,
                                        functionDefinition,
                                        "enabled",
                                        value === "enabled"
                                      )
                                    }
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select state" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="enabled">Enabled</SelectItem>
                                      <SelectItem value="disabled">Disabled</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="space-y-3">
                                {editForm.conditions.map((condition, index) => {
                                  const operators = getOperatorOptions(
                                    functionDefinition,
                                    condition.field
                                  )

                                  return (
                                    <div
                                      key={condition.id}
                                      className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                                    >
                                      <div className="space-y-1">
                                        <div className="text-xs font-medium text-muted-foreground">
                                          Condition {index + 1} field
                                        </div>
                                        <Select
                                          value={condition.field}
                                          onValueChange={(value) =>
                                            handleConditionChange(
                                              "existing",
                                              policy.id,
                                              functionDefinition,
                                              condition.id,
                                              "field",
                                              value ?? ""
                                            )
                                          }
                                        >
                                          <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select field" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {functionDefinition.policyFields.map((field) => (
                                              <SelectItem key={field.name} value={field.name}>
                                                {field.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-xs font-medium text-muted-foreground">Operator</div>
                                        <Select
                                          value={condition.operator}
                                          onValueChange={(value) =>
                                            handleConditionChange(
                                              "existing",
                                              policy.id,
                                              functionDefinition,
                                              condition.id,
                                              "operator",
                                              value ?? "eq"
                                            )
                                          }
                                        >
                                          <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select operator" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {operators.map((operator) => (
                                              <SelectItem key={operator} value={operator}>
                                                {operatorLabels[operator]}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-xs font-medium text-muted-foreground">Value</div>
                                        <Input
                                          value={condition.value}
                                          onChange={(event) =>
                                            handleConditionChange(
                                              "existing",
                                              policy.id,
                                              functionDefinition,
                                              condition.id,
                                              "value",
                                              event.target.value
                                            )
                                          }
                                          placeholder="Policy value"
                                        />
                                      </div>
                                      <div className="flex items-end">
                                        <Button
                                          variant="outline"
                                          onClick={() =>
                                            handleRemoveCondition(
                                              "existing",
                                              policy.id,
                                              functionDefinition,
                                              condition.id
                                            )
                                          }
                                          disabled={editForm.conditions.length <= 1}
                                        >
                                          Remove
                                        </Button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() =>
                                    handleAddCondition("existing", policy.id, functionDefinition)
                                  }
                                  disabled={savingPolicyKey !== null}
                                >
                                  Add condition
                                </Button>
                                <Button
                                  onClick={() => handleUpdatePolicy(policy, functionDefinition)}
                                  disabled={savingPolicyKey !== null}
                                >
                                  {savingPolicyKey === `edit:${policy.id}` ? "Saving..." : "Save"}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => handleDeletePolicy(policy.id)}
                                  disabled={savingPolicyKey !== null}
                                >
                                  {savingPolicyKey === `delete:${policy.id}` ? "Deleting..." : "Delete"}
                                </Button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                    <div className="space-y-3 rounded-md border border-dashed border-border p-3">
                      <div className="text-sm font-medium">Add Policy</div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Action</div>
                          <Select
                            value={newPolicyForm.action}
                            onValueChange={(value) =>
                              handlePolicyMetaChange(
                                "new",
                                functionDefinition.name,
                                functionDefinition,
                                "action",
                                (value ?? "auto_allow") as PolicyAction
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select action" />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(actionLabels) as PolicyAction[]).map((action) => (
                                <SelectItem key={action} value={action}>
                                  {actionLabels[action]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Match mode</div>
                          <Select
                            value={newPolicyForm.conditionGroup}
                            onValueChange={(value) =>
                              handlePolicyMetaChange(
                                "new",
                                functionDefinition.name,
                                functionDefinition,
                                "conditionGroup",
                                (value ?? "all") as PolicyConditionGroup
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select match mode" />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(conditionGroupLabels) as PolicyConditionGroup[]).map(
                                (conditionGroup) => (
                                  <SelectItem key={conditionGroup} value={conditionGroup}>
                                    {conditionGroupLabels[conditionGroup]}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">State</div>
                          <Select
                            value={newPolicyForm.enabled ? "enabled" : "disabled"}
                            onValueChange={(value) =>
                              handlePolicyMetaChange(
                                "new",
                                functionDefinition.name,
                                functionDefinition,
                                "enabled",
                                value === "enabled"
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="enabled">Enabled</SelectItem>
                              <SelectItem value="disabled">Disabled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {newPolicyForm.conditions.map((condition, index) => {
                          const operators = getOperatorOptions(functionDefinition, condition.field)

                          return (
                            <div
                              key={condition.id}
                              className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                            >
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-muted-foreground">
                                  Condition {index + 1} field
                                </div>
                                <Select
                                  value={condition.field}
                                  onValueChange={(value) =>
                                    handleConditionChange(
                                      "new",
                                      functionDefinition.name,
                                      functionDefinition,
                                      condition.id,
                                      "field",
                                      value ?? ""
                                    )
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select field" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {functionDefinition.policyFields.map((field) => (
                                      <SelectItem key={field.name} value={field.name}>
                                        {field.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-muted-foreground">Operator</div>
                                <Select
                                  value={condition.operator}
                                  onValueChange={(value) =>
                                    handleConditionChange(
                                      "new",
                                      functionDefinition.name,
                                      functionDefinition,
                                      condition.id,
                                      "operator",
                                      value ?? "eq"
                                    )
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select operator" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {operators.map((operator) => (
                                      <SelectItem key={operator} value={operator}>
                                        {operatorLabels[operator]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-muted-foreground">Value</div>
                                <Input
                                  value={condition.value}
                                  onChange={(event) =>
                                    handleConditionChange(
                                      "new",
                                      functionDefinition.name,
                                      functionDefinition,
                                      condition.id,
                                      "value",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Policy value"
                                />
                              </div>
                              <div className="flex items-end">
                                <Button
                                  variant="outline"
                                  onClick={() =>
                                    handleRemoveCondition(
                                      "new",
                                      functionDefinition.name,
                                      functionDefinition,
                                      condition.id
                                    )
                                  }
                                  disabled={newPolicyForm.conditions.length <= 1}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          variant="outline"
                          onClick={() => handleAddCondition("new", functionDefinition.name, functionDefinition)}
                          disabled={savingPolicyKey !== null}
                        >
                          Add condition
                        </Button>
                        <Button
                          onClick={() => handleCreatePolicy(functionDefinition)}
                          disabled={savingPolicyKey !== null || newPolicyForm.conditions.length === 0}
                        >
                          {savingPolicyKey === `new:${functionDefinition.name}` ? "Creating..." : "Add policy"}
                        </Button>
                        <div className="text-xs text-muted-foreground">
                          Matching requests can now be auto-allowed or auto-denied.
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
