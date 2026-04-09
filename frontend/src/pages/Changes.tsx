import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import {
  listChangeRequests,
  approveChangeRequest,
  rejectChangeRequest,
  seedFixture,
  connectSSE,
  type ChangeRequest,
} from "@/lib/changes-api"
import { createLocalFixture } from "@/lib/change-fixtures"
import { ChangeDetail } from "@/components/changes/ChangeDetail"
import { ChangeQueue } from "@/components/changes/ChangeQueue"
import { OntologyPane } from "@/components/changes/OntologyPane"

export default function Changes() {
  const [changes, setChanges] = useState<ChangeRequest[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const activeChange = changes.find((c) => c.id === selectedId) ?? null

  // Auto-select first change when list changes and nothing is selected
  useEffect(() => {
    if (!selectedId && changes.length > 0) {
      setSelectedId(changes[0].id)
    }
  }, [changes, selectedId])

  useEffect(() => {
    listChangeRequests()
      .then(setChanges)
      .catch((err) => console.warn("Failed to load changes:", err))

    const cleanup = connectSSE({
      onNew: (cr) => {
        setChanges((prev) => [cr, ...prev])
        setSelectedId(cr.id)
      },
      onUpdated: (cr) =>
        setChanges((prev) => prev.map((c) => (c.id === cr.id ? cr : c))),
    })
    return cleanup
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey && e.shiftKey && e.key === "d") {
        e.preventDefault()
        seedFixture()
          .then((cr) => toast.success("Change request received"))
          .catch(() => {
            const local = createLocalFixture()
            setChanges((prev) => [local, ...prev])
            toast.success("Change request received")
          })
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleApprove = useCallback(async () => {
    if (!activeChange) return
    setIsLoading(true)
    setChanges((prev) =>
      prev.map((c) =>
        c.id === activeChange.id ? { ...c, status: "approved" as const } : c
      )
    )
    try {
      if (!String(activeChange.id).startsWith("local_")) {
        await approveChangeRequest(activeChange.id)
      }
      toast.success("Change applied. Audit log updated.")
    } catch {
      setChanges((prev) =>
        prev.map((c) =>
          c.id === activeChange.id ? { ...c, status: "pending" as const } : c
        )
      )
      toast.error("Failed to approve")
    } finally {
      setIsLoading(false)
    }
  }, [activeChange])

  const handleReject = useCallback(async () => {
    if (!activeChange) return
    setIsLoading(true)
    setChanges((prev) =>
      prev.map((c) =>
        c.id === activeChange.id ? { ...c, status: "rejected" as const } : c
      )
    )
    try {
      if (!String(activeChange.id).startsWith("local_")) {
        await rejectChangeRequest(activeChange.id)
      }
      toast.success("Change request rejected.")
    } catch {
      setChanges((prev) =>
        prev.map((c) =>
          c.id === activeChange.id ? { ...c, status: "pending" as const } : c
        )
      )
      toast.error("Failed to reject")
    } finally {
      setIsLoading(false)
    }
  }, [activeChange])

  return (
    <div className="relative h-[calc(100vh-4rem)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-muted via-background to-muted/80" />

      <div className="relative flex h-full">
        {/* Queue sidebar */}
        <div className="relative z-10 w-[220px] shrink-0 border-r border-border/50 overflow-hidden bg-background/50 backdrop-blur-2xl">
          <div className="px-3 pt-4 pb-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Inbox</h3>
          </div>
          <ChangeQueue changes={changes} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        {/* Graph — takes remaining space */}
        <div className="relative flex-1">
          <OntologyPane change={activeChange} />

          {!activeChange && changes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="rounded-2xl border border-border/50 bg-background/60 px-6 py-4 text-center shadow-lg backdrop-blur-xl">
                <p className="text-sm text-muted-foreground">Waiting for change requests...</p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Press <kbd className="rounded border border-border/60 bg-background/60 px-1 py-0.5 font-mono text-[10px]">⌘⇧D</kbd> to seed demo
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Side panel — impact detail */}
        {activeChange && (
          <div className="relative z-10 w-[380px] shrink-0 border-l border-border/50 overflow-hidden">
            <div className="h-full overflow-hidden bg-background/70 backdrop-blur-3xl">
              <ChangeDetail
                change={activeChange}
                onApprove={handleApprove}
                onReject={handleReject}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
