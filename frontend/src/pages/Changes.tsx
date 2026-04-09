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
import { OntologyPane } from "@/components/changes/OntologyPane"

export default function Changes() {
  const [changes, setChanges] = useState<ChangeRequest[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const activeChange = changes[0] ?? null

  useEffect(() => {
    listChangeRequests()
      .then(setChanges)
      .catch((err) => console.warn("Failed to load changes:", err))

    const cleanup = connectSSE({
      onNew: (cr) => setChanges((prev) => [cr, ...prev]),
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
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100/80" />

      <div className="relative flex h-full">
        {/* Graph — takes remaining space */}
        <div className={`relative flex-1 ${activeChange ? "" : ""}`}>
          <OntologyPane change={activeChange} />

          {!activeChange && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div
                className="rounded-2xl border border-white/50 px-6 py-4 text-center shadow-lg"
                style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)" }}
              >
                <p className="text-sm text-gray-500">Waiting for change requests...</p>
                <p className="mt-1 text-xs text-gray-400">
                  Press <kbd className="rounded border border-gray-200/60 bg-white/60 px-1 py-0.5 font-mono text-[10px]">⌘⇧D</kbd> to seed demo
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Side panel — impact detail */}
        {activeChange && (
          <div className="relative z-10 w-[380px] shrink-0 border-l border-gray-200/50 overflow-hidden">
            <div
              className="h-full overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.7)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
              }}
            >
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
