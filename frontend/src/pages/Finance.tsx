import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Plus } from "lucide-react"

import {
  Card, CardContent, CardHeader, CardTitle,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge, Button, Input, Label,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@startupos/ui"

const API_URL = import.meta.env.VITE_API_URL || ""

type CostCenter = { id: string; name: string }
type Variance = {
  id: string
  category: string
  month: string
  planned_amount: number
  actual_amount: number
  variance_amount: number | null
  variance_pct: number | null
  status: string
  cost_center_name: string
}
type FixedExpense = {
  id: string
  name: string
  amount: number
  currency: string
  frequency: string
  start_date: string
  end_date: string | null
  source_system: string | null
  cost_center_name: string
}
type BudgetLine = {
  id: string
  category: string
  month: string
  planned_amount: number
  notes: string | null
}
type Actual = {
  id: string
  category: string
  month: string
  actual_amount: number
  source: string
  description: string | null
}

async function surrealQuery<T>(query: string, vars?: Record<string, unknown>): Promise<T[]> {
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token
  const res = await fetch(`${API_URL}/api/surreal/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, vars }),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const json = await res.json()
  // SurrealDB returns an array of results (one per statement)
  const results = json.data
  return Array.isArray(results) ? (results[0] ?? []) : []
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n)

const fmtMonth = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short" })

const statusBadge = (status: string) => {
  switch (status) {
    case "flagged":
      return <Badge variant="destructive">Flagged</Badge>
    case "explained":
      return <Badge variant="outline">Explained</Badge>
    case "accepted":
      return <Badge variant="outline">Accepted</Badge>
    default:
      return <Badge variant="secondary">OK</Badge>
  }
}

export default function Finance() {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [variances, setVariances] = useState<Variance[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([])
  const [actuals, setActuals] = useState<Actual[]>([])
  const [selectedCC, setSelectedCC] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadOverview() {
    const [ccs, vars, fes] = await Promise.all([
      surrealQuery<CostCenter>("SELECT id, name FROM cost_center ORDER BY name"),
      surrealQuery<Variance>(
        `SELECT id, category, month, planned_amount, actual_amount,
                (actual_amount - planned_amount) AS variance_amount,
                variance_pct, status,
                cost_center.name AS cost_center_name
         FROM variance ORDER BY month, category`
      ),
      surrealQuery<FixedExpense>(
        `SELECT id, name, amount, currency, frequency, start_date, end_date, source_system,
                cost_center.name AS cost_center_name
         FROM fixed_expense ORDER BY name`
      ),
    ])
    setCostCenters(ccs)
    setVariances(vars)
    setFixedExpenses(fes)
  }

  // Initial data fetch
  useEffect(() => {
    loadOverview()
      .catch((e) => toast.error("Failed to load finance data: " + e.message))
      .finally(() => setLoading(false))
  }, [])

  // Fetch detail when cost center changes
  useEffect(() => {
    if (!selectedCC) return
    async function loadDetail() {
      const [bls, acts] = await Promise.all([
        surrealQuery<BudgetLine>(
          `SELECT id, category, month, planned_amount, notes
           FROM budget_line WHERE cost_center = $cc ORDER BY month`,
          { cc: selectedCC }
        ),
        surrealQuery<Actual>(
          `SELECT id, category, month, actual_amount, source, description
           FROM costs WHERE cost_center = $cc ORDER BY month`,
          { cc: selectedCC }
        ),
      ])
      setBudgetLines(bls)
      setActuals(acts)
    }
    loadDetail()
  }, [selectedCC])

  async function handleAddActual(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const category = form.get("category") as string
    const month = form.get("month") as string
    const amount = parseFloat(form.get("amount") as string)
    const source = (form.get("source") as string) || "manual"
    const description = (form.get("description") as string) || null

    try {
      await surrealQuery(
        `CREATE costs SET
          cost_center = $cc,
          category = $category,
          month = <datetime>$month,
          actual_amount = <decimal>$amount,
          source = $source,
          description = $description`,
        { cc: selectedCC, category, month: month + "T00:00:00Z", amount, source, description }
      )

      // Recompute variance: sum actuals, compare with budget
      await surrealQuery(
        `LET $planned = (SELECT VALUE planned_amount FROM budget_line WHERE cost_center = $cc AND category = $category AND month = <datetime>$month LIMIT 1);
         LET $actual_sum = (SELECT VALUE math::sum(actual_amount) FROM costs WHERE cost_center = $cc AND category = $category AND month = <datetime>$month GROUP ALL);
         UPSERT variance SET
           cost_center = $cc,
           category = $category,
           month = <datetime>$month,
           planned_amount = $planned[0] ?? 0,
           actual_amount = $actual_sum[0] ?? 0,
           variance_pct = IF $planned[0] != NONE AND $planned[0] != 0
             THEN ($actual_sum[0] ?? 0 - $planned[0]) / $planned[0]
             ELSE NONE
           END,
           status = IF $planned[0] != NONE AND $planned[0] != 0
             AND math::abs(($actual_sum[0] ?? 0 - $planned[0]) / $planned[0]) > 0.10
             THEN "flagged"
             ELSE "ok"
           END
         WHERE cost_center = $cc AND category = $category AND month = <datetime>$month`,
        { cc: selectedCC, category, month: month + "T00:00:00Z" }
      )

      toast.success("Actual added")
      setDialogOpen(false)

      // Refresh data
      const [acts, vars] = await Promise.all([
        surrealQuery<Actual>(
          `SELECT id, category, month, actual_amount, source, description
           FROM costs WHERE cost_center = $cc ORDER BY month`,
          { cc: selectedCC }
        ),
        surrealQuery<Variance>(
          `SELECT id, category, month, planned_amount, actual_amount,
                  (actual_amount - planned_amount) AS variance_amount,
                  variance_pct, status,
                  cost_center.name AS cost_center_name
           FROM variance ORDER BY month, category`
        ),
      ])
      setActuals(acts)
      setVariances(vars)
    } catch (err) {
      toast.error("Failed to add actual: " + (err as Error).message)
    }
  }

  // KPI calculations
  const totalBudget = variances.reduce((s, v) => s + v.planned_amount, 0)
  const totalActual = variances.reduce((s, v) => s + v.actual_amount, 0)
  const netVariance = totalActual - totalBudget
  const flaggedCount = variances.filter((v) => v.status === "flagged").length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
        <p className="text-muted-foreground">
          Budget tracking and variance analysis
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtCurrency(totalBudget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtCurrency(totalActual)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${netVariance > 0 ? "text-red-600" : "text-green-600"}`}
            >
              {netVariance > 0 ? "+" : ""}
              {fmtCurrency(netVariance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Flagged Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{flaggedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fixed-costs">Fixed Expenses</TabsTrigger>
          <TabsTrigger value="detail">Detail</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Variance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cost Center</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Planned</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variances.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>{v.cost_center_name ?? "—"}</TableCell>
                      <TableCell>{v.category}</TableCell>
                      <TableCell>{fmtMonth(v.month)}</TableCell>
                      <TableCell className="text-right">
                        {fmtCurrency(v.planned_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtCurrency(v.actual_amount)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${(v.variance_amount ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}
                      >
                        {v.variance_amount != null
                          ? `${v.variance_amount > 0 ? "+" : ""}${fmtCurrency(v.variance_amount)}`
                          : "—"}
                      </TableCell>
                      <TableCell>{statusBadge(v.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fixed Expenses Tab */}
        <TabsContent value="fixed-costs">
          <Card>
            <CardHeader>
              <CardTitle>Recurring Fixed Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Cost Center</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fixedExpenses.map((fe) => (
                    <TableRow key={fe.id}>
                      <TableCell className="font-medium">{fe.name}</TableCell>
                      <TableCell>{fe.cost_center_name ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {fmtCurrency(fe.amount)}
                      </TableCell>
                      <TableCell className="capitalize">{fe.frequency}</TableCell>
                      <TableCell>{fmtMonth(fe.start_date)}</TableCell>
                      <TableCell>
                        {fe.end_date ? fmtMonth(fe.end_date) : "Ongoing"}
                      </TableCell>
                      <TableCell>{fe.source_system ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detail Tab */}
        <TabsContent value="detail">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Select
                value={selectedCC ?? undefined}
                onValueChange={(val) => setSelectedCC(val as string)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select cost center..." />
                </SelectTrigger>
                <SelectContent>
                  {costCenters.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedCC && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="mr-1 size-4" />
                  Add Actual
                </Button>
              )}
            </div>

            {selectedCC && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Budget Lines</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">Planned</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {budgetLines.map((bl) => (
                          <TableRow key={bl.id}>
                            <TableCell>{bl.category}</TableCell>
                            <TableCell>{fmtMonth(bl.month)}</TableCell>
                            <TableCell className="text-right">
                              {fmtCurrency(bl.planned_amount)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {bl.notes ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {budgetLines.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center text-muted-foreground"
                            >
                              No budget lines
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Actuals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {actuals.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell>{a.category}</TableCell>
                            <TableCell>{fmtMonth(a.month)}</TableCell>
                            <TableCell className="text-right">
                              {fmtCurrency(a.actual_amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{a.source}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {a.description ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {actuals.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center text-muted-foreground"
                            >
                              No actuals recorded
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}

            {!selectedCC && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Select a cost center to view details
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Actual Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Actual Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddActual} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                name="category"
                placeholder="e.g. Salaries, Cloud Infra, Ads"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="month">Month (1st of month)</Label>
              <Input
                id="month"
                name="month"
                placeholder="2026-01-01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (EUR)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                name="source"
                placeholder="manual"
                defaultValue="manual"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="Optional description"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
