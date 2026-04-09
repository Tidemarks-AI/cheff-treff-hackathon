import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import {
  listChangeRequests,
  approveChangeRequest,
  rejectChangeRequest,
  connectSSE,
  type ChangeRequest,
} from "@/lib/changes-api"
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
      {/* Graph canvas — offset to the right so it's visible past the floating panels */}
      <div className="absolute inset-0 left-[calc(50vw+120px)]">
        <OntologyPane change={activeChange} />
      </div>

      {/* Floating inbox */}
      <div className="pointer-events-auto absolute left-4 top-4 bottom-4 z-10 w-[220px] overflow-hidden rounded-2xl bg-background/60 shadow-lg backdrop-blur-2xl">
        <div className="px-3 pt-4 pb-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Inbox</h3>
        </div>
        <ChangeQueue changes={changes} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      {/* Floating detail panel — 50% of viewport width */}
      {activeChange ? (
        <div className="pointer-events-auto absolute left-[252px] top-4 bottom-4 z-10 w-[calc(50vw-140px)] overflow-hidden rounded-2xl bg-background/70 shadow-lg backdrop-blur-3xl">
          <ChangeDetail
            change={activeChange}
            onApprove={handleApprove}
            onReject={handleReject}
            isLoading={isLoading}
          />
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="rounded-2xl bg-background/60 px-6 py-4 text-center shadow-lg backdrop-blur-xl">
            <p className="text-sm text-muted-foreground">No change requests yet</p>
          </div>
        </div>
      )}
    </div>
  )
}
