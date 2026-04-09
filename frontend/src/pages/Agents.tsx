import { useEffect, useRef, useState } from "react"
import { Bot, CheckCircle, XCircle, ShieldCheck, Inbox, Plus, Trash2, Loader2 } from "lucide-react"

import {
  Button, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea,
  Tabs, TabsList, TabsTrigger, TabsContent,
  EmptyState, ErrorBanner, StatusBadge,
  GlassCard, GlassCardHeader, GlassCardContent, Separator, Label,
} from "@startupos/ui"
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

// --- Subcomponents ---

function ConditionRow({
  condition,
  index,
  functionDefinition,
  scope,
  formKey,
  canRemove,
  onConditionChange,
  onRemove,
}: {
  condition: PolicyConditionForm
  index: number
  functionDefinition: FunctionDefinition
  scope: "new" | "existing"
  formKey: string
  canRemove: boolean
  onConditionChange: (
    scope: "new" | "existing",
    key: string,
    functionDefinition: FunctionDefinition,
    conditionId: string,
    field: "field" | "operator" | "value",
    value: string
  ) => void
  onRemove: (
    scope: "new" | "existing",
    key: string,
    functionDefinition: FunctionDefinition,
    conditionId: string
  ) => void
}) {
  const operators = getOperatorOptions(functionDefinition, condition.field)

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] items-end">
      <div className="space-y-1.5">
        <Label className="text-xs">Condition {index + 1} field</Label>
        <Select
          value={condition.field}
          onValueChange={(value) =>
            onConditionChange(scope, formKey, functionDefinition, condition.id, "field", value ?? "")
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
      <div className="space-y-1.5">
        <Label className="text-xs">Operator</Label>
        <Select
          value={condition.operator}
          onValueChange={(value) =>
            onConditionChange(scope, formKey, functionDefinition, condition.id, "operator", value ?? "eq")
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
      <div className="space-y-1.5">
        <Label className="text-xs">Value</Label>
        <Input
          value={condition.value}
          onChange={(event) =>
            onConditionChange(scope, formKey, functionDefinition, condition.id, "value", event.target.value)
          }
          placeholder="Policy value"
        />
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onRemove(scope, formKey, functionDefinition, condition.id)}
        disabled={!canRemove}
        title="Remove condition"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

function PolicyForm({
  form,
  scope,
  formKey,
  functionDefinition,
  savingPolicyKey,
  savingKeyPrefix,
  submitLabel,
  submitLoadingLabel,
  onMetaChange,
  onConditionChange,
  onAddCondition,
  onRemoveCondition,
  onSubmit,
  onDelete,
}: {
  form: PolicyFormState
  scope: "new" | "existing"
  formKey: string
  functionDefinition: FunctionDefinition
  savingPolicyKey: string | null
  savingKeyPrefix: string
  submitLabel: string
  submitLoadingLabel: string
  onMetaChange: (
    scope: "new" | "existing",
    key: string,
    functionDefinition: FunctionDefinition,
    field: "action" | "conditionGroup" | "enabled",
    value: PolicyAction | PolicyConditionGroup | boolean
  ) => void
  onConditionChange: (
    scope: "new" | "existing",
    key: string,
    functionDefinition: FunctionDefinition,
    conditionId: string,
    field: "field" | "operator" | "value",
    value: string
  ) => void
  onAddCondition: (scope: "new" | "existing", key: string, functionDefinition: FunctionDefinition) => void
  onRemoveCondition: (
    scope: "new" | "existing",
    key: string,
    functionDefinition: FunctionDefinition,
    conditionId: string
  ) => void
  onSubmit: () => void
  onDelete?: () => void
}) {
  const isSaving = savingPolicyKey === `${savingKeyPrefix}:${formKey}`
  const isDeleting = savingPolicyKey === `delete:${formKey}`

  return (
    <GlassCard>
      <GlassCardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Action</Label>
            <Select
              value={form.action}
              onValueChange={(value) =>
                onMetaChange(scope, formKey, functionDefinition, "action", (value ?? "auto_allow") as PolicyAction)
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
          <div className="space-y-1.5">
            <Label className="text-xs">Match mode</Label>
            <Select
              value={form.conditionGroup}
              onValueChange={(value) =>
                onMetaChange(scope, formKey, functionDefinition, "conditionGroup", (value ?? "all") as PolicyConditionGroup)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select match mode" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(conditionGroupLabels) as PolicyConditionGroup[]).map((cg) => (
                  <SelectItem key={cg} value={cg}>
                    {conditionGroupLabels[cg]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">State</Label>
            <Select
              value={form.enabled ? "enabled" : "disabled"}
              onValueChange={(value) =>
                onMetaChange(scope, formKey, functionDefinition, "enabled", value === "enabled")
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

        <Separator />

        <div className="space-y-3">
          {form.conditions.map((condition, index) => (
            <ConditionRow
              key={condition.id}
              condition={condition}
              index={index}
              functionDefinition={functionDefinition}
              scope={scope}
              formKey={formKey}
              canRemove={form.conditions.length > 1}
              onConditionChange={onConditionChange}
              onRemove={onRemoveCondition}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddCondition(scope, formKey, functionDefinition)}
            disabled={savingPolicyKey !== null}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add condition
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={savingPolicyKey !== null}
          >
            {isSaving ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{submitLoadingLabel}</>
            ) : (
              submitLabel
            )}
          </Button>
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              disabled={savingPolicyKey !== null}
              className="text-destructive hover:text-destructive"
            >
              {isDeleting ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Deleting...</>
              ) : (
                <><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete</>
              )}
            </Button>
          )}
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}

// --- Main Page ---

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
  const mutatingFunctions = functions.filter((f) => f.access === "mutating")
  const readOnlyFunctions = functions.filter((f) => f.access !== "mutating")

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
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <p className="text-muted-foreground">
          Manage agents, approve tool calls, and configure function policies.
        </p>
      </div>

      {error && <ErrorBanner message={error} />}

      <Tabs defaultValue="runner">
        <TabsList variant="line">
          <TabsTrigger value="runner">
            <Bot className="mr-1.5 h-4 w-4" />
            Agent Runner
          </TabsTrigger>
          <TabsTrigger value="approvals">
            <Inbox className="mr-1.5 h-4 w-4" />
            Approvals
            {pendingApprovals.length > 0 && (
              <Badge variant="destructive" className="ml-1.5">{pendingApprovals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="policies">
            <ShieldCheck className="mr-1.5 h-4 w-4" />
            Policies
          </TabsTrigger>
        </TabsList>

        {/* --- Agent Runner --- */}
        <TabsContent value="runner">
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
                  <Label>Agent</Label>
                  <Select value={selectedAgentId || undefined} onValueChange={handleAgentChange}>
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
                  {selectedAgent && (
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>{selectedAgent.description}</p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline">{selectedAgent.model}</Badge>
                        {selectedAgent.tools.map((tool) => (
                          <Badge key={tool} variant="secondary">{tool}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Ask an agent something useful"
                    disabled={isRunning}
                  />
                  <Button disabled={isRunning || !selectedAgentId} onClick={handleSubmit}>
                    {isRunning ? (
                      <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Running...</>
                    ) : (
                      <>
                        <Bot className="mr-1.5 h-4 w-4" />
                        Run agent
                      </>
                    )}
                  </Button>
                  {reply && (
                    <GlassCard>
                      <GlassCardContent className="text-sm whitespace-pre-wrap">
                        {reply}
                      </GlassCardContent>
                    </GlassCard>
                  )}
                  {!reply && !isRunning && (
                    <EmptyState
                      icon={<Bot className="h-8 w-8" />}
                      message="The agent response will appear here."
                      hint="Select an agent and send a prompt to get started."
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Approvals --- */}
        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                Mutating functions stay here until a human explicitly approves them.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingApprovals.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle className="h-8 w-8" />}
                  message="No pending approvals"
                  hint="All clear — mutating tool calls will appear here when they need your sign-off."
                />
              ) : (
                pendingApprovals.map((approval) => (
                  <GlassCard key={approval.id}>
                    <GlassCardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="font-medium">{approval.toolName}</div>
                          <p className="text-sm text-muted-foreground">{approval.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Agent: {approval.agentId}</span>
                            <span>·</span>
                            <time>{new Date(approval.createdAt).toLocaleString()}</time>
                          </div>
                        </div>
                        <StatusBadge status="pending">Pending</StatusBadge>
                      </div>
                    </GlassCardHeader>
                    <GlassCardContent className="space-y-3">
                      <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 text-xs whitespace-pre-wrap">
                        {formatParameters(approval.parameters)}
                      </pre>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleResolveApproval(approval.id, "allow")}
                          disabled={resolvingApprovalId !== null}
                        >
                          {resolvingApprovalId === approval.id ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolveApproval(approval.id, "deny")}
                          disabled={resolvingApprovalId !== null}
                        >
                          {resolvingApprovalId === approval.id ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <XCircle className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Deny
                        </Button>
                      </div>
                    </GlassCardContent>
                  </GlassCard>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Policies --- */}
        <TabsContent value="policies">
          <Card>
            <CardHeader>
              <CardTitle>Function Policies</CardTitle>
              <CardDescription>
                Create multi-condition auto-allow or auto-deny rules for mutating backend functions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {mutatingFunctions.map((functionDefinition) => {
                const functionPolicies = policies.filter(
                  (policy) => policy.toolName === functionDefinition.name
                )
                const newPolicyForm =
                  newPolicyForms[functionDefinition.name] ?? createDefaultPolicyForm(functionDefinition)

                return (
                  <div key={functionDefinition.name} className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{functionDefinition.name}</span>
                          <Badge variant="destructive">Mutating</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{functionDefinition.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Approval step: {functionDefinition.approvalDescription}
                        </p>
                      </div>
                    </div>

                    {functionPolicies.length === 0 ? (
                      <EmptyState
                        icon={<ShieldCheck className="h-6 w-6" />}
                        message="No policies yet"
                        hint="Add a policy below to auto-allow or auto-deny matching requests."
                        className="py-6"
                      />
                    ) : (
                      functionPolicies.map((policy) => {
                        const editForm = policyEditForms[policy.id] ?? toPolicyFormState(policy)
                        return (
                          <PolicyForm
                            key={policy.id}
                            form={editForm}
                            scope="existing"
                            formKey={policy.id}
                            functionDefinition={functionDefinition}
                            savingPolicyKey={savingPolicyKey}
                            savingKeyPrefix="edit"
                            submitLabel="Save"
                            submitLoadingLabel="Saving..."
                            onMetaChange={handlePolicyMetaChange}
                            onConditionChange={handleConditionChange}
                            onAddCondition={handleAddCondition}
                            onRemoveCondition={handleRemoveCondition}
                            onSubmit={() => handleUpdatePolicy(policy, functionDefinition)}
                            onDelete={() => handleDeletePolicy(policy.id)}
                          />
                        )
                      })
                    )}

                    <div className="space-y-2">
                      <div className="text-sm font-medium flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Add Policy
                      </div>
                      <PolicyForm
                        form={newPolicyForm}
                        scope="new"
                        formKey={functionDefinition.name}
                        functionDefinition={functionDefinition}
                        savingPolicyKey={savingPolicyKey}
                        savingKeyPrefix="new"
                        submitLabel="Add policy"
                        submitLoadingLabel="Creating..."
                        onMetaChange={handlePolicyMetaChange}
                        onConditionChange={handleConditionChange}
                        onAddCondition={handleAddCondition}
                        onRemoveCondition={handleRemoveCondition}
                        onSubmit={() => handleCreatePolicy(functionDefinition)}
                      />
                    </div>

                    <Separator />
                  </div>
                )
              })}

              {readOnlyFunctions.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">Read-only functions</div>
                  {readOnlyFunctions.map((functionDefinition) => (
                    <div key={functionDefinition.name} className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{functionDefinition.name}</span>
                          <Badge variant="secondary">Read only</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{functionDefinition.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
